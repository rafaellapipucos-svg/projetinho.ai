import "server-only";
import type { Db } from "@/server/db";

export interface RecipeIngredientData {
  foodId: string;
  quantity: number;
  measurementUnitId: string | null;
  foodMeasureId: string | null;
  resolvedGrams: number;
  sortOrder: number;
}

export const recipeRepo = {
  listByOrg(db: Db, organizationId: string) {
    return db.recipe.findMany({
      where: { organizationId, isActive: true },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        servings: true,
        updatedAt: true,
        _count: { select: { ingredients: true } },
      },
    });
  },

  findByIdForOrg(db: Db, organizationId: string, id: string) {
    return db.recipe.findFirst({
      where: { id, organizationId },
      include: {
        ingredients: {
          orderBy: { sortOrder: "asc" },
          include: {
            food: { include: { nutrients: { include: { nutrient: true } } } },
            measurementUnit: true,
          },
        },
      },
    });
  },

  create(
    db: Db,
    data: {
      organizationId: string;
      name: string;
      nameNormalized: string;
      servings: number;
      yieldGrams: number | null;
      instructions: string | null;
      createdBy: string;
    },
    ingredients: RecipeIngredientData[],
  ) {
    return db.recipe.create({
      data: { ...data, ingredients: { create: ingredients } },
    });
  },

  async replace(
    db: Db,
    id: string,
    data: {
      name: string;
      nameNormalized: string;
      servings: number;
      yieldGrams: number | null;
      instructions: string | null;
    },
    ingredients: RecipeIngredientData[],
  ) {
    await db.recipeIngredient.deleteMany({ where: { recipeId: id } });
    return db.recipe.update({
      where: { id },
      data: { ...data, ingredients: { create: ingredients } },
    });
  },

  deactivate(db: Db, organizationId: string, id: string) {
    return db.recipe.updateMany({
      where: { id, organizationId },
      data: { isActive: false },
    });
  },

  /** Receitas da clínica com tudo que o cálculo nutricional precisa. */
  findByIdsForCalc(db: Db, organizationId: string, ids: string[]) {
    return db.recipe.findMany({
      where: { id: { in: ids }, organizationId, isActive: true },
      include: {
        ingredients: {
          include: {
            food: { include: { nutrients: { include: { nutrient: true } } } },
          },
        },
      },
    });
  },
};
