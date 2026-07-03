"use client";

import { create } from "zustand";
import type { RouterOutputs } from "@/app/_trpc/client";
import type { PlanChange } from "@/lib/schemas/plan";
import { resolveGrams } from "@/domain/nutrition/quantity";
import { omit } from "@/lib/object";

/**
 * Store do builder (§7.2): estado NORMALIZADO por id (writes O(1)),
 * totais sempre derivados em seletores, e toda mutação local vira um
 * patch na fila (outbox) — o autosave drena a fila em lote.
 */

export type PlanData = RouterOutputs["plan"]["get"];
export type BuilderPlan = PlanData["plan"];
export type BuilderDay = PlanData["days"][number];
export type BuilderMeal = PlanData["meals"][number];
export type BuilderOption = PlanData["options"][number];
export type BuilderItem = PlanData["items"][number];
export type BuilderFood = PlanData["foods"][string];
export type BuilderRecipe = PlanData["recipes"][string];
export type BuilderTarget = PlanData["targets"][number];
export type BuilderUnit = PlanData["units"][number];

export type SaveState = "saved" | "pending" | "saving" | "error";

function byId<T extends { id: string }>(rows: T[]): Record<string, T> {
  return Object.fromEntries(rows.map((row) => [row.id, row]));
}

function sorted<T extends { id: string; sortOrder: number }>(
  rows: T[],
): string[] {
  return [...rows]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((row) => row.id);
}

interface BuilderState {
  loaded: boolean;
  planId: string | null;
  plan: BuilderPlan | null;
  version: number;
  days: Record<string, BuilderDay>;
  dayOrder: string[];
  meals: Record<string, BuilderMeal>;
  mealOrderByDay: Record<string, string[]>;
  options: Record<string, BuilderOption>;
  optionOrderByMeal: Record<string, string[]>;
  items: Record<string, BuilderItem>;
  itemOrderByOption: Record<string, string[]>;
  foods: Record<string, BuilderFood>;
  recipes: Record<string, BuilderRecipe>;
  targets: BuilderTarget[];
  units: BuilderUnit[];
  selectedDayId: string | null;
  queue: PlanChange[];
  saveState: SaveState;

  load(data: PlanData): void;
  reset(): void;

  updatePlanMeta(patch: { name?: string; notes?: string | null }): void;
  addDay(): void;
  updateDay(id: string, patch: { name?: string; weekdays?: number[] }): void;
  removeDay(id: string): void;
  selectDay(id: string): void;

  addMeal(mealType: {
    id: string;
    name: string;
    defaultTime: string | null;
  }): void;
  updateMeal(
    id: string,
    patch: { scheduledTime?: string | null; customName?: string | null },
  ): void;
  removeMeal(id: string): void;
  reorderMeals(dayId: string, mealIds: string[]): void;

  addOption(mealId: string): void;
  renameOption(id: string, name: string): void;
  removeOption(id: string): void;

  addFoodItem(optionId: string, food: BuilderFood & { id: string }): void;
  addRecipeItem(optionId: string, recipe: BuilderRecipe & { id: string }): void;
  updateItemQuantity(id: string, quantity: number): void;
  updateItemSelection(
    id: string,
    selection: {
      measurementUnitId: string | null;
      foodMeasureId: string | null;
    },
  ): void;
  removeItem(id: string): void;
  reorderItems(optionId: string, itemIds: string[]): void;

  setTarget(
    nutrient: {
      id: string;
      key: string;
      name: string;
      unit: string;
      decimals: number;
    },
    min: number | null,
    max: number | null,
  ): void;
  removeTarget(nutrientId: string): void;

  takeQueue(): PlanChange[];
  restoreQueue(changes: PlanChange[]): void;
  markSaving(): void;
  markSaved(version: number): void;
  markError(): void;
}

/** Recalcula gramas localmente com o MESMO motor do servidor. */
function localGrams(
  state: Pick<BuilderState, "foods" | "recipes" | "units">,
  item: Pick<
    BuilderItem,
    "foodId" | "recipeId" | "quantity" | "measurementUnitId" | "foodMeasureId"
  >,
): number {
  try {
    if (item.recipeId) {
      const recipe = state.recipes[item.recipeId];
      return recipe ? item.quantity * recipe.servingGrams : 0;
    }
    const food = item.foodId ? state.foods[item.foodId] : undefined;
    if (!food) return 0;
    let measureGramWeight: number | undefined;
    if (item.foodMeasureId) {
      measureGramWeight = food.measures.find(
        (measure) => measure.id === item.foodMeasureId,
      )?.gramWeight;
      if (measureGramWeight === undefined) return 0;
    }
    let unit:
      | { type: "mass" | "volume" | "unit"; gramsPerUnit: number | null }
      | undefined;
    if (item.measurementUnitId) {
      const found = state.units.find(
        (candidate) => candidate.id === item.measurementUnitId,
      );
      if (!found) return 0;
      unit = { type: found.type, gramsPerUnit: found.gramsPerUnit };
    }
    return resolveGrams(item.quantity, { measureGramWeight, unit });
  } catch {
    return 0;
  }
}

const initial = {
  loaded: false,
  planId: null,
  plan: null,
  version: 1,
  days: {},
  dayOrder: [],
  meals: {},
  mealOrderByDay: {},
  options: {},
  optionOrderByMeal: {},
  items: {},
  itemOrderByOption: {},
  foods: {},
  recipes: {},
  targets: [],
  units: [],
  selectedDayId: null,
  queue: [],
  saveState: "saved" as SaveState,
};

export const useBuilder = create<BuilderState>((set, get) => ({
  ...initial,

  load(data) {
    const mealOrderByDay: Record<string, string[]> = {};
    for (const day of data.days) {
      mealOrderByDay[day.id] = sorted(
        data.meals.filter((meal) => meal.dayId === day.id),
      );
    }
    const optionOrderByMeal: Record<string, string[]> = {};
    for (const meal of data.meals) {
      optionOrderByMeal[meal.id] = sorted(
        data.options.filter((option) => option.mealId === meal.id),
      );
    }
    const itemOrderByOption: Record<string, string[]> = {};
    for (const option of data.options) {
      itemOrderByOption[option.id] = sorted(
        data.items.filter((item) => item.optionId === option.id),
      );
    }
    const dayOrder = sorted(data.days);
    set({
      loaded: true,
      planId: data.plan.id,
      plan: data.plan,
      version: data.plan.version,
      days: byId(data.days),
      dayOrder,
      meals: byId(data.meals),
      mealOrderByDay,
      options: byId(data.options),
      optionOrderByMeal,
      items: byId(data.items),
      itemOrderByOption,
      foods: data.foods,
      recipes: data.recipes,
      targets: data.targets,
      units: data.units,
      selectedDayId: get().selectedDayId ?? dayOrder[0] ?? null,
      queue: [],
      saveState: "saved",
    });
  },

  reset() {
    set({ ...initial });
  },

  updatePlanMeta(patch) {
    const plan = get().plan;
    if (!plan) return;
    set({
      plan: { ...plan, ...patch },
      queue: [...get().queue, { type: "plan_update", ...patch }],
      saveState: "pending",
    });
  },

  addDay() {
    const id = crypto.randomUUID();
    const state = get();
    const name = `Dia ${state.dayOrder.length + 1}`;
    const day: BuilderDay = {
      id,
      name,
      weekdays: [],
      sortOrder: state.dayOrder.length,
    };
    set({
      days: { ...state.days, [id]: day },
      dayOrder: [...state.dayOrder, id],
      mealOrderByDay: { ...state.mealOrderByDay, [id]: [] },
      selectedDayId: id,
      queue: [
        ...state.queue,
        { type: "day_add", id, name, weekdays: [], sortOrder: day.sortOrder },
      ],
      saveState: "pending",
    });
  },

  updateDay(id, patch) {
    const state = get();
    const day = state.days[id];
    if (!day) return;
    set({
      days: { ...state.days, [id]: { ...day, ...patch } },
      queue: [...state.queue, { type: "day_update", id, ...patch }],
      saveState: "pending",
    });
  },

  removeDay(id) {
    const state = get();
    if (state.dayOrder.length <= 1) return;
    const days = omit(state.days, id);
    const dayOrder = state.dayOrder.filter((dayId) => dayId !== id);
    set({
      days,
      dayOrder,
      selectedDayId:
        state.selectedDayId === id
          ? (dayOrder[0] ?? null)
          : state.selectedDayId,
      queue: [...state.queue, { type: "day_remove", id }],
      saveState: "pending",
    });
  },

  selectDay(id) {
    set({ selectedDayId: id });
  },

  addMeal(mealType) {
    const state = get();
    const dayId = state.selectedDayId;
    if (!dayId) return;
    const id = crypto.randomUUID();
    const optionId = crypto.randomUUID();
    const order = state.mealOrderByDay[dayId] ?? [];
    const meal: BuilderMeal = {
      id,
      dayId,
      mealTypeId: mealType.id,
      mealTypeName: mealType.name,
      customName: null,
      scheduledTime: mealType.defaultTime,
      notes: null,
      sortOrder: order.length,
    };
    const option: BuilderOption = {
      id: optionId,
      mealId: id,
      name: "Opção 1",
      sortOrder: 0,
    };
    set({
      meals: { ...state.meals, [id]: meal },
      mealOrderByDay: { ...state.mealOrderByDay, [dayId]: [...order, id] },
      options: { ...state.options, [optionId]: option },
      optionOrderByMeal: { ...state.optionOrderByMeal, [id]: [optionId] },
      itemOrderByOption: { ...state.itemOrderByOption, [optionId]: [] },
      queue: [
        ...state.queue,
        {
          type: "meal_add",
          id,
          dayId,
          mealTypeId: mealType.id,
          scheduledTime: mealType.defaultTime,
          sortOrder: meal.sortOrder,
        },
      ],
      saveState: "pending",
    });
  },

  updateMeal(id, patch) {
    const state = get();
    const meal = state.meals[id];
    if (!meal) return;
    set({
      meals: { ...state.meals, [id]: { ...meal, ...patch } },
      queue: [...state.queue, { type: "meal_update", id, ...patch }],
      saveState: "pending",
    });
  },

  removeMeal(id) {
    const state = get();
    const meal = state.meals[id];
    if (!meal) return;
    const meals = omit(state.meals, id);
    set({
      meals,
      mealOrderByDay: {
        ...state.mealOrderByDay,
        [meal.dayId]: (state.mealOrderByDay[meal.dayId] ?? []).filter(
          (mealId) => mealId !== id,
        ),
      },
      queue: [...state.queue, { type: "meal_remove", id }],
      saveState: "pending",
    });
  },

  reorderMeals(dayId, mealIds) {
    const state = get();
    set({
      mealOrderByDay: { ...state.mealOrderByDay, [dayId]: mealIds },
      queue: [...state.queue, { type: "meals_reorder", dayId, mealIds }],
      saveState: "pending",
    });
  },

  addOption(mealId) {
    const state = get();
    const order = state.optionOrderByMeal[mealId] ?? [];
    const id = crypto.randomUUID();
    const name = `Opção ${order.length + 1}`;
    const option: BuilderOption = { id, mealId, name, sortOrder: order.length };
    set({
      options: { ...state.options, [id]: option },
      optionOrderByMeal: {
        ...state.optionOrderByMeal,
        [mealId]: [...order, id],
      },
      itemOrderByOption: { ...state.itemOrderByOption, [id]: [] },
      queue: [
        ...state.queue,
        { type: "option_add", id, mealId, name, sortOrder: option.sortOrder },
      ],
      saveState: "pending",
    });
  },

  renameOption(id, name) {
    const state = get();
    const option = state.options[id];
    if (!option) return;
    set({
      options: { ...state.options, [id]: { ...option, name } },
      queue: [...state.queue, { type: "option_update", id, name }],
      saveState: "pending",
    });
  },

  removeOption(id) {
    const state = get();
    const option = state.options[id];
    if (!option) return;
    const order = state.optionOrderByMeal[option.mealId] ?? [];
    if (order.length <= 1) return;
    const options = omit(state.options, id);
    set({
      options,
      optionOrderByMeal: {
        ...state.optionOrderByMeal,
        [option.mealId]: order.filter((optionId) => optionId !== id),
      },
      queue: [...state.queue, { type: "option_remove", id }],
      saveState: "pending",
    });
  },

  addFoodItem(optionId, food) {
    const state = get();
    const id = crypto.randomUUID();
    const order = state.itemOrderByOption[optionId] ?? [];
    const firstMeasure = food.measures[0];
    const gramUnit = state.units.find((unit) => unit.key === "g");
    const item: BuilderItem = {
      id,
      optionId,
      foodId: food.id,
      recipeId: null,
      quantity: firstMeasure ? 1 : 100,
      measurementUnitId: firstMeasure ? null : (gramUnit?.id ?? null),
      foodMeasureId: firstMeasure ? firstMeasure.id : null,
      resolvedGrams: 0,
      sortOrder: order.length,
      notes: null,
    };
    const foods = { ...state.foods, [food.id]: food };
    item.resolvedGrams = localGrams({ ...state, foods }, item);
    set({
      foods,
      items: { ...state.items, [id]: item },
      itemOrderByOption: {
        ...state.itemOrderByOption,
        [optionId]: [...order, id],
      },
      queue: [
        ...state.queue,
        {
          type: "item_add",
          id,
          optionId,
          foodId: food.id,
          recipeId: null,
          quantity: item.quantity,
          measurementUnitId: item.measurementUnitId,
          foodMeasureId: item.foodMeasureId,
          sortOrder: item.sortOrder,
          notes: null,
        },
      ],
      saveState: "pending",
    });
  },

  addRecipeItem(optionId, recipe) {
    const state = get();
    const id = crypto.randomUUID();
    const order = state.itemOrderByOption[optionId] ?? [];
    const item: BuilderItem = {
      id,
      optionId,
      foodId: null,
      recipeId: recipe.id,
      quantity: 1,
      measurementUnitId: null,
      foodMeasureId: null,
      resolvedGrams: recipe.servingGrams,
      sortOrder: order.length,
      notes: null,
    };
    set({
      recipes: { ...state.recipes, [recipe.id]: recipe },
      items: { ...state.items, [id]: item },
      itemOrderByOption: {
        ...state.itemOrderByOption,
        [optionId]: [...order, id],
      },
      queue: [
        ...state.queue,
        {
          type: "item_add",
          id,
          optionId,
          foodId: null,
          recipeId: recipe.id,
          quantity: 1,
          measurementUnitId: null,
          foodMeasureId: null,
          sortOrder: item.sortOrder,
          notes: null,
        },
      ],
      saveState: "pending",
    });
  },

  updateItemQuantity(id, quantity) {
    const state = get();
    const item = state.items[id];
    if (!item || quantity <= 0) return;
    const updated = { ...item, quantity };
    updated.resolvedGrams = localGrams(state, updated);
    set({
      items: { ...state.items, [id]: updated },
      queue: [...state.queue, { type: "item_update", id, quantity }],
      saveState: "pending",
    });
  },

  updateItemSelection(id, selection) {
    const state = get();
    const item = state.items[id];
    if (!item) return;
    const updated = { ...item, ...selection };
    updated.resolvedGrams = localGrams(state, updated);
    set({
      items: { ...state.items, [id]: updated },
      queue: [...state.queue, { type: "item_update", id, ...selection }],
      saveState: "pending",
    });
  },

  removeItem(id) {
    const state = get();
    const item = state.items[id];
    if (!item) return;
    const items = omit(state.items, id);
    set({
      items,
      itemOrderByOption: {
        ...state.itemOrderByOption,
        [item.optionId]: (state.itemOrderByOption[item.optionId] ?? []).filter(
          (itemId) => itemId !== id,
        ),
      },
      queue: [...state.queue, { type: "item_remove", id }],
      saveState: "pending",
    });
  },

  reorderItems(optionId, itemIds) {
    const state = get();
    set({
      itemOrderByOption: { ...state.itemOrderByOption, [optionId]: itemIds },
      queue: [...state.queue, { type: "items_reorder", optionId, itemIds }],
      saveState: "pending",
    });
  },

  setTarget(nutrient, min, max) {
    const state = get();
    const existing = state.targets.filter(
      (target) => target.nutrientId !== nutrient.id,
    );
    set({
      targets: [
        ...existing,
        {
          nutrientId: nutrient.id,
          key: nutrient.key,
          name: nutrient.name,
          unit: nutrient.unit,
          decimals: nutrient.decimals,
          min,
          max,
        },
      ],
      queue: [
        ...state.queue,
        { type: "target_set", nutrientId: nutrient.id, min, max },
      ],
      saveState: "pending",
    });
  },

  removeTarget(nutrientId) {
    const state = get();
    set({
      targets: state.targets.filter(
        (target) => target.nutrientId !== nutrientId,
      ),
      queue: [...state.queue, { type: "target_remove", nutrientId }],
      saveState: "pending",
    });
  },

  takeQueue() {
    const queue = get().queue;
    set({ queue: [] });
    return queue;
  },

  restoreQueue(changes) {
    set({ queue: [...changes, ...get().queue], saveState: "error" });
  },

  markSaving() {
    set({ saveState: "saving" });
  },

  markSaved(version) {
    set({ version, saveState: get().queue.length > 0 ? "pending" : "saved" });
  },

  markError() {
    set({ saveState: "error" });
  },
}));
