import "server-only";
import { prisma } from "@/server/db";
import { recipeRepo } from "@/server/repositories/recipe-repo";
import { foodRepo } from "@/server/repositories/food-repo";
import { catalogRepo } from "@/server/repositories/catalog-repo";
import { NotFoundError } from "@/server/errors";
import { DomainError } from "@/domain/shared/errors";
import { resolveGrams } from "@/domain/nutrition/quantity";
import { recipeNutrition } from "@/domain/nutrition/recipe";
import type { NutrientVector } from "@/domain/shared/types";
import { normalizeSearchText } from "@/lib/search";
import { messages } from "@/messages/pt-br";
import type { RecipeInput } from "@/lib/schemas/recipe";

function per100Vector(
  nutrients: Array<{ nutrient: { key: string }; amount: unknown }>,
): NutrientVector {
  const vector: NutrientVector = {};
  for (const row of nutrients) {
    vector[row.nutrient.key] = Number(row.amount);
  }
  return vector;
}

/**
 * Resolve os gramas de cada ingrediente com o MESMO motor usado no cliente
 * (validação autoritativa — nunca confiar em número do cliente).
 */
async function resolveIngredients(organizationId: string, input: RecipeInput) {
  const foodIds = [...new Set(input.ingredients.map((item) => item.foodId))];
  const foods = await foodRepo.findVisibleByIds(
    prisma,
    organizationId,
    foodIds,
  );
  const foodById = new Map(foods.map((food) => [food.id, food]));
  if (foodById.size !== foodIds.length) {
    throw new NotFoundError(messages.errors.notFound);
  }

  const measureIds = input.ingredients
    .map((item) => item.foodMeasureId)
    .filter((id): id is string => id !== null);
  const measures = await foodRepo.findMeasuresByIds(
    prisma,
    organizationId,
    measureIds,
  );
  const measureById = new Map(measures.map((measure) => [measure.id, measure]));

  const unitIds = input.ingredients
    .map((item) => item.measurementUnitId)
    .filter((id): id is string => id !== null);
  const units = await catalogRepo.findMeasurementUnitsByIds(prisma, unitIds);
  const unitById = new Map(units.map((unit) => [unit.id, unit]));

  return input.ingredients.map((item, index) => {
    let measureGramWeight: number | undefined;
    if (item.foodMeasureId) {
      const measure = measureById.get(item.foodMeasureId);
      if (!measure || measure.foodId !== item.foodId) {
        throw new DomainError(messages.recipes.invalidMeasure);
      }
      measureGramWeight = Number(measure.gramWeight);
    }

    let unitRef:
      | { type: "mass" | "volume" | "unit"; gramsPerUnit: number | null }
      | undefined;
    if (item.measurementUnitId) {
      const unit = unitById.get(item.measurementUnitId);
      if (!unit) throw new NotFoundError(messages.errors.notFound);
      unitRef = {
        type: unit.type,
        gramsPerUnit:
          unit.gramsPerUnit === null ? null : Number(unit.gramsPerUnit),
      };
    }

    const resolvedGrams = resolveGrams(item.quantity, {
      measureGramWeight,
      unit: unitRef,
    });

    return {
      foodId: item.foodId,
      quantity: item.quantity,
      measurementUnitId: item.measurementUnitId,
      foodMeasureId: item.foodMeasureId,
      resolvedGrams,
      sortOrder: index,
    };
  });
}

export const recipeService = {
  async list(organizationId: string) {
    const recipes = await recipeRepo.listByOrg(prisma, organizationId);
    return recipes.map((recipe) => ({
      id: recipe.id,
      name: recipe.name,
      servings: Number(recipe.servings),
      ingredientCount: recipe._count.ingredients,
      updatedAt: recipe.updatedAt,
    }));
  },

  async byId(organizationId: string, id: string) {
    const recipe = await recipeRepo.findByIdForOrg(prisma, organizationId, id);
    if (!recipe) throw new NotFoundError(messages.errors.notFound);

    const measureIds = recipe.ingredients
      .map((item) => item.foodMeasureId)
      .filter((measureId): measureId is string => measureId !== null);
    const measures = await foodRepo.findMeasuresByIds(
      prisma,
      organizationId,
      measureIds,
    );
    const measureById = new Map(
      measures.map((measure) => [measure.id, measure]),
    );

    const nutrition = recipeNutrition(
      recipe.ingredients.map((item) => ({
        per100: per100Vector(item.food.nutrients),
        resolvedGrams: Number(item.resolvedGrams),
      })),
      {
        servings: Number(recipe.servings),
        yieldGrams:
          recipe.yieldGrams === null ? null : Number(recipe.yieldGrams),
      },
    );

    return {
      id: recipe.id,
      name: recipe.name,
      servings: Number(recipe.servings),
      yieldGrams: recipe.yieldGrams === null ? null : Number(recipe.yieldGrams),
      instructions: recipe.instructions,
      isActive: recipe.isActive,
      ingredients: recipe.ingredients.map((item) => ({
        id: item.id,
        foodId: item.foodId,
        foodName: item.food.name,
        quantity: Number(item.quantity),
        measurementUnitId: item.measurementUnitId,
        unitAbbreviation: item.measurementUnit?.abbreviation ?? null,
        foodMeasureId: item.foodMeasureId,
        measureName: item.foodMeasureId
          ? (measureById.get(item.foodMeasureId)?.name ?? null)
          : null,
        resolvedGrams: Number(item.resolvedGrams),
      })),
      nutrition,
    };
  },

  async create(organizationId: string, userId: string, input: RecipeInput) {
    const ingredients = await resolveIngredients(organizationId, input);
    const recipe = await recipeRepo.create(
      prisma,
      {
        organizationId,
        name: input.name,
        nameNormalized: normalizeSearchText(input.name),
        servings: input.servings,
        yieldGrams: input.yieldGrams,
        instructions: input.instructions,
        createdBy: userId,
      },
      ingredients,
    );
    return { id: recipe.id };
  },

  async update(organizationId: string, id: string, input: RecipeInput) {
    const existing = await recipeRepo.findByIdForOrg(
      prisma,
      organizationId,
      id,
    );
    if (!existing) throw new NotFoundError(messages.errors.notFound);
    const ingredients = await resolveIngredients(organizationId, input);
    await recipeRepo.replace(
      prisma,
      id,
      {
        name: input.name,
        nameNormalized: normalizeSearchText(input.name),
        servings: input.servings,
        yieldGrams: input.yieldGrams,
        instructions: input.instructions,
      },
      ingredients,
    );
  },

  async deactivate(organizationId: string, id: string) {
    const result = await recipeRepo.deactivate(prisma, organizationId, id);
    if (result.count === 0) throw new NotFoundError(messages.errors.notFound);
  },
};
