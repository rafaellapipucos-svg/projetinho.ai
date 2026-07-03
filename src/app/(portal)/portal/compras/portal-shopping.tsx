"use client";

import { useMemo } from "react";
import { Loader2, ShoppingBasket } from "lucide-react";
import { api } from "@/app/_trpc/client";
import { Card, CardContent } from "@/components/ui/card";
import { formatNumber } from "@/lib/format";
import { messages } from "@/messages/pt-br";

/**
 * Lista de compras derivada do plano ativo no PRÓPRIO cliente:
 * soma os alimentos das opções principais de todos os dias listados.
 */
export function PortalShopping() {
  const plan = api.portal.activePlan.useQuery();

  const list = useMemo(() => {
    const data = plan.data;
    if (!data) return { foods: [], recipes: [] };

    const principalOptionIds = new Set(
      data.meals.map(
        (meal) =>
          data.options
            .filter((option) => option.mealId === meal.id)
            .sort((a, b) => a.sortOrder - b.sortOrder)[0]?.id,
      ),
    );

    const foodGrams = new Map<string, number>();
    const recipePortions = new Map<string, number>();
    for (const item of data.items) {
      if (!principalOptionIds.has(item.optionId)) continue;
      if (item.foodId) {
        foodGrams.set(
          item.foodId,
          (foodGrams.get(item.foodId) ?? 0) + item.resolvedGrams,
        );
      } else if (item.recipeId) {
        recipePortions.set(
          item.recipeId,
          (recipePortions.get(item.recipeId) ?? 0) + item.quantity,
        );
      }
    }

    return {
      foods: [...foodGrams.entries()]
        .map(([foodId, grams]) => ({
          id: foodId,
          name: plan.data?.foods[foodId]?.name ?? "—",
          grams,
        }))
        .sort((a, b) => a.name.localeCompare(b.name, "pt-BR")),
      recipes: [...recipePortions.entries()]
        .map(([recipeId, portions]) => ({
          id: recipeId,
          name: plan.data?.recipes[recipeId]?.name ?? "—",
          portions,
        }))
        .sort((a, b) => a.name.localeCompare(b.name, "pt-BR")),
    };
  }, [plan.data]);

  if (plan.isPending) {
    return (
      <div className="flex justify-center py-16">
        <Loader2
          className="text-muted-foreground size-6 animate-spin"
          aria-hidden
        />
      </div>
    );
  }

  const empty = list.foods.length === 0 && list.recipes.length === 0;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">
          {messages.portal.shopping.title}
        </h1>
        <p className="text-muted-foreground text-sm">
          {messages.portal.shopping.hint}
        </p>
      </div>

      {empty ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <ShoppingBasket
              className="text-muted-foreground size-10"
              aria-hidden
            />
            <p className="text-muted-foreground">
              {messages.portal.shopping.empty}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <ul className="divide-y text-sm">
              {list.foods.map((food) => (
                <li key={food.id} className="flex justify-between gap-2 py-2">
                  <span className="min-w-0 truncate">{food.name}</span>
                  <span className="text-muted-foreground shrink-0 tabular-nums">
                    {formatNumber(food.grams, 0)} g
                  </span>
                </li>
              ))}
              {list.recipes.map((recipe) => (
                <li key={recipe.id} className="flex justify-between gap-2 py-2">
                  <span className="min-w-0 truncate">{recipe.name}</span>
                  <span className="text-muted-foreground shrink-0 tabular-nums">
                    {messages.portal.shopping.recipePortions(
                      formatNumber(recipe.portions, 1),
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
