import "server-only";
import type { Db } from "@/server/db";

/**
 * Catálogos com escopo de clínica: a leitura mescla linhas do sistema
 * (organization_id NULL) com as da clínica; escrita SEMPRE filtra pela
 * organização (tenancy por construção — linhas do sistema são intocáveis
 * porque `organizationId = <org>` nunca casa com NULL).
 */
export const catalogRepo = {
  // ── Tipos de refeição ──────────────────────────────────────────────────────
  listMealTypes(db: Db, organizationId: string) {
    return db.mealType.findMany({
      where: { OR: [{ organizationId: null }, { organizationId }] },
      orderBy: [{ isSystem: "desc" }, { sortOrder: "asc" }, { name: "asc" }],
    });
  },
  findSystemMealTypeByName(db: Db, name: string) {
    return db.mealType.findFirst({ where: { organizationId: null, name } });
  },
  createMealType(
    db: Db,
    organizationId: string,
    data: { name: string; defaultTime: string | null },
  ) {
    return db.mealType.create({ data: { ...data, organizationId } });
  },
  updateMealType(
    db: Db,
    organizationId: string,
    id: string,
    data: { name: string; defaultTime: string | null },
  ) {
    return db.mealType.updateMany({ where: { id, organizationId }, data });
  },
  deleteMealType(db: Db, organizationId: string, id: string) {
    return db.mealType.deleteMany({ where: { id, organizationId } });
  },

  // ── Categorias de alimentos ────────────────────────────────────────────────
  listFoodCategories(db: Db, organizationId: string) {
    return db.foodCategory.findMany({
      where: { OR: [{ organizationId: null }, { organizationId }] },
      orderBy: [{ isSystem: "desc" }, { sortOrder: "asc" }, { name: "asc" }],
    });
  },
  findSystemFoodCategoryByName(db: Db, name: string) {
    return db.foodCategory.findFirst({ where: { organizationId: null, name } });
  },
  createFoodCategory(db: Db, organizationId: string, data: { name: string }) {
    return db.foodCategory.create({ data: { ...data, organizationId } });
  },
  updateFoodCategory(
    db: Db,
    organizationId: string,
    id: string,
    data: { name: string },
  ) {
    return db.foodCategory.updateMany({ where: { id, organizationId }, data });
  },
  deleteFoodCategory(db: Db, organizationId: string, id: string) {
    return db.foodCategory.deleteMany({ where: { id, organizationId } });
  },

  // ── Tipos de exame ─────────────────────────────────────────────────────────
  listExamTypes(db: Db, organizationId: string) {
    return db.examType.findMany({
      where: { OR: [{ organizationId: null }, { organizationId }] },
      orderBy: [{ isSystem: "desc" }, { sortOrder: "asc" }, { name: "asc" }],
    });
  },
  findSystemExamTypeByName(db: Db, name: string) {
    return db.examType.findFirst({ where: { organizationId: null, name } });
  },
  createExamType(
    db: Db,
    organizationId: string,
    data: { name: string; unit: string | null; referenceRange: object },
  ) {
    return db.examType.create({ data: { ...data, organizationId } });
  },
  updateExamType(
    db: Db,
    organizationId: string,
    id: string,
    data: { name: string; unit: string | null; referenceRange: object },
  ) {
    return db.examType.updateMany({ where: { id, organizationId }, data });
  },
  deleteExamType(db: Db, organizationId: string, id: string) {
    return db.examType.deleteMany({ where: { id, organizationId } });
  },

  // ── Catálogos do sistema (somente leitura na UI) ───────────────────────────
  listNutrients(db: Db) {
    return db.nutrient.findMany({
      include: { nutrientGroup: true },
      orderBy: [{ nutrientGroup: { sortOrder: "asc" } }, { sortOrder: "asc" }],
    });
  },
  listMeasurementUnits(db: Db) {
    return db.measurementUnit.findMany({ orderBy: { sortOrder: "asc" } });
  },
  findMeasurementUnitsByIds(db: Db, ids: string[]) {
    return db.measurementUnit.findMany({ where: { id: { in: ids } } });
  },
  findNutrientsByIds(db: Db, ids: string[]) {
    return db.nutrient.findMany({ where: { id: { in: ids } } });
  },
  findNutrientByKey(db: Db, key: string) {
    return db.nutrient.findUnique({ where: { key } });
  },
  listCalculationMethods(db: Db) {
    return db.calculationMethod.findMany({
      orderBy: [{ kind: "asc" }, { sortOrder: "asc" }],
    });
  },
  listMeasurementTypes(db: Db) {
    return db.measurementType.findMany({
      orderBy: [{ group: "asc" }, { sortOrder: "asc" }],
    });
  },
};
