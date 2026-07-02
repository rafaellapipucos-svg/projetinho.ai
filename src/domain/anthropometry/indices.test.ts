import { describe, expect, it } from "vitest";
import {
  bmi,
  bmiClassification,
  idealWeightRange,
  waistHipRatio,
} from "@/domain/anthropometry/indices";

describe("bmi", () => {
  it("70 kg / 1,75 m → 22,86 kg/m²", () => {
    expect(bmi(70, 175)).toBeCloseTo(22.857, 2);
  });
});

describe("bmiClassification (OMS)", () => {
  it.each([
    [18.4, "underweight"],
    [18.5, "normal"],
    [24.99, "normal"],
    [25, "overweight"],
    [30, "obesity_1"],
    [35, "obesity_2"],
    [40, "obesity_3"],
  ] as const)("IMC %s → %s", (value, expected) => {
    expect(bmiClassification(value)).toBe(expected);
  });
});

describe("waistHipRatio", () => {
  it("cintura 70 / quadril 100 = 0,7", () => {
    expect(waistHipRatio(70, 100)).toBeCloseTo(0.7, 6);
  });
});

describe("idealWeightRange", () => {
  it("1,75 m → 56,66 a 76,26 kg", () => {
    const range = idealWeightRange(175);
    expect(range.minKg).toBeCloseTo(56.656, 2);
    expect(range.maxKg).toBeCloseTo(76.256, 2);
  });
});
