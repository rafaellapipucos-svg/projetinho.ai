"use client";

import { useMemo, useState } from "react";
import { Loader2, UtensilsCrossed } from "lucide-react";
import { api, type RouterOutputs } from "@/app/_trpc/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { aggregate } from "@/domain/nutrition/vector";
import { itemVector } from "@/domain/nutrition/plan";
import type { NutrientVector } from "@/domain/shared/types";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import { messages } from "@/messages/pt-br";

type PlanData = NonNullable<RouterOutputs["portal"]["activePlan"]>;

const CORE = [
  { key: "energy_kcal", label: "kcal", decimals: 0 },
  { key: "protein_g", label: "Proteína (g)", decimals: 1 },
  { key: "carbohydrate_g", label: "Carboidrato (g)", decimals: 1 },
  { key: "lipid_g", label: "Lipídeos (g)", decimals: 1 },
] as const;

function itemPer100(
  plan: PlanData,
  item: PlanData["items"][number],
): NutrientVector {
  if (item.foodId) return plan.foods[item.foodId]?.per100 ?? {};
  return plan.recipes[item.recipeId ?? ""]?.per100 ?? {};
}

function itemLabel(plan: PlanData, item: PlanData["items"][number]): string {
  if (item.recipeId) {
    return `${formatNumber(item.quantity, 1)} ${messages.plans.builder.servingUnit}`;
  }
  if (item.foodMeasureId && item.foodId) {
    const measure = plan.foods[item.foodId]?.measures.find(
      (candidate) => candidate.id === item.foodMeasureId,
    );
    if (measure) return `${formatNumber(item.quantity, 1)} × ${measure.name}`;
  }
  if (item.measurementUnitId) {
    const unit = plan.units.find(
      (candidate) => candidate.id === item.measurementUnitId,
    );
    if (unit) return `${formatNumber(item.quantity, 1)} ${unit.abbreviation}`;
  }
  return formatNumber(item.quantity, 1);
}

export function PortalPlan() {
  const plan = api.portal.activePlan.useQuery();
  const [selectedDayId, setSelectedDayId] = useState<string | null>(null);

  const data = plan.data;
  const dayId =
    selectedDayId ??
    [...(data?.days ?? [])].sort((a, b) => a.sortOrder - b.sortOrder)[0]?.id ??
    null;

  const dayTotals = useMemo<NutrientVector>(() => {
    if (!data || !dayId) return {};
    const meals = data.meals
      .filter((meal) => meal.dayId === dayId)
      .sort((a, b) => a.sortOrder - b.sortOrder);
    const vectors = meals.flatMap((meal) => {
      const firstOption = data.options
        .filter((option) => option.mealId === meal.id)
        .sort((a, b) => a.sortOrder - b.sortOrder)[0];
      if (!firstOption) return [];
      return data.items
        .filter((item) => item.optionId === firstOption.id)
        .map((item) =>
          itemVector({
            per100: itemPer100(data, item),
            resolvedGrams: item.resolvedGrams,
          }),
        );
    });
    return aggregate(vectors);
  }, [data, dayId]);

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

  if (!data) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
          <UtensilsCrossed
            className="text-muted-foreground size-10"
            aria-hidden
          />
          <p className="text-muted-foreground">{messages.portal.plan.none}</p>
        </CardContent>
      </Card>
    );
  }

  const days = [...data.days].sort((a, b) => a.sortOrder - b.sortOrder);
  const meals = data.meals
    .filter((meal) => meal.dayId === dayId)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold tracking-tight">{data.plan.name}</h1>

      {days.length > 1 ? (
        <div className="flex flex-wrap gap-2">
          {days.map((day) => (
            <button
              key={day.id}
              type="button"
              onClick={() => setSelectedDayId(day.id)}
              className={cn(
                "rounded-full border px-3 py-1 text-sm font-medium",
                day.id === dayId
                  ? "bg-primary text-primary-foreground border-primary"
                  : "text-muted-foreground",
              )}
            >
              {day.name}
            </button>
          ))}
        </div>
      ) : null}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">
            {messages.portal.plan.dayTotals}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
          {CORE.map((core) => (
            <div key={core.key} className="flex justify-between">
              <span className="text-muted-foreground">{core.label}</span>
              <span className="tabular-nums">
                {formatNumber(dayTotals[core.key] ?? 0, core.decimals)}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>

      {meals.map((meal) => {
        const options = data.options
          .filter((option) => option.mealId === meal.id)
          .sort((a, b) => a.sortOrder - b.sortOrder);
        return (
          <Card key={meal.id}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-baseline justify-between text-base">
                {meal.customName ?? meal.mealTypeName}
                {meal.scheduledTime ? (
                  <span className="text-muted-foreground text-sm font-normal">
                    {meal.scheduledTime}
                  </span>
                ) : null}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {options.map((option) => {
                const items = data.items
                  .filter((item) => item.optionId === option.id)
                  .sort((a, b) => a.sortOrder - b.sortOrder);
                return (
                  <div key={option.id}>
                    {options.length > 1 ? (
                      <p className="text-muted-foreground mb-1 text-xs font-medium uppercase">
                        {option.name}
                      </p>
                    ) : null}
                    <ul className="space-y-1 text-sm">
                      {items.map((item) => (
                        <li
                          key={item.id}
                          className="flex justify-between gap-2"
                        >
                          <span className="min-w-0 truncate">
                            {item.foodId
                              ? (data.foods[item.foodId]?.name ?? "—")
                              : (data.recipes[item.recipeId ?? ""]?.name ??
                                "—")}
                          </span>
                          <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
                            {itemLabel(data, item)} ·{" "}
                            {messages.portal.plan.grams(
                              formatNumber(item.resolvedGrams, 0),
                            )}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
