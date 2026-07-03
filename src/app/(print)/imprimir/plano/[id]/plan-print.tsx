"use client";

import { useEffect } from "react";
import { Loader2, Printer } from "lucide-react";
import { api, type RouterOutputs } from "@/app/_trpc/client";
import { Button } from "@/components/ui/button";
import { aggregate } from "@/domain/nutrition/vector";
import { itemVector } from "@/domain/nutrition/plan";
import type { NutrientVector } from "@/domain/shared/types";
import { formatDate } from "@/lib/date";
import { formatNumber } from "@/lib/format";
import { messages } from "@/messages/pt-br";

type PlanData = RouterOutputs["plan"]["get"];

const CORE = [
  { key: "energy_kcal", label: "kcal", decimals: 0 },
  { key: "protein_g", label: "PTN", decimals: 1 },
  { key: "carbohydrate_g", label: "CHO", decimals: 1 },
  { key: "lipid_g", label: "LIP", decimals: 1 },
] as const;

function per100(
  plan: PlanData,
  item: PlanData["items"][number],
): NutrientVector {
  return item.foodId
    ? (plan.foods[item.foodId]?.per100 ?? {})
    : (plan.recipes[item.recipeId ?? ""]?.per100 ?? {});
}

function label(plan: PlanData, item: PlanData["items"][number]): string {
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

export function PlanPrint({ planId }: { planId: string }) {
  const plan = api.plan.get.useQuery({ id: planId });
  const org = api.organization.current.useQuery();

  // Título da aba ajuda a nomear o PDF salvo
  useEffect(() => {
    if (plan.data) document.title = `${plan.data.plan.name}`;
  }, [plan.data]);

  if (plan.isPending) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="size-6 animate-spin" aria-hidden />
      </div>
    );
  }
  const data = plan.data;
  if (!data) return null;

  const days = [...data.days].sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <div className="space-y-6">
      <style>{`@media print { .no-print { display: none !important; } @page { margin: 1.5cm; } }`}</style>

      <div className="no-print flex justify-end">
        <Button onClick={() => window.print()}>
          <Printer className="size-4" aria-hidden />
          {messages.planPrint.printButton}
        </Button>
      </div>

      <header className="border-b pb-4">
        <h1 className="text-2xl font-bold">{org.data?.name ?? ""}</h1>
        <p className="text-lg">{data.plan.name}</p>
        <p className="text-sm text-neutral-600">
          {data.plan.patientName ? `${data.plan.patientName} · ` : ""}
          {messages.planPrint.generatedAt(formatDate(new Date()))}
        </p>
      </header>

      {days.map((day) => {
        const meals = data.meals
          .filter((meal) => meal.dayId === day.id)
          .sort((a, b) => a.sortOrder - b.sortOrder);

        const dayVectors = meals.flatMap((meal) => {
          const firstOption = data.options
            .filter((option) => option.mealId === meal.id)
            .sort((a, b) => a.sortOrder - b.sortOrder)[0];
          if (!firstOption) return [];
          return data.items
            .filter((item) => item.optionId === firstOption.id)
            .map((item) =>
              itemVector({
                per100: per100(data, item),
                resolvedGrams: item.resolvedGrams,
              }),
            );
        });
        const dayTotals = aggregate(dayVectors);

        return (
          <section key={day.id} className="break-inside-avoid space-y-3">
            <h2 className="border-b text-lg font-semibold">{day.name}</h2>
            {meals.map((meal) => {
              const options = data.options
                .filter((option) => option.mealId === meal.id)
                .sort((a, b) => a.sortOrder - b.sortOrder);
              return (
                <div key={meal.id} className="space-y-1">
                  <h3 className="font-medium">
                    {meal.customName ?? meal.mealTypeName}
                    {meal.scheduledTime ? (
                      <span className="font-normal text-neutral-600">
                        {" "}
                        — {meal.scheduledTime}
                      </span>
                    ) : null}
                  </h3>
                  {options.map((option, index) => {
                    const items = data.items
                      .filter((item) => item.optionId === option.id)
                      .sort((a, b) => a.sortOrder - b.sortOrder);
                    return (
                      <div key={option.id} className="pl-3">
                        {options.length > 1 ? (
                          <p className="text-sm font-medium text-neutral-700">
                            {messages.planPrint.optionLabel} {index + 1}
                          </p>
                        ) : null}
                        <ul className="text-sm">
                          {items.map((item) => (
                            <li key={item.id} className="flex justify-between">
                              <span>
                                {item.foodId
                                  ? (data.foods[item.foodId]?.name ?? "—")
                                  : (data.recipes[item.recipeId ?? ""]?.name ??
                                    "—")}
                              </span>
                              <span className="text-neutral-600">
                                {label(data, item)} (
                                {formatNumber(item.resolvedGrams, 0)} g)
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    );
                  })}
                </div>
              );
            })}
            <p className="text-sm font-medium text-neutral-700">
              {messages.planPrint.dayTotals}:{" "}
              {CORE.map(
                (core) =>
                  `${core.label} ${formatNumber(dayTotals[core.key] ?? 0, core.decimals)}`,
              ).join(" · ")}
            </p>
          </section>
        );
      })}

      {data.plan.notes ? (
        <section className="border-t pt-3 text-sm">
          <p className="whitespace-pre-wrap">{data.plan.notes}</p>
        </section>
      ) : null}
    </div>
  );
}
