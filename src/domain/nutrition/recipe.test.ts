import { describe, expect, it } from "vitest";
import { recipeNutrition } from "@/domain/nutrition/recipe";
import { DomainError } from "@/domain/shared/errors";

const arrozCru = { energy_kcal: 360, protein_g: 7.3 };
const frango = { energy_kcal: 159, protein_g: 32 };

describe("recipeNutrition", () => {
  it("agrega ingredientes e calcula por porção", () => {
    const result = recipeNutrition(
      [
        { per100: arrozCru, resolvedGrams: 200 },
        { per100: frango, resolvedGrams: 300 },
      ],
      { servings: 4 },
    );
    // 200 g arroz: 720 kcal / 14,6 g PTN · 300 g frango: 477 kcal / 96 g PTN
    expect(result.totalGrams).toBe(500);
    expect(result.total.energy_kcal).toBeCloseTo(1197, 6);
    expect(result.total.protein_g).toBeCloseTo(110.6, 6);
    expect(result.perServing.energy_kcal).toBeCloseTo(299.25, 6);
    expect(result.per100.energy_kcal).toBeCloseTo(239.4, 6);
  });

  it("rendimento pós-preparo muda o por-100g, não o total", () => {
    const semYield = recipeNutrition(
      [{ per100: arrozCru, resolvedGrams: 100 }],
      {
        servings: 1,
      },
    );
    // Arroz cozido absorve água: 100 g cru → 250 g cozido
    const comYield = recipeNutrition(
      [{ per100: arrozCru, resolvedGrams: 100 }],
      {
        servings: 1,
        yieldGrams: 250,
      },
    );
    expect(comYield.total.energy_kcal).toBeCloseTo(
      semYield.total.energy_kcal ?? 0,
      6,
    );
    expect(comYield.per100.energy_kcal).toBeCloseTo(144, 6);
    expect(comYield.totalGrams).toBe(250);
  });

  it("porções inválidas são rejeitadas", () => {
    expect(() => recipeNutrition([], { servings: 0 })).toThrow(DomainError);
  });
});
