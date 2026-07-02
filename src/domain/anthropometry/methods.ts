import { z } from "zod";
import { DomainError } from "@/domain/shared/errors";
import type { Sex } from "@/domain/shared/types";

/**
 * Protocolos de composição corporal por dobras cutâneas — Strategy por `key`
 * do catálogo `calculation_methods` (kind `body_composition`). As dobras são
 * referenciadas pelas `key`s do catálogo `measurement_types` (sf_*), em mm.
 */

const skinfoldInputs = z.object({
  sex: z.enum(["male", "female"]),
  ageYears: z.number().min(10).max(120),
  skinfoldsMm: z.record(z.string(), z.number().positive().max(80)),
});

export type SkinfoldInputs = z.infer<typeof skinfoldInputs>;

const quadratic = z.object({
  c0: z.number(),
  c1: z.number(),
  c2: z.number(),
  cAge: z.number(),
});

const dwBand = z.object({
  minAge: z.number(),
  maxAgeExclusive: z.number(),
  c: z.number(),
  m: z.number(),
});

export interface BodyCompositionMethod {
  name: string;
  /** Dobras exigidas por sexo (keys de measurement_types). */
  requiredFolds: Record<Sex, string[]>;
  paramsSchema: z.ZodTypeAny;
  defaultParams: unknown;
  computeDensity: (inputs: SkinfoldInputs, params: unknown) => number;
}

function sumFolds(inputs: SkinfoldInputs, keys: string[]): number {
  let sum = 0;
  for (const key of keys) {
    const value = inputs.skinfoldsMm[key];
    if (value === undefined) {
      throw new DomainError(`Dobra cutânea obrigatória ausente: ${key}`);
    }
    sum += value;
  }
  return sum;
}

function quadraticDensity(
  sum: number,
  age: number,
  c: z.infer<typeof quadratic>,
): number {
  return c.c0 - c.c1 * sum + c.c2 * sum * sum - c.cAge * age;
}

export const bodyCompositionMethods: Record<string, BodyCompositionMethod> = {
  jackson_pollock_3: {
    name: "Jackson & Pollock — 3 dobras",
    requiredFolds: {
      male: ["sf_chest", "sf_abdominal", "sf_thigh"],
      female: ["sf_triceps", "sf_suprailiac", "sf_thigh"],
    },
    paramsSchema: z.object({ male: quadratic, female: quadratic }),
    defaultParams: {
      male: { c0: 1.10938, c1: 0.0008267, c2: 0.0000016, cAge: 0.0002574 },
      female: { c0: 1.0994921, c1: 0.0009929, c2: 0.0000023, cAge: 0.0001392 },
    },
    computeDensity: (inputs, params) => {
      const p = z.object({ male: quadratic, female: quadratic }).parse(params);
      const folds =
        bodyCompositionMethods.jackson_pollock_3?.requiredFolds[inputs.sex] ??
        [];
      const sum = sumFolds(inputs, folds);
      return quadraticDensity(sum, inputs.ageYears, p[inputs.sex]);
    },
  },

  jackson_pollock_7: {
    name: "Jackson & Pollock — 7 dobras",
    requiredFolds: {
      male: [
        "sf_chest",
        "sf_midaxillary",
        "sf_triceps",
        "sf_subscapular",
        "sf_abdominal",
        "sf_suprailiac",
        "sf_thigh",
      ],
      female: [
        "sf_chest",
        "sf_midaxillary",
        "sf_triceps",
        "sf_subscapular",
        "sf_abdominal",
        "sf_suprailiac",
        "sf_thigh",
      ],
    },
    paramsSchema: z.object({ male: quadratic, female: quadratic }),
    defaultParams: {
      male: { c0: 1.112, c1: 0.00043499, c2: 0.00000055, cAge: 0.00028826 },
      female: { c0: 1.097, c1: 0.00046971, c2: 0.00000056, cAge: 0.00012828 },
    },
    computeDensity: (inputs, params) => {
      const p = z.object({ male: quadratic, female: quadratic }).parse(params);
      const folds =
        bodyCompositionMethods.jackson_pollock_7?.requiredFolds[inputs.sex] ??
        [];
      const sum = sumFolds(inputs, folds);
      return quadraticDensity(sum, inputs.ageYears, p[inputs.sex]);
    },
  },

  durnin_womersley_1974: {
    name: "Durnin & Womersley (1974) — 4 dobras",
    requiredFolds: {
      male: ["sf_biceps", "sf_triceps", "sf_subscapular", "sf_suprailiac"],
      female: ["sf_biceps", "sf_triceps", "sf_subscapular", "sf_suprailiac"],
    },
    paramsSchema: z.object({ male: z.array(dwBand), female: z.array(dwBand) }),
    defaultParams: {
      male: [
        { minAge: 17, maxAgeExclusive: 20, c: 1.162, m: 0.063 },
        { minAge: 20, maxAgeExclusive: 30, c: 1.1631, m: 0.0632 },
        { minAge: 30, maxAgeExclusive: 40, c: 1.1422, m: 0.0544 },
        { minAge: 40, maxAgeExclusive: 50, c: 1.162, m: 0.07 },
        { minAge: 50, maxAgeExclusive: 121, c: 1.1715, m: 0.0779 },
      ],
      female: [
        { minAge: 17, maxAgeExclusive: 20, c: 1.1549, m: 0.0678 },
        { minAge: 20, maxAgeExclusive: 30, c: 1.1599, m: 0.0717 },
        { minAge: 30, maxAgeExclusive: 40, c: 1.1423, m: 0.0632 },
        { minAge: 40, maxAgeExclusive: 50, c: 1.1333, m: 0.0612 },
        { minAge: 50, maxAgeExclusive: 121, c: 1.1339, m: 0.0645 },
      ],
    },
    computeDensity: (inputs, params) => {
      const p = z
        .object({ male: z.array(dwBand), female: z.array(dwBand) })
        .parse(params);
      const folds =
        bodyCompositionMethods.durnin_womersley_1974?.requiredFolds[
          inputs.sex
        ] ?? [];
      const sum = sumFolds(inputs, folds);
      const band = p[inputs.sex].find(
        (b) =>
          inputs.ageYears >= b.minAge && inputs.ageYears < b.maxAgeExclusive,
      );
      if (!band) {
        throw new DomainError("Idade fora das faixas de Durnin & Womersley");
      }
      return band.c - band.m * Math.log10(sum);
    },
  },
};

/** Conversões densidade corporal → % de gordura. */
export const densityConversions = {
  siri: (density: number) => (4.95 / density - 4.5) * 100,
  brozek: (density: number) => (4.57 / density - 4.142) * 100,
} as const;

export type DensityConversion = keyof typeof densityConversions;

export interface BodyFatResult {
  density: number;
  bodyFatPct: number;
}

/** Calcula densidade e %G pelo protocolo indicado. */
export function computeBodyFat(
  methodKey: string,
  rawInputs: unknown,
  conversion: DensityConversion = "siri",
  params?: unknown,
): BodyFatResult {
  const method = bodyCompositionMethods[methodKey];
  if (!method) {
    throw new DomainError(
      `Protocolo de composição corporal desconhecido: ${methodKey}`,
    );
  }
  const inputs = skinfoldInputs.parse(rawInputs);
  const density = method.computeDensity(inputs, params ?? method.defaultParams);
  const bodyFatPct = densityConversions[conversion](density);
  return { density, bodyFatPct };
}

export function fatMassKg(weightKg: number, bodyFatPct: number): number {
  return (weightKg * bodyFatPct) / 100;
}

export function leanMassKg(weightKg: number, bodyFatPct: number): number {
  return weightKg - fatMassKg(weightKg, bodyFatPct);
}
