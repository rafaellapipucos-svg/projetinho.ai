import "server-only";
import { prisma, type Db } from "@/server/db";
import { planRepo } from "@/server/repositories/plan-repo";
import { foodRepo } from "@/server/repositories/food-repo";
import { recipeRepo } from "@/server/repositories/recipe-repo";
import { catalogRepo } from "@/server/repositories/catalog-repo";
import { patientRepo } from "@/server/repositories/patient-repo";
import { ConflictError, NotFoundError } from "@/server/errors";
import { DomainError } from "@/domain/shared/errors";
import type { NutrientVector } from "@/domain/shared/types";
import { resolveGrams } from "@/domain/nutrition/quantity";
import { recipeNutrition } from "@/domain/nutrition/recipe";
import { dayTotals, type CalcDay } from "@/domain/nutrition/plan";
import { messages } from "@/messages/pt-br";
import type {
  PlanApplyChangesInput,
  PlanCreateInput,
} from "@/lib/schemas/plan";

type PlanGraph = NonNullable<Awaited<ReturnType<typeof planRepo.loadGraph>>>;

interface FoodData {
  name: string;
  baseUnit: "g" | "ml";
  per100: NutrientVector;
  measures: Array<{ id: string; name: string; gramWeight: number }>;
}

interface RecipeData {
  name: string;
  per100: NutrientVector;
  servingGrams: number;
}

function vec(
  nutrients: Array<{ nutrient: { key: string }; amount: unknown }>,
): NutrientVector {
  const vector: NutrientVector = {};
  for (const row of nutrients) vector[row.nutrient.key] = Number(row.amount);
  return vector;
}

function recipeCalc(recipe: {
  name: string;
  servings: unknown;
  yieldGrams: unknown;
  ingredients: Array<{
    resolvedGrams: unknown;
    food: { nutrients: Array<{ nutrient: { key: string }; amount: unknown }> };
  }>;
}): RecipeData {
  const servings = Number(recipe.servings);
  const nutrition = recipeNutrition(
    recipe.ingredients.map((ingredient) => ({
      per100: vec(ingredient.food.nutrients),
      resolvedGrams: Number(ingredient.resolvedGrams),
    })),
    {
      servings,
      yieldGrams: recipe.yieldGrams === null ? null : Number(recipe.yieldGrams),
    },
  );
  if (nutrition.totalGrams <= 0) {
    throw new DomainError(messages.plans.recipeWithoutIngredients);
  }
  return {
    name: recipe.name,
    per100: nutrition.per100,
    servingGrams: nutrition.totalGrams / servings,
  };
}

function collectGraphRefIds(graph: PlanGraph) {
  const foodIds = new Set<string>();
  const recipeIds = new Set<string>();
  for (const day of graph.days) {
    for (const meal of day.meals) {
      for (const option of meal.options) {
        for (const item of option.items) {
          if (item.foodId) foodIds.add(item.foodId);
          if (item.recipeId) recipeIds.add(item.recipeId);
        }
      }
    }
  }
  return { foodIds: [...foodIds], recipeIds: [...recipeIds] };
}

async function buildRefMaps(
  db: Db,
  organizationId: string,
  foodIds: string[],
  recipeIds: string[],
) {
  const [foods, recipes] = await Promise.all([
    foodRepo.findVisibleByIdsWithMeasures(db, organizationId, foodIds),
    recipeRepo.findByIdsForCalc(db, organizationId, recipeIds),
  ]);
  const foodMap = new Map<string, FoodData>(
    foods.map((food) => [
      food.id,
      {
        name: food.name,
        baseUnit: food.baseUnit,
        per100: vec(food.nutrients),
        measures: food.measures.map((measure) => ({
          id: measure.id,
          name: measure.name,
          gramWeight: Number(measure.gramWeight),
        })),
      },
    ]),
  );
  const recipeMap = new Map<string, RecipeData>(
    recipes.map((recipe) => [recipe.id, recipeCalc(recipe)]),
  );
  return { foodMap, recipeMap };
}

function graphDayTotals(
  graph: PlanGraph,
  foodMap: Map<string, FoodData>,
  recipeMap: Map<string, RecipeData>,
): Record<string, NutrientVector> {
  const totals: Record<string, NutrientVector> = {};
  for (const day of graph.days) {
    const calcDay: CalcDay = {
      id: day.id,
      meals: day.meals.map((meal) => ({
        id: meal.id,
        options: meal.options.map((option) => ({
          id: option.id,
          items: option.items.map((item) => ({
            per100: item.foodId
              ? (foodMap.get(item.foodId)?.per100 ?? {})
              : (recipeMap.get(item.recipeId ?? "")?.per100 ?? {}),
            resolvedGrams: Number(item.resolvedGrams),
          })),
        })),
      })),
    };
    totals[day.id] = dayTotals(calcDay);
  }
  return totals;
}

/** Clona a estrutura completa de um plano (base de templates). */
async function clonePlan(
  db: Db,
  organizationId: string,
  userId: string,
  sourceId: string,
  overrides: { name: string; patientId: string | null; isTemplate: boolean },
) {
  const source = await planRepo.loadGraph(db, organizationId, sourceId);
  if (!source) throw new NotFoundError(messages.errors.notFound);

  const plan = await planRepo.create(db, {
    organizationId,
    patientId: overrides.patientId,
    name: overrides.name,
    isTemplate: overrides.isTemplate,
    createdBy: userId,
  });

  for (const day of source.days) {
    const dayId = crypto.randomUUID();
    await planRepo.createDay(db, {
      id: dayId,
      mealPlanId: plan.id,
      name: day.name,
      weekdays: day.weekdays,
      sortOrder: day.sortOrder,
    });
    for (const meal of day.meals) {
      const mealId = crypto.randomUUID();
      await planRepo.createMeal(db, {
        id: mealId,
        planDayId: dayId,
        mealTypeId: meal.mealTypeId,
        scheduledTime: meal.scheduledTime,
        sortOrder: meal.sortOrder,
      });
      if (meal.customName || meal.notes) {
        await planRepo.updateMeal(db, plan.id, mealId, {
          customName: meal.customName,
          notes: meal.notes,
        });
      }
      for (const option of meal.options) {
        const optionId = crypto.randomUUID();
        await planRepo.createOption(db, {
          id: optionId,
          planMealId: mealId,
          name: option.name,
          sortOrder: option.sortOrder,
        });
        for (const item of option.items) {
          await planRepo.createItem(db, {
            id: crypto.randomUUID(),
            mealOptionId: optionId,
            foodId: item.foodId,
            recipeId: item.recipeId,
            quantity: Number(item.quantity),
            measurementUnitId: item.measurementUnitId,
            foodMeasureId: item.foodMeasureId,
            resolvedGrams: Number(item.resolvedGrams),
            sortOrder: item.sortOrder,
            notes: item.notes,
          });
        }
      }
    }
  }
  for (const target of source.targets) {
    await planRepo.upsertTarget(db, plan.id, target.nutrientId, {
      targetMin: target.targetMin === null ? null : Number(target.targetMin),
      targetMax: target.targetMax === null ? null : Number(target.targetMax),
    });
  }
  return plan;
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "P2002"
  );
}

export const planService = {
  async create(organizationId: string, userId: string, input: PlanCreateInput) {
    if (input.patientId) {
      const patient = await patientRepo.findByIdForOrg(
        prisma,
        organizationId,
        input.patientId,
      );
      if (!patient) throw new NotFoundError(messages.errors.notFound);
    }

    return prisma.$transaction(
      async (tx) => {
        if (input.fromTemplateId) {
          const plan = await clonePlan(
            tx,
            organizationId,
            userId,
            input.fromTemplateId,
            {
              name: input.name,
              patientId: input.patientId,
              isTemplate: input.isTemplate,
            },
          );
          return { id: plan.id };
        }

        const plan = await planRepo.create(tx, {
          organizationId,
          patientId: input.patientId,
          name: input.name,
          isTemplate: input.isTemplate,
          createdBy: userId,
        });
        const dayId = crypto.randomUUID();
        await planRepo.createDay(tx, {
          id: dayId,
          mealPlanId: plan.id,
          name: messages.plans.builder.dayDefaultName(1),
          weekdays: [],
          sortOrder: 0,
        });
        const mealTypes = (
          await catalogRepo.listMealTypes(tx, organizationId)
        ).filter((mealType) => mealType.defaultTime !== null);
        let sortOrder = 0;
        for (const mealType of mealTypes) {
          const mealId = crypto.randomUUID();
          await planRepo.createMeal(tx, {
            id: mealId,
            planDayId: dayId,
            mealTypeId: mealType.id,
            scheduledTime: mealType.defaultTime,
            sortOrder,
          });
          await planRepo.createOption(tx, {
            id: crypto.randomUUID(),
            planMealId: mealId,
            name: messages.plans.builder.optionDefaultName(1),
            sortOrder: 0,
          });
          sortOrder += 1;
        }
        return { id: plan.id };
      },
      { timeout: 60_000 },
    );
  },

  async get(organizationId: string, planId: string) {
    const graph = await planRepo.loadGraph(prisma, organizationId, planId);
    if (!graph) throw new NotFoundError(messages.errors.notFound);

    const { foodIds, recipeIds } = collectGraphRefIds(graph);
    const { foodMap, recipeMap } = await buildRefMaps(
      prisma,
      organizationId,
      foodIds,
      recipeIds,
    );
    const units = await catalogRepo.listMeasurementUnits(prisma);

    return {
      plan: {
        id: graph.id,
        name: graph.name,
        status: graph.status,
        isTemplate: graph.isTemplate,
        patientId: graph.patientId,
        patientName: graph.patient?.name ?? null,
        notes: graph.notes,
        startDate: graph.startDate
          ? graph.startDate.toISOString().slice(0, 10)
          : null,
        endDate: graph.endDate
          ? graph.endDate.toISOString().slice(0, 10)
          : null,
        version: graph.version,
      },
      days: graph.days.map((day) => ({
        id: day.id,
        name: day.name,
        weekdays: day.weekdays,
        sortOrder: day.sortOrder,
      })),
      meals: graph.days.flatMap((day) =>
        day.meals.map((meal) => ({
          id: meal.id,
          dayId: day.id,
          mealTypeId: meal.mealTypeId,
          mealTypeName: meal.mealType.name,
          customName: meal.customName,
          scheduledTime: meal.scheduledTime,
          notes: meal.notes,
          sortOrder: meal.sortOrder,
        })),
      ),
      options: graph.days.flatMap((day) =>
        day.meals.flatMap((meal) =>
          meal.options.map((option) => ({
            id: option.id,
            mealId: meal.id,
            name: option.name,
            sortOrder: option.sortOrder,
          })),
        ),
      ),
      items: graph.days.flatMap((day) =>
        day.meals.flatMap((meal) =>
          meal.options.flatMap((option) =>
            option.items.map((item) => ({
              id: item.id,
              optionId: option.id,
              foodId: item.foodId,
              recipeId: item.recipeId,
              quantity: Number(item.quantity),
              measurementUnitId: item.measurementUnitId,
              foodMeasureId: item.foodMeasureId,
              resolvedGrams: Number(item.resolvedGrams),
              sortOrder: item.sortOrder,
              notes: item.notes,
            })),
          ),
        ),
      ),
      foods: Object.fromEntries(foodMap),
      recipes: Object.fromEntries(recipeMap),
      targets: graph.targets.map((target) => ({
        nutrientId: target.nutrientId,
        key: target.nutrient.key,
        name: target.nutrient.name,
        unit: target.nutrient.unit,
        decimals: target.nutrient.decimals,
        min: target.targetMin === null ? null : Number(target.targetMin),
        max: target.targetMax === null ? null : Number(target.targetMax),
      })),
      units: units.map((unit) => ({
        id: unit.id,
        key: unit.key,
        name: unit.name,
        abbreviation: unit.abbreviation,
        type: unit.type,
        gramsPerUnit:
          unit.gramsPerUnit === null ? null : Number(unit.gramsPerUnit),
      })),
    };
  },

  async applyChanges(organizationId: string, input: PlanApplyChangesInput) {
    return prisma.$transaction(
      async (tx) => {
        const plan = await planRepo.findForOrg(
          tx,
          organizationId,
          input.planId,
        );
        if (!plan) throw new NotFoundError(messages.errors.notFound);
        if (plan.status === "archived") {
          throw new ConflictError(messages.plans.archivedReadOnly);
        }
        if (plan.version !== input.version) {
          throw new ConflictError(messages.plans.conflict);
        }

        // Caches preguiçosos de referências (validação + resolução de gramas)
        const foodCache = new Map<string, FoodData | null>();
        const recipeCache = new Map<string, RecipeData | null>();
        const unitCache = new Map<
          string,
          {
            type: "mass" | "volume" | "unit";
            gramsPerUnit: number | null;
          } | null
        >();

        const getFood = async (id: string) => {
          if (!foodCache.has(id)) {
            const [food] = await foodRepo.findVisibleByIdsWithMeasures(
              tx,
              organizationId,
              [id],
            );
            foodCache.set(
              id,
              food
                ? {
                    name: food.name,
                    baseUnit: food.baseUnit,
                    per100: vec(food.nutrients),
                    measures: food.measures.map((measure) => ({
                      id: measure.id,
                      name: measure.name,
                      gramWeight: Number(measure.gramWeight),
                    })),
                  }
                : null,
            );
          }
          return foodCache.get(id) ?? null;
        };
        const getRecipe = async (id: string) => {
          if (!recipeCache.has(id)) {
            const [recipe] = await recipeRepo.findByIdsForCalc(
              tx,
              organizationId,
              [id],
            );
            recipeCache.set(id, recipe ? recipeCalc(recipe) : null);
          }
          return recipeCache.get(id) ?? null;
        };
        const getUnit = async (id: string) => {
          if (!unitCache.has(id)) {
            const [unit] = await catalogRepo.findMeasurementUnitsByIds(tx, [
              id,
            ]);
            unitCache.set(
              id,
              unit
                ? {
                    type: unit.type,
                    gramsPerUnit:
                      unit.gramsPerUnit === null
                        ? null
                        : Number(unit.gramsPerUnit),
                  }
                : null,
            );
          }
          return unitCache.get(id) ?? null;
        };

        const computeGrams = async (ref: {
          foodId: string | null;
          recipeId: string | null;
          quantity: number;
          measurementUnitId: string | null;
          foodMeasureId: string | null;
        }): Promise<number> => {
          if (ref.recipeId) {
            const recipe = await getRecipe(ref.recipeId);
            if (!recipe) throw new NotFoundError(messages.errors.notFound);
            return ref.quantity * recipe.servingGrams;
          }
          const food = ref.foodId ? await getFood(ref.foodId) : null;
          if (!food) throw new NotFoundError(messages.errors.notFound);
          let measureGramWeight: number | undefined;
          if (ref.foodMeasureId) {
            const measure = food.measures.find(
              (candidate) => candidate.id === ref.foodMeasureId,
            );
            if (!measure)
              throw new DomainError(messages.recipes.invalidMeasure);
            measureGramWeight = measure.gramWeight;
          }
          let unitRef:
            | { type: "mass" | "volume" | "unit"; gramsPerUnit: number | null }
            | undefined;
          if (ref.measurementUnitId) {
            const unit = await getUnit(ref.measurementUnitId);
            if (!unit) throw new NotFoundError(messages.errors.notFound);
            unitRef = unit;
          }
          return resolveGrams(ref.quantity, {
            measureGramWeight,
            unit: unitRef,
          });
        };

        const assertFound = (count: number) => {
          if (count === 0) throw new NotFoundError(messages.errors.notFound);
        };

        for (const change of input.changes) {
          switch (change.type) {
            case "plan_update": {
              await planRepo.updateMeta(tx, organizationId, plan.id, {
                name: change.name,
                notes: change.notes,
                startDate:
                  change.startDate === undefined
                    ? undefined
                    : change.startDate === null
                      ? null
                      : new Date(`${change.startDate}T00:00:00Z`),
                endDate:
                  change.endDate === undefined
                    ? undefined
                    : change.endDate === null
                      ? null
                      : new Date(`${change.endDate}T00:00:00Z`),
              });
              break;
            }
            case "day_add": {
              try {
                await planRepo.createDay(tx, {
                  id: change.id,
                  mealPlanId: plan.id,
                  name: change.name,
                  weekdays: change.weekdays,
                  sortOrder: change.sortOrder,
                });
              } catch (error) {
                if (!isUniqueViolation(error)) throw error; // replay idempotente
              }
              break;
            }
            case "day_update": {
              const result = await planRepo.updateDay(tx, plan.id, change.id, {
                name: change.name,
                weekdays: change.weekdays,
                sortOrder: change.sortOrder,
              });
              assertFound(result.count);
              break;
            }
            case "day_remove": {
              await planRepo.deleteDay(tx, plan.id, change.id);
              break;
            }
            case "meal_add": {
              const day = await planRepo.findDay(tx, plan.id, change.dayId);
              if (!day) throw new NotFoundError(messages.errors.notFound);
              try {
                await planRepo.createMeal(tx, {
                  id: change.id,
                  planDayId: change.dayId,
                  mealTypeId: change.mealTypeId,
                  scheduledTime: change.scheduledTime,
                  sortOrder: change.sortOrder,
                });
                await planRepo.createOption(tx, {
                  id: crypto.randomUUID(),
                  planMealId: change.id,
                  name: messages.plans.builder.optionDefaultName(1),
                  sortOrder: 0,
                });
              } catch (error) {
                if (!isUniqueViolation(error)) throw error;
              }
              break;
            }
            case "meal_update": {
              const result = await planRepo.updateMeal(tx, plan.id, change.id, {
                mealTypeId: change.mealTypeId,
                customName: change.customName,
                scheduledTime: change.scheduledTime,
                notes: change.notes,
                sortOrder: change.sortOrder,
              });
              assertFound(result.count);
              break;
            }
            case "meal_remove": {
              await planRepo.deleteMeal(tx, plan.id, change.id);
              break;
            }
            case "meals_reorder": {
              for (const [index, mealId] of change.mealIds.entries()) {
                await planRepo.updateMeal(tx, plan.id, mealId, {
                  sortOrder: index,
                });
              }
              break;
            }
            case "option_add": {
              const meal = await planRepo.findMeal(tx, plan.id, change.mealId);
              if (!meal) throw new NotFoundError(messages.errors.notFound);
              try {
                await planRepo.createOption(tx, {
                  id: change.id,
                  planMealId: change.mealId,
                  name: change.name,
                  sortOrder: change.sortOrder,
                });
              } catch (error) {
                if (!isUniqueViolation(error)) throw error;
              }
              break;
            }
            case "option_update": {
              const result = await planRepo.updateOption(
                tx,
                plan.id,
                change.id,
                {
                  name: change.name,
                  sortOrder: change.sortOrder,
                },
              );
              assertFound(result.count);
              break;
            }
            case "option_remove": {
              await planRepo.deleteOption(tx, plan.id, change.id);
              break;
            }
            case "item_add": {
              const option = await planRepo.findOption(
                tx,
                plan.id,
                change.optionId,
              );
              if (!option) throw new NotFoundError(messages.errors.notFound);
              const resolvedGrams = await computeGrams(change);
              try {
                await planRepo.createItem(tx, {
                  id: change.id,
                  mealOptionId: change.optionId,
                  foodId: change.foodId,
                  recipeId: change.recipeId,
                  quantity: change.quantity,
                  measurementUnitId: change.measurementUnitId,
                  foodMeasureId: change.foodMeasureId,
                  resolvedGrams,
                  sortOrder: change.sortOrder,
                  notes: change.notes,
                });
              } catch (error) {
                if (!isUniqueViolation(error)) throw error;
              }
              break;
            }
            case "item_update": {
              const current = await planRepo.findItem(tx, plan.id, change.id);
              if (!current) throw new NotFoundError(messages.errors.notFound);
              if (change.optionId) {
                const option = await planRepo.findOption(
                  tx,
                  plan.id,
                  change.optionId,
                );
                if (!option) throw new NotFoundError(messages.errors.notFound);
              }
              const merged = {
                foodId: current.foodId,
                recipeId: current.recipeId,
                quantity: change.quantity ?? Number(current.quantity),
                measurementUnitId:
                  change.measurementUnitId === undefined
                    ? current.measurementUnitId
                    : change.measurementUnitId,
                foodMeasureId:
                  change.foodMeasureId === undefined
                    ? current.foodMeasureId
                    : change.foodMeasureId,
              };
              const resolvedGrams = await computeGrams(merged);
              await planRepo.updateItem(tx, plan.id, change.id, {
                mealOptionId: change.optionId,
                quantity: merged.quantity,
                measurementUnitId: merged.measurementUnitId,
                foodMeasureId: merged.foodMeasureId,
                resolvedGrams,
                sortOrder: change.sortOrder,
                notes: change.notes,
              });
              break;
            }
            case "item_remove": {
              await planRepo.deleteItem(tx, plan.id, change.id);
              break;
            }
            case "items_reorder": {
              for (const [index, itemId] of change.itemIds.entries()) {
                await planRepo.updateItem(tx, plan.id, itemId, {
                  sortOrder: index,
                });
              }
              break;
            }
            case "target_set": {
              const [nutrient] = await catalogRepo.findNutrientsByIds(tx, [
                change.nutrientId,
              ]);
              if (!nutrient) throw new NotFoundError(messages.errors.notFound);
              await planRepo.upsertTarget(tx, plan.id, change.nutrientId, {
                targetMin: change.min,
                targetMax: change.max,
              });
              break;
            }
            case "target_remove": {
              await planRepo.deleteTarget(tx, plan.id, change.nutrientId);
              break;
            }
          }
        }

        const newVersion = plan.version + 1;
        await planRepo.setVersion(tx, plan.id, newVersion);

        // Totais autoritativos com o MESMO motor do cliente (§7.2)
        const graph = await planRepo.loadGraph(tx, organizationId, plan.id);
        if (!graph) throw new NotFoundError(messages.errors.notFound);
        const { foodIds, recipeIds } = collectGraphRefIds(graph);
        const { foodMap, recipeMap } = await buildRefMaps(
          tx,
          organizationId,
          foodIds,
          recipeIds,
        );
        return {
          version: newVersion,
          dayTotals: graphDayTotals(graph, foodMap, recipeMap),
        };
      },
      { timeout: 60_000 },
    );
  },

  async activate(organizationId: string, planId: string) {
    return prisma.$transaction(
      async (tx) => {
        const graph = await planRepo.loadGraph(tx, organizationId, planId);
        if (!graph) throw new NotFoundError(messages.errors.notFound);
        if (graph.isTemplate || !graph.patientId) {
          throw new DomainError(messages.plans.templateXorPatient);
        }
        const { foodIds, recipeIds } = collectGraphRefIds(graph);
        const { foodMap, recipeMap } = await buildRefMaps(
          tx,
          organizationId,
          foodIds,
          recipeIds,
        );
        const totals = graphDayTotals(graph, foodMap, recipeMap);

        // Regra do Snapshot (§3.3): congela totais e metas da época da ativação
        const snapshot = {
          generatedAt: new Date().toISOString(),
          days: graph.days.map((day) => ({
            id: day.id,
            name: day.name,
            totals: totals[day.id] ?? {},
          })),
          targets: graph.targets.map((target) => ({
            key: target.nutrient.key,
            min: target.targetMin === null ? null : Number(target.targetMin),
            max: target.targetMax === null ? null : Number(target.targetMax),
          })),
        };

        await planRepo.archiveActiveOfPatient(
          tx,
          organizationId,
          graph.patientId,
          planId,
        );
        await planRepo.setStatus(tx, planId, {
          status: "active",
          nutritionalSnapshot: snapshot,
          version: graph.version + 1,
        });
        return { version: graph.version + 1 };
      },
      { timeout: 60_000 },
    );
  },

  async archive(organizationId: string, planId: string) {
    const plan = await planRepo.findForOrg(prisma, organizationId, planId);
    if (!plan) throw new NotFoundError(messages.errors.notFound);
    await planRepo.setStatus(prisma, planId, {
      status: "archived",
      version: plan.version + 1,
    });
  },

  async removeDraft(organizationId: string, planId: string) {
    const result = await planRepo.deleteDraft(prisma, organizationId, planId);
    if (result.count === 0) throw new NotFoundError(messages.errors.notFound);
  },

  async saveAsTemplate(
    organizationId: string,
    userId: string,
    planId: string,
    name: string,
  ) {
    return prisma.$transaction(
      async (tx) => {
        const template = await clonePlan(tx, organizationId, userId, planId, {
          name,
          patientId: null,
          isTemplate: true,
        });
        return { id: template.id };
      },
      { timeout: 60_000 },
    );
  },

  async listByPatient(organizationId: string, patientId: string) {
    const plans = await planRepo.listByPatient(
      prisma,
      organizationId,
      patientId,
    );
    return plans.map((plan) => ({
      id: plan.id,
      name: plan.name,
      status: plan.status,
      updatedAt: plan.updatedAt,
      dayCount: plan._count.days,
    }));
  },

  async listTemplates(organizationId: string) {
    const templates = await planRepo.listTemplates(prisma, organizationId);
    return templates.map((template) => ({
      id: template.id,
      name: template.name,
      updatedAt: template.updatedAt,
      dayCount: template._count.days,
    }));
  },
};
