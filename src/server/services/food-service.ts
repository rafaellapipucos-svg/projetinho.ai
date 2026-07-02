import "server-only";
import { prisma } from "@/server/db";
import { foodRepo } from "@/server/repositories/food-repo";
import { NotFoundError } from "@/server/errors";
import { DomainError } from "@/domain/shared/errors";
import { normalizeSearchText } from "@/lib/search";
import { messages } from "@/messages/pt-br";
import type { FoodCreateInput, FoodUpdateInput } from "@/lib/schemas/food";

const SEARCH_LIMIT = 30;
const CUSTOM_SOURCE_KEY = "custom";

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function macroFrom(input: FoodCreateInput, key: string): number | null {
  return (
    input.nutrients.find((nutrient) => nutrient.key === key)?.amount ?? null
  );
}

async function resolveNutrientRows(input: FoodCreateInput) {
  const catalog = await prisma.nutrient.findMany();
  const idByKey = new Map(
    catalog.map((nutrient) => [nutrient.key, nutrient.id]),
  );
  return input.nutrients.map((nutrient) => {
    const nutrientId = idByKey.get(nutrient.key);
    if (!nutrientId) {
      throw new DomainError(
        `${messages.foods.unknownNutrient}: ${nutrient.key}`,
      );
    }
    return { nutrientId, amount: nutrient.amount };
  });
}

async function assertCategoryVisible(
  organizationId: string,
  categoryId: string | null,
) {
  if (!categoryId) return;
  const category = await prisma.foodCategory.findFirst({
    where: {
      id: categoryId,
      OR: [{ organizationId: null }, { organizationId }],
    },
  });
  if (!category) throw new NotFoundError(messages.errors.notFound);
}

export const foodService = {
  async search(organizationId: string, term: string) {
    const normalized = normalizeSearchText(term);
    const rows = await foodRepo.search(
      organizationId,
      normalized,
      SEARCH_LIMIT,
    );
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      baseUnit: row.base_unit,
      isOwn: row.organization_id !== null,
      sourceKey: row.source_key,
      categoryName: row.category_name,
      energyKcal: toNumber(row.energy_kcal),
      proteinG: toNumber(row.protein_g),
      carbohydrateG: toNumber(row.carbohydrate_g),
      lipidG: toNumber(row.lipid_g),
    }));
  },

  async byId(organizationId: string, id: string) {
    const food = await foodRepo.findVisibleById(prisma, organizationId, id);
    if (!food) throw new NotFoundError(messages.errors.notFound);
    return {
      id: food.id,
      name: food.name,
      baseQty: Number(food.baseQty),
      baseUnit: food.baseUnit,
      isOwn: food.organizationId !== null,
      source: { key: food.foodSource.key, name: food.foodSource.name },
      categoryId: food.foodCategoryId,
      categoryName: food.foodCategory?.name ?? null,
      nutrients: food.nutrients
        .map(({ nutrient, amount }) => ({
          key: nutrient.key,
          name: nutrient.name,
          unit: nutrient.unit,
          decimals: nutrient.decimals,
          isCore: nutrient.isCore,
          groupName: nutrient.nutrientGroup.name,
          groupSort: nutrient.nutrientGroup.sortOrder,
          sortOrder: nutrient.sortOrder,
          amount: Number(amount),
        }))
        .sort((a, b) => a.groupSort - b.groupSort || a.sortOrder - b.sortOrder),
      measures: food.measures.map((measure) => ({
        id: measure.id,
        name: measure.name,
        gramWeight: Number(measure.gramWeight),
        isOwn: measure.organizationId !== null,
      })),
    };
  },

  async create(organizationId: string, userId: string, input: FoodCreateInput) {
    const source = await prisma.foodSource.findUnique({
      where: { key: CUSTOM_SOURCE_KEY },
    });
    if (!source) throw new NotFoundError(messages.errors.notFound);
    await assertCategoryVisible(organizationId, input.foodCategoryId);
    const nutrientRows = await resolveNutrientRows(input);

    return prisma.$transaction(async (tx) => {
      const food = await foodRepo.create(tx, {
        organizationId,
        foodSourceId: source.id,
        foodCategoryId: input.foodCategoryId,
        name: input.name,
        nameNormalized: normalizeSearchText(input.name),
        baseUnit: input.baseUnit,
        energyKcal: macroFrom(input, "energy_kcal"),
        proteinG: macroFrom(input, "protein_g"),
        carbohydrateG: macroFrom(input, "carbohydrate_g"),
        lipidG: macroFrom(input, "lipid_g"),
        createdBy: userId,
      });
      await foodRepo.replaceNutrients(tx, food.id, nutrientRows);
      return { id: food.id };
    });
  },

  async update(organizationId: string, input: FoodUpdateInput) {
    const owned = await foodRepo.findOwnById(prisma, organizationId, input.id);
    if (!owned) throw new NotFoundError(messages.errors.notFound);
    await assertCategoryVisible(organizationId, input.foodCategoryId);
    const nutrientRows = await resolveNutrientRows(input);

    await prisma.$transaction(async (tx) => {
      await foodRepo.update(tx, input.id, {
        foodCategoryId: input.foodCategoryId,
        name: input.name,
        nameNormalized: normalizeSearchText(input.name),
        baseUnit: input.baseUnit,
        energyKcal: macroFrom(input, "energy_kcal"),
        proteinG: macroFrom(input, "protein_g"),
        carbohydrateG: macroFrom(input, "carbohydrate_g"),
        lipidG: macroFrom(input, "lipid_g"),
      });
      await foodRepo.replaceNutrients(tx, input.id, nutrientRows);
    });
  },

  async deactivate(organizationId: string, id: string) {
    const result = await foodRepo.deactivate(prisma, organizationId, id);
    if (result.count === 0) throw new NotFoundError(messages.errors.notFound);
  },

  async addMeasure(
    organizationId: string,
    input: { foodId: string; name: string; gramWeight: number },
  ) {
    const [food] = await foodRepo.findVisibleByIds(prisma, organizationId, [
      input.foodId,
    ]);
    if (!food) throw new NotFoundError(messages.errors.notFound);
    await foodRepo.addMeasure(prisma, { ...input, organizationId });
  },

  async removeMeasure(organizationId: string, id: string) {
    const result = await foodRepo.removeMeasure(prisma, organizationId, id);
    if (result.count === 0) throw new NotFoundError(messages.errors.notFound);
  },
};
