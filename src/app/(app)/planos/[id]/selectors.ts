"use client";

import { useMemo } from "react";
import { useShallow } from "zustand/react/shallow";
import { aggregate } from "@/domain/nutrition/vector";
import { itemVector } from "@/domain/nutrition/plan";
import type { NutrientVector } from "@/domain/shared/types";
import { useBuilder, type BuilderItem } from "./store";

/**
 * Seletores derivados (§7.2): assinaturas granulares via useShallow —
 * editar um item re-renderiza apenas a própria opção e o total do dia
 * (e só se o item estiver na opção principal).
 */

function itemsToVector(
  items: BuilderItem[],
  foods: ReturnType<typeof useBuilder.getState>["foods"],
  recipes: ReturnType<typeof useBuilder.getState>["recipes"],
): NutrientVector {
  return aggregate(
    items.map((item) =>
      itemVector({
        per100: item.foodId
          ? (foods[item.foodId]?.per100 ?? {})
          : (recipes[item.recipeId ?? ""]?.per100 ?? {}),
        resolvedGrams: item.resolvedGrams,
      }),
    ),
  );
}

export function useOptionVector(optionId: string): NutrientVector {
  const items = useBuilder(
    useShallow((state) =>
      (state.itemOrderByOption[optionId] ?? [])
        .map((id) => state.items[id])
        .filter((item): item is BuilderItem => item !== undefined),
    ),
  );
  const foods = useBuilder((state) => state.foods);
  const recipes = useBuilder((state) => state.recipes);
  return useMemo(
    () => itemsToVector(items, foods, recipes),
    [items, foods, recipes],
  );
}

/** Total do dia = soma das opções PRINCIPAIS (primeira de cada refeição). */
export function useDayVector(dayId: string | null): NutrientVector {
  const items = useBuilder(
    useShallow((state) => {
      if (!dayId) return [] as BuilderItem[];
      const mealIds = state.mealOrderByDay[dayId] ?? [];
      return mealIds
        .map((mealId) => state.optionOrderByMeal[mealId]?.[0])
        .filter((optionId): optionId is string => optionId !== undefined)
        .flatMap((optionId) =>
          (state.itemOrderByOption[optionId] ?? [])
            .map((id) => state.items[id])
            .filter((item): item is BuilderItem => item !== undefined),
        );
    }),
  );
  const foods = useBuilder((state) => state.foods);
  const recipes = useBuilder((state) => state.recipes);
  return useMemo(
    () => itemsToVector(items, foods, recipes),
    [items, foods, recipes],
  );
}
