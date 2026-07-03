"use client";

import { useState } from "react";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useShallow } from "zustand/react/shallow";
import { GripVertical, Plus, Trash2 } from "lucide-react";
import { api } from "@/app/_trpc/client";
import { FoodPicker } from "@/app/_components/food-picker";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatNumber } from "@/lib/format";
import { messages } from "@/messages/pt-br";
import { useBuilder, type BuilderItem } from "./store";
import { useOptionVector } from "./selectors";

function OptionTotalsBadge({ optionId }: { optionId: string }) {
  const vector = useOptionVector(optionId);
  return (
    <span className="text-muted-foreground text-xs tabular-nums">
      {formatNumber(vector.energy_kcal ?? 0, 0)} kcal ·{" "}
      {formatNumber(vector.protein_g ?? 0, 1)}P ·{" "}
      {formatNumber(vector.carbohydrate_g ?? 0, 1)}C ·{" "}
      {formatNumber(vector.lipid_g ?? 0, 1)}G
    </span>
  );
}

function ItemRow({ item, readOnly }: { item: BuilderItem; readOnly: boolean }) {
  const foods = useBuilder((state) => state.foods);
  const recipes = useBuilder((state) => state.recipes);
  const units = useBuilder((state) => state.units);
  const updateItemQuantity = useBuilder((state) => state.updateItemQuantity);
  const updateItemSelection = useBuilder((state) => state.updateItemSelection);
  const removeItem = useBuilder((state) => state.removeItem);

  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({
      id: item.id,
      disabled: readOnly,
    });

  const food = item.foodId ? foods[item.foodId] : undefined;
  const recipe = item.recipeId ? recipes[item.recipeId] : undefined;
  const name = food?.name ?? recipe?.name ?? "—";
  const per100 = food?.per100 ?? recipe?.per100 ?? {};
  const kcal = ((per100.energy_kcal ?? 0) * item.resolvedGrams) / 100;

  const selection = item.foodMeasureId
    ? `m:${item.foodMeasureId}`
    : item.measurementUnitId
      ? `u:${item.measurementUnitId}`
      : "";
  const [quantityDraft, setQuantityDraft] = useState<string | null>(null);

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className="bg-background grid grid-cols-[auto_1fr_4.5rem_10rem_5rem_auto] items-center gap-2 rounded-md border px-2 py-1.5"
    >
      <button
        type="button"
        className="text-muted-foreground cursor-grab touch-none"
        {...attributes}
        {...listeners}
        aria-label="reordenar"
        disabled={readOnly}
      >
        <GripVertical className="size-4" aria-hidden />
      </button>
      <span className="truncate text-sm">{name}</span>
      <Input
        className="h-8 text-right tabular-nums"
        inputMode="decimal"
        value={quantityDraft ?? String(item.quantity)}
        onChange={(event) => setQuantityDraft(event.target.value)}
        onBlur={() => {
          if (quantityDraft !== null) {
            const parsed = Number(quantityDraft.replace(",", "."));
            if (Number.isFinite(parsed) && parsed > 0) {
              updateItemQuantity(item.id, parsed);
            }
            setQuantityDraft(null);
          }
        }}
        disabled={readOnly}
        aria-label={messages.plans.builder.quantityLabel}
      />
      {item.recipeId ? (
        <span className="text-muted-foreground truncate text-xs">
          {messages.plans.builder.servingUnit}
        </span>
      ) : (
        <Select
          value={selection}
          onValueChange={(value) =>
            updateItemSelection(item.id, {
              foodMeasureId: value.startsWith("m:") ? value.slice(2) : null,
              measurementUnitId: value.startsWith("u:") ? value.slice(2) : null,
            })
          }
          disabled={readOnly}
        >
          <SelectTrigger
            className="h-8"
            aria-label={messages.plans.builder.unitLabel}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(food?.measures ?? []).map((measure) => (
              <SelectItem key={measure.id} value={`m:${measure.id}`}>
                {measure.name} ({formatNumber(measure.gramWeight, 0)} g)
              </SelectItem>
            ))}
            {units
              .filter((unit) => unit.gramsPerUnit !== null)
              .map((unit) => (
                <SelectItem key={unit.id} value={`u:${unit.id}`}>
                  {unit.name} ({unit.abbreviation})
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      )}
      <span className="text-muted-foreground text-right text-xs tabular-nums">
        {formatNumber(item.resolvedGrams, 0)} g ·{" "}
        <span className="text-foreground">{formatNumber(kcal, 0)} kcal</span>
      </span>
      <Button
        variant="ghost"
        size="icon"
        className="size-7"
        onClick={() => removeItem(item.id)}
        disabled={readOnly}
        aria-label={messages.config.delete}
      >
        <Trash2 className="text-destructive size-3.5" aria-hidden />
      </Button>
    </li>
  );
}

function OptionSection({
  optionId,
  canRemove,
  readOnly,
}: {
  optionId: string;
  canRemove: boolean;
  readOnly: boolean;
}) {
  const utils = api.useUtils();
  const option = useBuilder((state) => state.options[optionId]);
  const items = useBuilder(
    useShallow((state) =>
      (state.itemOrderByOption[optionId] ?? [])
        .map((id) => state.items[id])
        .filter((item): item is BuilderItem => item !== undefined),
    ),
  );
  const renameOption = useBuilder((state) => state.renameOption);
  const removeOption = useBuilder((state) => state.removeOption);
  const addFoodItem = useBuilder((state) => state.addFoodItem);
  const addRecipeItem = useBuilder((state) => state.addRecipeItem);
  const reorderItems = useBuilder((state) => state.reorderItems);

  const recipesList = api.recipe.list.useQuery();
  const [recipeToAdd, setRecipeToAdd] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
  );

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const ids = items.map((item) => item.id);
    const oldIndex = ids.indexOf(String(active.id));
    const newIndex = ids.indexOf(String(over.id));
    if (oldIndex === -1 || newIndex === -1) return;
    reorderItems(optionId, arrayMove(ids, oldIndex, newIndex));
  }

  async function handleAddFood(foodId: string) {
    const detail = await utils.food.byId.fetch({ id: foodId });
    const per100: Record<string, number> = {};
    for (const nutrient of detail.nutrients)
      per100[nutrient.key] = nutrient.amount;
    addFoodItem(optionId, {
      id: detail.id,
      name: detail.name,
      baseUnit: detail.baseUnit,
      per100,
      measures: detail.measures.map((measure) => ({
        id: measure.id,
        name: measure.name,
        gramWeight: measure.gramWeight,
      })),
    });
  }

  async function handleAddRecipe(recipeId: string) {
    const detail = await utils.recipe.byId.fetch({ id: recipeId });
    const totalGrams = detail.nutrition.totalGrams;
    const servingGrams = totalGrams / detail.servings;
    const per100: Record<string, number> = {};
    for (const [key, value] of Object.entries(detail.nutrition.total)) {
      per100[key] = totalGrams > 0 ? (value * 100) / totalGrams : 0;
    }
    addRecipeItem(optionId, {
      id: detail.id,
      name: detail.name,
      per100,
      servingGrams,
    });
  }

  if (!option) return null;

  return (
    <div className="space-y-2 rounded-lg border p-3">
      <div className="flex items-center justify-between gap-2">
        <Input
          className="h-7 w-32 border-none px-1 text-sm font-medium shadow-none"
          value={option.name}
          onChange={(event) => renameOption(optionId, event.target.value)}
          disabled={readOnly}
          aria-label={messages.plans.builder.optionDefaultName(1)}
        />
        <div className="flex items-center gap-2">
          <OptionTotalsBadge optionId={optionId} />
          {canRemove && !readOnly ? (
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              onClick={() => removeOption(optionId)}
              aria-label={messages.plans.builder.removeOption}
            >
              <Trash2 className="text-destructive size-3.5" aria-hidden />
            </Button>
          ) : null}
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={onDragEnd}
      >
        <SortableContext
          items={items.map((item) => item.id)}
          strategy={verticalListSortingStrategy}
        >
          <ul className="space-y-1.5">
            {items.map((item) => (
              <ItemRow key={item.id} item={item} readOnly={readOnly} />
            ))}
          </ul>
        </SortableContext>
      </DndContext>

      {!readOnly ? (
        <div className="grid gap-2 sm:grid-cols-[1fr_14rem]">
          <FoodPicker
            placeholder={messages.plans.builder.addFoodPlaceholder}
            onSelect={(food) => void handleAddFood(food.id)}
            clearOnSelect
          />
          <Select
            value={recipeToAdd}
            onValueChange={(value) => {
              setRecipeToAdd("");
              void handleAddRecipe(value);
            }}
          >
            <SelectTrigger aria-label={messages.plans.builder.addRecipeLabel}>
              <SelectValue
                placeholder={messages.plans.builder.addRecipeLabel}
              />
            </SelectTrigger>
            <SelectContent>
              {(recipesList.data ?? []).map((recipe) => (
                <SelectItem key={recipe.id} value={recipe.id}>
                  {recipe.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}
    </div>
  );
}

export function MealCard({
  mealId,
  readOnly,
}: {
  mealId: string;
  readOnly: boolean;
}) {
  const meal = useBuilder((state) => state.meals[mealId]);
  const optionIds = useBuilder(
    useShallow((state) => state.optionOrderByMeal[mealId] ?? []),
  );
  const updateMeal = useBuilder((state) => state.updateMeal);
  const removeMeal = useBuilder((state) => state.removeMeal);
  const addOption = useBuilder((state) => state.addOption);

  if (!meal) return null;

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
        <div className="flex items-center gap-3">
          <h3 className="font-semibold">
            {meal.customName ?? meal.mealTypeName}
          </h3>
          <Input
            type="time"
            className="h-8 w-28"
            value={meal.scheduledTime ?? ""}
            onChange={(event) =>
              updateMeal(mealId, { scheduledTime: event.target.value || null })
            }
            disabled={readOnly}
            aria-label={messages.plans.builder.mealTimeLabel}
          />
        </div>
        <div className="flex items-center gap-1">
          {!readOnly ? (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => addOption(mealId)}
              >
                <Plus className="size-4" aria-hidden />
                {messages.plans.builder.addOption}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeMeal(mealId)}
                aria-label={messages.plans.builder.removeMeal}
              >
                <Trash2 className="text-destructive size-4" aria-hidden />
              </Button>
            </>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {optionIds.map((optionId) => (
          <OptionSection
            key={optionId}
            optionId={optionId}
            canRemove={optionIds.length > 1}
            readOnly={readOnly}
          />
        ))}
      </CardContent>
    </Card>
  );
}
