"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Trash2 } from "lucide-react";
import { api } from "@/app/_trpc/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { FoodPicker } from "@/app/_components/food-picker";
import { resolveGrams } from "@/domain/nutrition/quantity";
import { recipeNutrition } from "@/domain/nutrition/recipe";
import type { NutrientVector } from "@/domain/shared/types";
import { formatNumber } from "@/lib/format";
import { messages } from "@/messages/pt-br";

interface LocalIngredient {
  localId: string;
  foodId: string;
  foodName: string;
  per100: NutrientVector;
  measures: Array<{ id: string; name: string; gramWeight: number }>;
  quantity: string;
  /** "m:<foodMeasureId>" ou "u:<measurementUnitId>" */
  selection: string;
}

const CORE_KEYS = [
  { key: "energy_kcal", label: "kcal", decimals: 0 },
  { key: "protein_g", label: "PTN", decimals: 1 },
  { key: "carbohydrate_g", label: "CHO", decimals: 1 },
  { key: "lipid_g", label: "LIP", decimals: 1 },
] as const;

export function RecipeEditor({ recipeId }: { recipeId: string | null }) {
  const router = useRouter();
  const utils = api.useUtils();

  const units = api.catalog.system.measurementUnits.useQuery();
  const existing = api.recipe.byId.useQuery(
    { id: recipeId ?? "" },
    { enabled: recipeId !== null },
  );

  const [name, setName] = useState("");
  const [servings, setServings] = useState("1");
  const [yieldGrams, setYieldGrams] = useState("");
  const [instructions, setInstructions] = useState("");
  const [ingredients, setIngredients] = useState<LocalIngredient[]>([]);
  const seeded = useRef(false);

  const usableUnits = useMemo(
    () => (units.data ?? []).filter((unit) => unit.gramsPerUnit !== null),
    [units.data],
  );
  const defaultUnitId = useMemo(
    () =>
      usableUnits.find((unit) => unit.key === "g")?.id ?? usableUnits[0]?.id,
    [usableUnits],
  );

  // Semeia o estado local ao editar: busca a composição de cada ingrediente
  // para o preview local (mesmo motor do servidor).
  useEffect(() => {
    if (!recipeId || !existing.data || seeded.current) return;
    seeded.current = true;
    const recipe = existing.data;
    setName(recipe.name);
    setServings(String(recipe.servings));
    setYieldGrams(recipe.yieldGrams !== null ? String(recipe.yieldGrams) : "");
    setInstructions(recipe.instructions ?? "");
    void Promise.all(
      recipe.ingredients.map(async (item) => {
        const food = await utils.food.byId.fetch({ id: item.foodId });
        const per100: NutrientVector = {};
        for (const nutrient of food.nutrients)
          per100[nutrient.key] = nutrient.amount;
        return {
          localId: crypto.randomUUID(),
          foodId: item.foodId,
          foodName: item.foodName,
          per100,
          measures: food.measures,
          quantity: String(item.quantity),
          selection: item.foodMeasureId
            ? `m:${item.foodMeasureId}`
            : `u:${item.measurementUnitId ?? ""}`,
        } satisfies LocalIngredient;
      }),
    ).then(setIngredients);
  }, [recipeId, existing.data, utils]);

  async function addFood(foodId: string) {
    const food = await utils.food.byId.fetch({ id: foodId });
    const per100: NutrientVector = {};
    for (const nutrient of food.nutrients)
      per100[nutrient.key] = nutrient.amount;
    setIngredients((previous) => [
      ...previous,
      {
        localId: crypto.randomUUID(),
        foodId: food.id,
        foodName: food.name,
        per100,
        measures: food.measures,
        quantity: food.measures.length > 0 ? "1" : "100",
        selection:
          food.measures[0] !== undefined
            ? `m:${food.measures[0].id}`
            : `u:${defaultUnitId ?? ""}`,
      },
    ]);
  }

  function updateIngredient(localId: string, patch: Partial<LocalIngredient>) {
    setIngredients((previous) =>
      previous.map((item) =>
        item.localId === localId ? { ...item, ...patch } : item,
      ),
    );
  }

  function removeIngredient(localId: string) {
    setIngredients((previous) =>
      previous.filter((item) => item.localId !== localId),
    );
  }

  function gramsFor(item: LocalIngredient): number | null {
    const quantity = Number(item.quantity.replace(",", "."));
    if (!Number.isFinite(quantity) || quantity <= 0) return null;
    try {
      if (item.selection.startsWith("m:")) {
        const measure = item.measures.find(
          (candidate) => candidate.id === item.selection.slice(2),
        );
        if (!measure) return null;
        return resolveGrams(quantity, {
          measureGramWeight: measure.gramWeight,
        });
      }
      const unit = usableUnits.find(
        (candidate) => candidate.id === item.selection.slice(2),
      );
      if (!unit) return null;
      return resolveGrams(quantity, {
        unit: { type: unit.type, gramsPerUnit: unit.gramsPerUnit },
      });
    } catch {
      return null;
    }
  }

  const servingsNumber = Number(servings.replace(",", "."));
  const yieldNumber = Number(yieldGrams.replace(",", "."));
  const resolved = ingredients.map((item) => ({ item, grams: gramsFor(item) }));
  const allValid =
    resolved.length > 0 &&
    resolved.every((entry) => entry.grams !== null) &&
    Number.isFinite(servingsNumber) &&
    servingsNumber > 0;

  const nutrition = allValid
    ? recipeNutrition(
        resolved.map((entry) => ({
          per100: entry.item.per100,
          resolvedGrams: entry.grams ?? 0,
        })),
        {
          servings: servingsNumber,
          yieldGrams:
            Number.isFinite(yieldNumber) && yieldNumber > 0
              ? yieldNumber
              : null,
        },
      )
    : null;

  const onError = (error: { message: string }) => toast.error(error.message);
  const onSaved = () => {
    void utils.recipe.invalidate();
    toast.success(messages.recipes.saved);
    router.push("/receitas");
  };

  const create = api.recipe.create.useMutation({ onSuccess: onSaved, onError });
  const update = api.recipe.update.useMutation({ onSuccess: onSaved, onError });
  const deactivate = api.recipe.deactivate.useMutation({
    onSuccess: () => {
      void utils.recipe.invalidate();
      toast.success(messages.recipes.deactivated);
      router.push("/receitas");
    },
    onError,
  });

  function save() {
    const payload = {
      name: name.trim(),
      servings: servingsNumber,
      yieldGrams:
        Number.isFinite(yieldNumber) && yieldNumber > 0 ? yieldNumber : null,
      instructions: instructions.trim() === "" ? null : instructions.trim(),
      ingredients: ingredients.map((item) => ({
        foodId: item.foodId,
        quantity: Number(item.quantity.replace(",", ".")),
        measurementUnitId: item.selection.startsWith("u:")
          ? item.selection.slice(2)
          : null,
        foodMeasureId: item.selection.startsWith("m:")
          ? item.selection.slice(2)
          : null,
      })),
    };
    if (recipeId) {
      update.mutate({ id: recipeId, ...payload });
    } else {
      create.mutate(payload);
    }
  }

  const saving = create.isPending || update.isPending;
  const loading = recipeId !== null && existing.isPending;

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2
          className="text-muted-foreground size-6 animate-spin"
          aria-hidden
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link
              href="/receitas"
              aria-label={messages.recipes.editor.backToList}
            >
              <ArrowLeft className="size-4" aria-hidden />
            </Link>
          </Button>
          <h1 className="text-2xl font-semibold tracking-tight">
            {recipeId
              ? messages.recipes.editor.editTitle
              : messages.recipes.editor.newTitle}
          </h1>
        </div>
        <div className="flex gap-2">
          {recipeId ? (
            <Button
              variant="outline"
              onClick={() => deactivate.mutate({ id: recipeId })}
              disabled={deactivate.isPending}
            >
              {messages.foods.deactivateButton}
            </Button>
          ) : null}
          <Button
            onClick={save}
            disabled={saving || !allValid || name.trim().length < 2}
          >
            {saving ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : null}
            {messages.recipes.editor.saveButton}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1 sm:col-span-3">
              <Label htmlFor="recipe-name">
                {messages.recipes.editor.nameLabel}
              </Label>
              <Input
                id="recipe-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="recipe-servings">
                {messages.recipes.editor.servingsFieldLabel}
              </Label>
              <Input
                id="recipe-servings"
                inputMode="decimal"
                value={servings}
                onChange={(event) => setServings(event.target.value)}
              />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor="recipe-yield">
                {messages.recipes.editor.yieldLabel}
              </Label>
              <Input
                id="recipe-yield"
                inputMode="decimal"
                value={yieldGrams}
                onChange={(event) => setYieldGrams(event.target.value)}
              />
              <p className="text-muted-foreground text-xs">
                {messages.recipes.editor.yieldHelp}
              </p>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>{messages.recipes.editor.ingredientsTitle}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FoodPicker
                placeholder={messages.recipes.editor.searchFoodPlaceholder}
                onSelect={(food) => void addFood(food.id)}
                clearOnSelect
              />
              {ingredients.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  {messages.recipes.editor.noIngredients}
                </p>
              ) : (
                <ul className="space-y-3">
                  {resolved.map(({ item, grams }) => (
                    <li
                      key={item.localId}
                      className="grid grid-cols-[1fr_5rem_11rem_auto] items-center gap-2"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {item.foodName}
                        </p>
                        <p className="text-muted-foreground text-xs tabular-nums">
                          {grams !== null ? `${formatNumber(grams, 1)} g` : "—"}
                        </p>
                      </div>
                      <Input
                        inputMode="decimal"
                        aria-label={messages.recipes.editor.quantityLabel}
                        value={item.quantity}
                        onChange={(event) =>
                          updateIngredient(item.localId, {
                            quantity: event.target.value,
                          })
                        }
                      />
                      <Select
                        value={item.selection}
                        onValueChange={(value) =>
                          updateIngredient(item.localId, { selection: value })
                        }
                      >
                        <SelectTrigger
                          aria-label={messages.recipes.editor.unitLabel}
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {item.measures.map((measure) => (
                            <SelectItem
                              key={measure.id}
                              value={`m:${measure.id}`}
                            >
                              {measure.name} (
                              {formatNumber(measure.gramWeight, 0)} g)
                            </SelectItem>
                          ))}
                          {usableUnits.map((unit) => (
                            <SelectItem key={unit.id} value={`u:${unit.id}`}>
                              {unit.name} ({unit.abbreviation})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeIngredient(item.localId)}
                        aria-label={messages.recipes.editor.removeIngredient}
                      >
                        <Trash2
                          className="text-destructive size-4"
                          aria-hidden
                        />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <div className="space-y-1">
            <Label htmlFor="recipe-instructions">
              {messages.recipes.editor.instructionsLabel}
            </Label>
            <Textarea
              id="recipe-instructions"
              rows={5}
              value={instructions}
              onChange={(event) => setInstructions(event.target.value)}
            />
          </div>
        </div>

        <Card className="h-fit lg:sticky lg:top-6">
          <CardHeader>
            <CardTitle>{messages.recipes.editor.nutritionTitle}</CardTitle>
          </CardHeader>
          <CardContent>
            {nutrition ? (
              <div className="space-y-4 text-sm">
                {(
                  [
                    [messages.recipes.editor.perServing, nutrition.perServing],
                    [messages.recipes.editor.per100g, nutrition.per100],
                    [messages.recipes.editor.totalLabel, nutrition.total],
                  ] as const
                ).map(([label, vector]) => (
                  <div key={label}>
                    <p className="text-muted-foreground mb-1 text-xs font-medium uppercase">
                      {label}
                    </p>
                    <ul className="grid grid-cols-2 gap-x-4 gap-y-0.5">
                      {CORE_KEYS.map((core) => (
                        <li key={core.key} className="flex justify-between">
                          <span className="text-muted-foreground">
                            {core.label}
                          </span>
                          <span className="tabular-nums">
                            {formatNumber(vector[core.key] ?? 0, core.decimals)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">
                {messages.recipes.editor.noIngredients}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
