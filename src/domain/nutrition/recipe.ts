import { DomainError } from "@/domain/shared/errors";
import type { NutrientVector } from "@/domain/shared/types";
import { aggregate, scaleNutrients } from "@/domain/nutrition/vector";

export interface RecipeIngredientInput {
  /** Nutrientes do alimento por 100 g/ml. */
  per100: NutrientVector;
  /** Quantidade resolvida em g/ml. */
  resolvedGrams: number;
}

export interface RecipeNutrition {
  /** Peso total considerado (rendimento informado ou soma dos ingredientes). */
  totalGrams: number;
  total: NutrientVector;
  per100: NutrientVector;
  perServing: NutrientVector;
}

/**
 * Nutrição agregada de uma receita. `yieldGrams` é o peso APÓS o preparo
 * (perda/absorção de água); quando ausente, usa-se a soma dos ingredientes.
 * Os nutrientes totais vêm sempre dos ingredientes — o rendimento afeta
 * apenas a concentração por 100 g.
 */
export function recipeNutrition(
  ingredients: RecipeIngredientInput[],
  options: { servings: number; yieldGrams?: number | null },
): RecipeNutrition {
  if (options.servings <= 0) {
    throw new DomainError("A receita deve render pelo menos uma porção");
  }
  const rawTotalGrams = ingredients.reduce(
    (sum, ingredient) => sum + ingredient.resolvedGrams,
    0,
  );
  const totalGrams =
    options.yieldGrams != null && options.yieldGrams > 0
      ? options.yieldGrams
      : rawTotalGrams;

  const total = aggregate(
    ingredients.map((ingredient) =>
      scaleNutrients(ingredient.per100, ingredient.resolvedGrams),
    ),
  );

  const per100 =
    totalGrams > 0 ? scaleNutrients(total, 10_000 / totalGrams) : {};
  const perServing = scaleNutrients(total, 100 / options.servings);

  return { totalGrams, total, per100, perServing };
}
