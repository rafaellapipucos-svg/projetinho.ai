import { z } from "zod";
import { DomainError } from "@/domain/shared/errors";

/**
 * Fórmulas de gasto energético (TMB) como Strategy registrada por `key`
 * do catálogo `calculation_methods` (§6). A FORMA da fórmula vive aqui
 * (testável); os COEFICIENTES vivem em `defaultParams` e são copiados
 * para o banco pelo seed — o banco diz o que existe, o código calcula.
 * Todos os resultados em kcal/dia.
 */

const sexSchema = z.enum(["male", "female"]);

const ageWeight = z.object({
  sex: sexSchema,
  ageYears: z.number().min(10).max(120),
  weightKg: z.number().positive().max(400),
});

const ageWeightHeight = ageWeight.extend({
  heightCm: z.number().positive().max(250),
});

const leanMassOnly = z.object({
  leanMassKg: z.number().positive().max(200),
});

const weightOnly = z.object({
  weightKg: z.number().positive().max(400),
});

const sexCoefficients = z.object({
  base: z.number(),
  w: z.number(),
  h: z.number(),
  a: z.number(),
});

const linearCoefficients = z.object({ base: z.number(), m: z.number() });

const faoBand = z.object({
  minAge: z.number(),
  maxAgeExclusive: z.number(),
  w: z.number(),
  base: z.number(),
});

export interface EnergyMethod {
  name: string;
  inputs: z.ZodTypeAny;
  paramsSchema: z.ZodTypeAny;
  defaultParams: unknown;
  compute: (inputs: unknown, params: unknown) => number;
}

export const energyMethods: Record<string, EnergyMethod> = {
  harris_benedict_1984: {
    name: "Harris-Benedict (rev. Roza & Shizgal, 1984)",
    inputs: ageWeightHeight,
    paramsSchema: z.object({ male: sexCoefficients, female: sexCoefficients }),
    defaultParams: {
      male: { base: 88.362, w: 13.397, h: 4.799, a: 5.677 },
      female: { base: 447.593, w: 9.247, h: 3.098, a: 4.33 },
    },
    compute: (inputs, params) => {
      const i = ageWeightHeight.parse(inputs);
      const p = z
        .object({ male: sexCoefficients, female: sexCoefficients })
        .parse(params);
      const c = p[i.sex];
      return c.base + c.w * i.weightKg + c.h * i.heightCm - c.a * i.ageYears;
    },
  },

  mifflin_1990: {
    name: "Mifflin-St Jeor (1990)",
    inputs: ageWeightHeight,
    paramsSchema: z.object({
      male: z.object({ s: z.number() }),
      female: z.object({ s: z.number() }),
    }),
    defaultParams: { male: { s: 5 }, female: { s: -161 } },
    compute: (inputs, params) => {
      const i = ageWeightHeight.parse(inputs);
      const p = z
        .object({
          male: z.object({ s: z.number() }),
          female: z.object({ s: z.number() }),
        })
        .parse(params);
      return 10 * i.weightKg + 6.25 * i.heightCm - 5 * i.ageYears + p[i.sex].s;
    },
  },

  fao_who_1985: {
    name: "FAO/OMS (1985)",
    inputs: ageWeight,
    paramsSchema: z.object({
      male: z.array(faoBand),
      female: z.array(faoBand),
    }),
    defaultParams: {
      male: [
        { minAge: 10, maxAgeExclusive: 18, w: 17.5, base: 651 },
        { minAge: 18, maxAgeExclusive: 30, w: 15.3, base: 679 },
        { minAge: 30, maxAgeExclusive: 60, w: 11.6, base: 879 },
        { minAge: 60, maxAgeExclusive: 121, w: 13.5, base: 487 },
      ],
      female: [
        { minAge: 10, maxAgeExclusive: 18, w: 12.2, base: 746 },
        { minAge: 18, maxAgeExclusive: 30, w: 14.7, base: 496 },
        { minAge: 30, maxAgeExclusive: 60, w: 8.7, base: 829 },
        { minAge: 60, maxAgeExclusive: 121, w: 10.5, base: 596 },
      ],
    },
    compute: (inputs, params) => {
      const i = ageWeight.parse(inputs);
      const p = z
        .object({ male: z.array(faoBand), female: z.array(faoBand) })
        .parse(params);
      const band = p[i.sex].find(
        (b) => i.ageYears >= b.minAge && i.ageYears < b.maxAgeExclusive,
      );
      if (!band) {
        throw new DomainError("Idade fora das faixas da fórmula FAO/OMS");
      }
      return band.w * i.weightKg + band.base;
    },
  },

  katch_mcardle: {
    name: "Katch-McArdle",
    inputs: leanMassOnly,
    paramsSchema: linearCoefficients,
    defaultParams: { base: 370, m: 21.6 },
    compute: (inputs, params) => {
      const i = leanMassOnly.parse(inputs);
      const p = linearCoefficients.parse(params);
      return p.base + p.m * i.leanMassKg;
    },
  },

  cunningham_1980: {
    name: "Cunningham (1980)",
    inputs: leanMassOnly,
    paramsSchema: linearCoefficients,
    defaultParams: { base: 500, m: 22 },
    compute: (inputs, params) => {
      const i = leanMassOnly.parse(inputs);
      const p = linearCoefficients.parse(params);
      return p.base + p.m * i.leanMassKg;
    },
  },

  tinsley_2019: {
    name: "Tinsley (2019, peso total)",
    inputs: weightOnly,
    paramsSchema: linearCoefficients,
    defaultParams: { base: 10, m: 24.8 },
    compute: (inputs, params) => {
      const i = weightOnly.parse(inputs);
      const p = linearCoefficients.parse(params);
      return p.base + p.m * i.weightKg;
    },
  },
};

/** Fatores de atividade (catálogo `calculation_methods`, kind `activity_factor`). */
export const activityFactors = [
  { key: "af_sedentary", name: "Sedentário", factor: 1.2 },
  { key: "af_light", name: "Levemente ativo", factor: 1.375 },
  { key: "af_moderate", name: "Moderadamente ativo", factor: 1.55 },
  { key: "af_intense", name: "Muito ativo", factor: 1.725 },
  { key: "af_athlete", name: "Extremamente ativo", factor: 1.9 },
] as const;

/** Calcula a TMB pelo método indicado, validando entradas e coeficientes. */
export function computeTmb(
  methodKey: string,
  inputs: unknown,
  params?: unknown,
): number {
  const method = energyMethods[methodKey];
  if (!method) {
    throw new DomainError(
      `Método de gasto energético desconhecido: ${methodKey}`,
    );
  }
  return method.compute(inputs, params ?? method.defaultParams);
}

/** Gasto energético total = TMB × fator de atividade. */
export function computeGet(tmbKcal: number, activityFactor: number): number {
  if (activityFactor < 1 || activityFactor > 2.5) {
    throw new DomainError(
      "Fator de atividade fora da faixa plausível (1,0–2,5)",
    );
  }
  return tmbKcal * activityFactor;
}
