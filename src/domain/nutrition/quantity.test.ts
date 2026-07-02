import { describe, expect, it } from "vitest";
import { resolveGrams } from "@/domain/nutrition/quantity";
import { DomainError } from "@/domain/shared/errors";

describe("resolveGrams", () => {
  it("medida caseira: 2 colheres de sopa de 12 g = 24 g", () => {
    expect(resolveGrams(2, { measureGramWeight: 12 })).toBe(24);
  });

  it("unidade de massa: 1,5 kg = 1500 g", () => {
    expect(
      resolveGrams(1.5, { unit: { type: "mass", gramsPerUnit: 1000 } }),
    ).toBe(1500);
  });

  it("unidade de volume na base do alimento: 200 ml = 200", () => {
    expect(
      resolveGrams(200, { unit: { type: "volume", gramsPerUnit: 1 } }),
    ).toBe(200);
  });

  it("medida caseira tem precedência sobre a unidade", () => {
    expect(
      resolveGrams(3, {
        measureGramWeight: 25,
        unit: { type: "mass", gramsPerUnit: 1 },
      }),
    ).toBe(75);
  });

  it("unidade sem fator (porção) exige medida caseira", () => {
    expect(() =>
      resolveGrams(1, { unit: { type: "unit", gramsPerUnit: null } }),
    ).toThrow(DomainError);
  });

  it("rejeita quantidade negativa e ausência de fonte", () => {
    expect(() => resolveGrams(-1, { measureGramWeight: 10 })).toThrow(
      DomainError,
    );
    expect(() => resolveGrams(1, {})).toThrow(DomainError);
  });
});
