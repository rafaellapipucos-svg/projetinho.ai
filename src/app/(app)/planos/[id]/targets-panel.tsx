"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import { api } from "@/app/_trpc/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { targetStatus, type TargetStatus } from "@/domain/nutrition/plan";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import { omit } from "@/lib/object";
import { messages } from "@/messages/pt-br";
import { useBuilder } from "./store";
import { useDayVector } from "./selectors";

const STATUS_COLOR: Record<TargetStatus, string> = {
  no_target: "bg-muted-foreground/40",
  below: "bg-amber-500",
  within: "bg-emerald-500",
  above: "bg-destructive",
};

const CORE = [
  { key: "energy_kcal", label: "Energia", unit: "kcal", decimals: 0 },
  { key: "protein_g", label: "Proteína", unit: "g", decimals: 1 },
  { key: "carbohydrate_g", label: "Carboidrato", unit: "g", decimals: 1 },
  { key: "lipid_g", label: "Lipídeos", unit: "g", decimals: 1 },
] as const;

function parseTargetValue(value: string): number | null {
  if (value.trim() === "") return null;
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

/** Painel lateral: totais do dia selecionado + metas com semáforo (§7.2-6). */
export function TargetsPanel({ readOnly }: { readOnly: boolean }) {
  const selectedDayId = useBuilder((state) => state.selectedDayId);
  const targets = useBuilder(useShallow((state) => state.targets));
  const setTarget = useBuilder((state) => state.setTarget);
  const removeTarget = useBuilder((state) => state.removeTarget);
  const dayVector = useDayVector(selectedDayId);

  const nutrients = api.catalog.system.nutrients.useQuery();
  const [nutrientToAdd, setNutrientToAdd] = useState("");
  const [drafts, setDrafts] = useState<
    Record<string, { min: string; max: string }>
  >({});

  const available = (nutrients.data ?? []).filter(
    (nutrient) => !targets.some((target) => target.nutrientId === nutrient.id),
  );

  function commitTarget(target: (typeof targets)[number]) {
    const draft = drafts[target.nutrientId];
    if (!draft) return;
    setTarget(
      {
        id: target.nutrientId,
        key: target.key,
        name: target.name,
        unit: target.unit,
        decimals: target.decimals,
      },
      parseTargetValue(draft.min),
      parseTargetValue(draft.max),
    );
    setDrafts((previous) => {
      return omit(previous, target.nutrientId);
    });
  }

  return (
    <div className="space-y-4 xl:sticky xl:top-6 xl:h-fit">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            {messages.plans.builder.dayTotalsTitle}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1.5 text-sm">
          {CORE.map((core) => (
            <div key={core.key} className="flex items-center justify-between">
              <span className="text-muted-foreground">{core.label}</span>
              <span className="tabular-nums">
                {formatNumber(dayVector[core.key] ?? 0, core.decimals)}{" "}
                {core.unit}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            {messages.plans.builder.targetsTitle}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {targets.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              {messages.plans.builder.noTargets}
            </p>
          ) : (
            <ul className="space-y-2.5">
              {targets.map((target) => {
                const value = dayVector[target.key] ?? 0;
                const status = targetStatus(value, {
                  min: target.min,
                  max: target.max,
                });
                const draft = drafts[target.nutrientId] ?? {
                  min: target.min !== null ? String(target.min) : "",
                  max: target.max !== null ? String(target.max) : "",
                };
                return (
                  <li key={target.nutrientId} className="space-y-1">
                    <div className="flex items-center justify-between gap-2 text-sm">
                      <span className="flex min-w-0 items-center gap-1.5">
                        <span
                          className={cn(
                            "size-2 shrink-0 rounded-full",
                            STATUS_COLOR[status],
                          )}
                          aria-hidden
                        />
                        <span className="truncate">{target.name}</span>
                      </span>
                      <span className="shrink-0 tabular-nums">
                        {formatNumber(value, target.decimals)} {target.unit}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Input
                        className="h-7 text-xs tabular-nums"
                        inputMode="decimal"
                        placeholder={messages.plans.builder.targetMinLabel}
                        value={draft.min}
                        onChange={(event) =>
                          setDrafts((previous) => ({
                            ...previous,
                            [target.nutrientId]: {
                              ...draft,
                              min: event.target.value,
                            },
                          }))
                        }
                        onBlur={() => commitTarget(target)}
                        disabled={readOnly}
                      />
                      <span className="text-muted-foreground text-xs">–</span>
                      <Input
                        className="h-7 text-xs tabular-nums"
                        inputMode="decimal"
                        placeholder={messages.plans.builder.targetMaxLabel}
                        value={draft.max}
                        onChange={(event) =>
                          setDrafts((previous) => ({
                            ...previous,
                            [target.nutrientId]: {
                              ...draft,
                              max: event.target.value,
                            },
                          }))
                        }
                        onBlur={() => commitTarget(target)}
                        disabled={readOnly}
                      />
                      {!readOnly ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7 shrink-0"
                          onClick={() => removeTarget(target.nutrientId)}
                          aria-label={messages.plans.builder.removeTarget}
                        >
                          <Trash2
                            className="text-destructive size-3.5"
                            aria-hidden
                          />
                        </Button>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {!readOnly ? (
            <div className="flex items-center gap-2 border-t pt-3">
              <Select value={nutrientToAdd} onValueChange={setNutrientToAdd}>
                <SelectTrigger
                  className="h-8"
                  aria-label={messages.plans.builder.targetNutrientLabel}
                >
                  <SelectValue placeholder={messages.plans.builder.addTarget} />
                </SelectTrigger>
                <SelectContent>
                  {available.map((nutrient) => (
                    <SelectItem key={nutrient.id} value={nutrient.id}>
                      {nutrient.name} ({nutrient.unit})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="icon"
                className="size-8 shrink-0"
                disabled={nutrientToAdd === ""}
                onClick={() => {
                  const nutrient = nutrients.data?.find(
                    (candidate) => candidate.id === nutrientToAdd,
                  );
                  if (nutrient) {
                    setTarget(
                      {
                        id: nutrient.id,
                        key: nutrient.key,
                        name: nutrient.name,
                        unit: nutrient.unit,
                        decimals: nutrient.decimals,
                      },
                      null,
                      null,
                    );
                    setNutrientToAdd("");
                  }
                }}
                aria-label={messages.plans.builder.addTarget}
              >
                <Plus className="size-4" aria-hidden />
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
