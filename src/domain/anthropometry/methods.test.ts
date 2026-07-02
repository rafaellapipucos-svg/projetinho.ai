import { describe, expect, it } from "vitest";
import {
  computeBodyFat,
  densityConversions,
  fatMassKg,
  leanMassKg,
} from "@/domain/anthropometry/methods";
import { DomainError } from "@/domain/shared/errors";

/**
 * Golden tests: densidades esperadas calculadas a partir dos coeficientes
 * publicados (Jackson & Pollock 1978/1980; Durnin & Womersley 1974;
 * conversões de Siri e Brozek).
 */
describe("computeBodyFat — Jackson & Pollock 3 dobras", () => {
  it("homem 30 anos, Σ45 mm (10+20+15) → D=1,0676965; Siri ≈ 13,61%", () => {
    const result = computeBodyFat("jackson_pollock_3", {
      sex: "male",
      ageYears: 30,
      skinfoldsMm: { sf_chest: 10, sf_abdominal: 20, sf_thigh: 15 },
    });
    expect(result.density).toBeCloseTo(1.0676965, 5);
    expect(result.bodyFatPct).toBeCloseTo(13.61, 1);
  });

  it("mulher 28 anos, Σ60 mm (20+18+22) → densidade pela equação de 1980", () => {
    const sum = 60;
    const expectedDensity =
      1.0994921 - 0.0009929 * sum + 0.0000023 * sum * sum - 0.0001392 * 28;
    const result = computeBodyFat("jackson_pollock_3", {
      sex: "female",
      ageYears: 28,
      skinfoldsMm: { sf_triceps: 20, sf_suprailiac: 18, sf_thigh: 22 },
    });
    expect(result.density).toBeCloseTo(expectedDensity, 6);
  });

  it("dobra obrigatória ausente falha nomeando a dobra", () => {
    expect(() =>
      computeBodyFat("jackson_pollock_3", {
        sex: "male",
        ageYears: 30,
        skinfoldsMm: { sf_chest: 10, sf_abdominal: 20 },
      }),
    ).toThrow(/sf_thigh/);
  });
});

describe("computeBodyFat — Jackson & Pollock 7 dobras", () => {
  it("homem 30 anos, Σ105 mm (7×15) → densidade pela equação de 1978", () => {
    const sum = 105;
    const expectedDensity =
      1.112 - 0.00043499 * sum + 0.00000055 * sum * sum - 0.00028826 * 30;
    const folds = {
      sf_chest: 15,
      sf_midaxillary: 15,
      sf_triceps: 15,
      sf_subscapular: 15,
      sf_abdominal: 15,
      sf_suprailiac: 15,
      sf_thigh: 15,
    };
    const result = computeBodyFat("jackson_pollock_7", {
      sex: "male",
      ageYears: 30,
      skinfoldsMm: folds,
    });
    expect(result.density).toBeCloseTo(expectedDensity, 6);
  });
});

describe("computeBodyFat — Durnin & Womersley", () => {
  it("mulher 25 anos, Σ42 mm → D = 1,1599 − 0,0717·log10(42); Siri ≈ 24,4%", () => {
    const result = computeBodyFat("durnin_womersley_1974", {
      sex: "female",
      ageYears: 25,
      skinfoldsMm: {
        sf_biceps: 5,
        sf_triceps: 12,
        sf_subscapular: 10,
        sf_suprailiac: 15,
      },
    });
    const expectedDensity = 1.1599 - 0.0717 * Math.log10(42);
    expect(result.density).toBeCloseTo(expectedDensity, 6);
    expect(result.bodyFatPct).toBeCloseTo(24.4, 1);
  });

  it("idade fora das faixas falha com erro de domínio", () => {
    expect(() =>
      computeBodyFat("durnin_womersley_1974", {
        sex: "male",
        ageYears: 15,
        skinfoldsMm: {
          sf_biceps: 5,
          sf_triceps: 10,
          sf_subscapular: 10,
          sf_suprailiac: 10,
        },
      }),
    ).toThrow(DomainError);
  });
});

describe("conversões e massas", () => {
  it("Siri e Brozek divergem levemente para a mesma densidade", () => {
    const density = 1.05;
    expect(densityConversions.siri(density)).toBeCloseTo(21.43, 1);
    expect(densityConversions.brozek(density)).toBeCloseTo(21.01, 1);
  });

  it("massa gorda e magra fecham com o peso total", () => {
    expect(fatMassKg(80, 20)).toBeCloseTo(16, 6);
    expect(leanMassKg(80, 20)).toBeCloseTo(64, 6);
  });
});
