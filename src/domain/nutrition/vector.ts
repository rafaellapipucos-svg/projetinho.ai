import type { NutrientVector } from "@/domain/shared/types";

/**
 * Escala um vetor de nutrientes definido por 100 g/ml para a quantidade dada.
 * Sem arredondamento (política §3.5 — arredonda-se só na exibição).
 */
export function scaleNutrients(
  per100: NutrientVector,
  quantityGrams: number,
): NutrientVector {
  const factor = quantityGrams / 100;
  const result: NutrientVector = {};
  for (const [key, value] of Object.entries(per100)) {
    result[key] = value * factor;
  }
  return result;
}

/** Soma N vetores de nutrientes (item → opção → refeição → dia → plano). */
export function aggregate(vectors: NutrientVector[]): NutrientVector {
  const result: NutrientVector = {};
  for (const vector of vectors) {
    for (const [key, value] of Object.entries(vector)) {
      result[key] = (result[key] ?? 0) + value;
    }
  }
  return result;
}
