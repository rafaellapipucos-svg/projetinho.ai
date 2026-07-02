import "server-only";
import { Prisma } from "@/generated/prisma/client";
import type { Db } from "@/server/db";
import { prisma } from "@/server/db";

export interface FoodSearchRow {
  id: string;
  name: string;
  base_unit: "g" | "ml";
  energy_kcal: string | null;
  protein_g: string | null;
  carbohydrate_g: string | null;
  lipid_g: string | null;
  organization_id: string | null;
  category_name: string | null;
  source_key: string;
}

export const foodRepo = {
  /**
   * Busca type-ahead via índice trigram sobre name_normalized.
   * Sistema (org NULL) + alimentos da clínica, só ativos.
   */
  search(organizationId: string, normalizedTerm: string, limit: number) {
    return prisma.$queryRaw<FoodSearchRow[]>(Prisma.sql`
      SELECT f.id, f.name, f.base_unit, f.energy_kcal, f.protein_g,
             f.carbohydrate_g, f.lipid_g, f.organization_id,
             c.name AS category_name, s.key AS source_key
      FROM foods f
      LEFT JOIN food_categories c ON c.id = f.food_category_id
      JOIN food_sources s ON s.id = f.food_source_id
      WHERE f.is_active
        AND (f.organization_id IS NULL OR f.organization_id = ${organizationId}::uuid)
        AND f.name_normalized LIKE '%' || ${normalizedTerm} || '%'
      ORDER BY similarity(f.name_normalized, ${normalizedTerm}) DESC, f.name ASC
      LIMIT ${limit}
    `);
  },

  findVisibleById(db: Db, organizationId: string, id: string) {
    return db.food.findFirst({
      where: {
        id,
        isActive: true,
        OR: [{ organizationId: null }, { organizationId }],
      },
      include: {
        foodSource: true,
        foodCategory: true,
        nutrients: {
          include: { nutrient: { include: { nutrientGroup: true } } },
        },
        measures: {
          where: { OR: [{ organizationId: null }, { organizationId }] },
          orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        },
      },
    });
  },

  findOwnById(db: Db, organizationId: string, id: string) {
    return db.food.findFirst({ where: { id, organizationId } });
  },

  create(
    db: Db,
    data: {
      organizationId: string;
      foodSourceId: string;
      foodCategoryId: string | null;
      name: string;
      nameNormalized: string;
      baseUnit: "g" | "ml";
      energyKcal: number | null;
      proteinG: number | null;
      carbohydrateG: number | null;
      lipidG: number | null;
      createdBy: string;
    },
  ) {
    return db.food.create({ data });
  },

  update(
    db: Db,
    id: string,
    data: {
      foodCategoryId: string | null;
      name: string;
      nameNormalized: string;
      baseUnit: "g" | "ml";
      energyKcal: number | null;
      proteinG: number | null;
      carbohydrateG: number | null;
      lipidG: number | null;
    },
  ) {
    return db.food.update({ where: { id }, data });
  },

  replaceNutrients(
    db: Db,
    foodId: string,
    rows: Array<{ nutrientId: string; amount: number }>,
  ) {
    return db.foodNutrient.deleteMany({ where: { foodId } }).then(() =>
      db.foodNutrient.createMany({
        data: rows.map((row) => ({ foodId, ...row })),
      }),
    );
  },

  deactivate(db: Db, organizationId: string, id: string) {
    return db.food.updateMany({
      where: { id, organizationId },
      data: { isActive: false },
    });
  },

  addMeasure(
    db: Db,
    data: {
      foodId: string;
      organizationId: string;
      name: string;
      gramWeight: number;
    },
  ) {
    return db.foodMeasure.create({ data });
  },

  removeMeasure(db: Db, organizationId: string, id: string) {
    return db.foodMeasure.deleteMany({ where: { id, organizationId } });
  },

  findMeasuresByIds(db: Db, organizationId: string, ids: string[]) {
    return db.foodMeasure.findMany({
      where: {
        id: { in: ids },
        OR: [{ organizationId: null }, { organizationId }],
      },
    });
  },

  findVisibleByIds(db: Db, organizationId: string, ids: string[]) {
    return db.food.findMany({
      where: {
        id: { in: ids },
        isActive: true,
        OR: [{ organizationId: null }, { organizationId }],
      },
      include: { nutrients: { include: { nutrient: true } } },
    });
  },
};
