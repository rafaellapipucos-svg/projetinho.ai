import { describe, expect, it } from "vitest";
import {
  activityFactors,
  computeGet,
  computeTmb,
} from "@/domain/energy/methods";
import { DomainError } from "@/domain/shared/errors";

/**
 * Golden tests: valores esperados calculados a partir dos coeficientes
 * publicados na literatura de cada fórmula.
 */
describe("computeTmb", () => {
  const maleRef = { sex: "male", ageYears: 30, weightKg: 70, heightCm: 175 };
  const femaleRef = {
    sex: "female",
    ageYears: 25,
    weightKg: 60,
    heightCm: 165,
  };

  it("Mifflin-St Jeor — homem 70 kg, 175 cm, 30 anos = 1648,75 kcal", () => {
    expect(computeTmb("mifflin_1990", maleRef)).toBeCloseTo(1648.75, 2);
  });

  it("Mifflin-St Jeor — mulher 60 kg, 165 cm, 25 anos = 1345,25 kcal", () => {
    expect(computeTmb("mifflin_1990", femaleRef)).toBeCloseTo(1345.25, 2);
  });

  it("Harris-Benedict 1984 — homem de referência = 1695,667 kcal", () => {
    // 88,362 + 13,397×70 + 4,799×175 − 5,677×30
    expect(computeTmb("harris_benedict_1984", maleRef)).toBeCloseTo(
      1695.667,
      2,
    );
  });

  it("FAO/OMS — homem 25 anos, 70 kg (faixa 18–30) = 15,3×70+679 = 1750", () => {
    expect(
      computeTmb("fao_who_1985", { sex: "male", ageYears: 25, weightKg: 70 }),
    ).toBeCloseTo(1750, 2);
  });

  it("FAO/OMS — fronteira de faixa: 30 anos cai na faixa 30–60 (11,6×70+879)", () => {
    expect(
      computeTmb("fao_who_1985", { sex: "male", ageYears: 30, weightKg: 70 }),
    ).toBeCloseTo(1691, 2);
  });

  it("Katch-McArdle — massa magra 55 kg = 370 + 21,6×55 = 1558", () => {
    expect(computeTmb("katch_mcardle", { leanMassKg: 55 })).toBeCloseTo(
      1558,
      2,
    );
  });

  it("Cunningham — massa magra 55 kg = 500 + 22×55 = 1710", () => {
    expect(computeTmb("cunningham_1980", { leanMassKg: 55 })).toBeCloseTo(
      1710,
      2,
    );
  });

  it("Tinsley (peso total) — 80 kg = 24,8×80 + 10 = 1994", () => {
    expect(computeTmb("tinsley_2019", { weightKg: 80 })).toBeCloseTo(1994, 2);
  });

  it("coeficientes vindos do banco (params) sobrepõem os defaults", () => {
    const custom = { male: { s: 10 }, female: { s: -161 } };
    expect(computeTmb("mifflin_1990", maleRef, custom)).toBeCloseTo(1653.75, 2);
  });

  it("método desconhecido e entradas inválidas falham com erro claro", () => {
    expect(() => computeTmb("inexistente", maleRef)).toThrow(DomainError);
    expect(() =>
      computeTmb("mifflin_1990", { ...maleRef, weightKg: -1 }),
    ).toThrow();
  });
});

describe("computeGet", () => {
  it("GET = TMB × fator (moderado 1,55)", () => {
    expect(computeGet(1648.75, 1.55)).toBeCloseTo(2555.5625, 4);
  });

  it("fator implausível é rejeitado", () => {
    expect(() => computeGet(1600, 0.5)).toThrow(DomainError);
  });

  it("catálogo de fatores cobre 1,2 a 1,9", () => {
    const factors = activityFactors.map((f) => f.factor);
    expect(Math.min(...factors)).toBe(1.2);
    expect(Math.max(...factors)).toBe(1.9);
    expect(activityFactors).toHaveLength(5);
  });
});
