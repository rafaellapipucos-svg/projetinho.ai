import type { NutrientVector } from "@/domain/shared/types";
import { aggregate, scaleNutrients } from "@/domain/nutrition/vector";

/**
 * Agregação do plano alimentar (§7.2): item → opção → refeição → dia.
 * Estruturas mínimas e puras — o builder (client) e o service (server)
 * alimentam este módulo com os mesmos dados e obtêm os mesmos números.
 */

export interface CalcItem {
  /** Nutrientes por 100 g/ml do alimento ou receita. */
  per100: NutrientVector;
  resolvedGrams: number;
}

export interface CalcOption {
  id: string;
  items: CalcItem[];
}

export interface CalcMeal {
  id: string;
  /** Ordenadas por sortOrder — a primeira é a opção principal. */
  options: CalcOption[];
}

export interface CalcDay {
  id: string;
  meals: CalcMeal[];
}

export function itemVector(item: CalcItem): NutrientVector {
  return scaleNutrients(item.per100, item.resolvedGrams);
}

export function optionTotals(option: CalcOption): NutrientVector {
  return aggregate(option.items.map(itemVector));
}

/**
 * Total da refeição = totais da PRIMEIRA opção (a principal).
 * As demais opções são substituições equivalentes — cada uma exibe seus
 * próprios totais, mas não somam no dia (senão o dia dobraria).
 */
export function mealTotals(meal: CalcMeal): NutrientVector {
  const principal = meal.options[0];
  return principal ? optionTotals(principal) : {};
}

export function dayTotals(day: CalcDay): NutrientVector {
  return aggregate(day.meals.map(mealTotals));
}

export type TargetStatus = "no_target" | "below" | "within" | "above";

export interface NutrientTarget {
  nutrientKey: string;
  min: number | null;
  max: number | null;
}

/** Limites inclusivos: valor igual ao mínimo/máximo está dentro da meta. */
export function targetStatus(
  value: number,
  target: { min: number | null; max: number | null },
): TargetStatus {
  if (target.min === null && target.max === null) return "no_target";
  if (target.min !== null && value < target.min) return "below";
  if (target.max !== null && value > target.max) return "above";
  return "within";
}

export interface TargetComparison extends NutrientTarget {
  value: number;
  status: TargetStatus;
}

export function compareDayToTargets(
  day: NutrientVector,
  targets: NutrientTarget[],
): TargetComparison[] {
  return targets.map((target) => {
    const value = day[target.nutrientKey] ?? 0;
    return { ...target, value, status: targetStatus(value, target) };
  });
}
