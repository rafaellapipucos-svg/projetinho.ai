import { describe, expect, it } from "vitest";
import {
  compareDayToTargets,
  dayTotals,
  mealTotals,
  optionTotals,
  targetStatus,
} from "@/domain/nutrition/plan";

const arroz = { energy_kcal: 128, protein_g: 2.5 }; // cozido, por 100 g
const frango = { energy_kcal: 159, protein_g: 32 };
const tapioca = { energy_kcal: 240, protein_g: 0 };

describe("optionTotals", () => {
  it("soma os itens escalados", () => {
    const totals = optionTotals({
      id: "o1",
      items: [
        { per100: arroz, resolvedGrams: 150 },
        { per100: frango, resolvedGrams: 100 },
      ],
    });
    expect(totals.energy_kcal).toBeCloseTo(128 * 1.5 + 159, 6);
    expect(totals.protein_g).toBeCloseTo(2.5 * 1.5 + 32, 6);
  });
});

describe("mealTotals — regra da opção principal", () => {
  it("usa apenas a primeira opção; substituições não somam", () => {
    const meal = {
      id: "m1",
      options: [
        { id: "o1", items: [{ per100: arroz, resolvedGrams: 100 }] },
        { id: "o2", items: [{ per100: tapioca, resolvedGrams: 100 }] },
      ],
    };
    expect(mealTotals(meal).energy_kcal).toBeCloseTo(128, 6);
  });

  it("refeição sem opções tem total vazio", () => {
    expect(mealTotals({ id: "m", options: [] })).toEqual({});
  });
});

describe("dayTotals", () => {
  it("agrega as opções principais de todas as refeições", () => {
    const day = {
      id: "d1",
      meals: [
        {
          id: "m1",
          options: [
            { id: "o1", items: [{ per100: arroz, resolvedGrams: 200 }] },
          ],
        },
        {
          id: "m2",
          options: [
            { id: "o2", items: [{ per100: frango, resolvedGrams: 150 }] },
            { id: "o3", items: [{ per100: tapioca, resolvedGrams: 500 }] },
          ],
        },
      ],
    };
    expect(dayTotals(day).energy_kcal).toBeCloseTo(128 * 2 + 159 * 1.5, 6);
  });
});

describe("targetStatus — limites inclusivos", () => {
  it.each([
    [1799.9, "below"],
    [1800, "within"],
    [2000, "within"],
    [2200, "within"],
    [2200.1, "above"],
  ] as const)("kcal %s → %s (meta 1800–2200)", (value, expected) => {
    expect(targetStatus(value, { min: 1800, max: 2200 })).toBe(expected);
  });

  it("só mínimo / só máximo / sem meta", () => {
    expect(targetStatus(50, { min: 25, max: null })).toBe("within");
    expect(targetStatus(10, { min: 25, max: null })).toBe("below");
    expect(targetStatus(10, { min: null, max: 5 })).toBe("above");
    expect(targetStatus(10, { min: null, max: null })).toBe("no_target");
  });
});

describe("compareDayToTargets", () => {
  it("nutriente ausente no dia conta como zero", () => {
    const result = compareDayToTargets({ energy_kcal: 1900 }, [
      { nutrientKey: "energy_kcal", min: 1800, max: 2200 },
      { nutrientKey: "fiber_g", min: 25, max: null },
    ]);
    expect(result[0]?.status).toBe("within");
    expect(result[1]?.status).toBe("below");
    expect(result[1]?.value).toBe(0);
  });
});
