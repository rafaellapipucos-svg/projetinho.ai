import "server-only";
import type { Db } from "@/server/db";
import type { PlanStatus } from "@/generated/prisma/enums";

/**
 * Todas as escritas de estrutura verificam a cadeia de pertencimento até o
 * plano (filtros relacionais aninhados) — um id forjado de outra org/plano
 * nunca casa e a operação retorna count 0 (tenancy por construção).
 */
export const planRepo = {
  findForOrg(db: Db, organizationId: string, id: string) {
    return db.mealPlan.findFirst({ where: { id, organizationId } });
  },

  findActiveByPatient(db: Db, patientId: string) {
    return db.mealPlan.findFirst({
      where: { patientId, status: "active", isTemplate: false },
      orderBy: { updatedAt: "desc" },
    });
  },

  loadGraph(db: Db, organizationId: string, id: string) {
    return db.mealPlan.findFirst({
      where: { id, organizationId },
      include: {
        patient: { select: { id: true, name: true } },
        targets: { include: { nutrient: true } },
        days: {
          orderBy: { sortOrder: "asc" },
          include: {
            meals: {
              orderBy: { sortOrder: "asc" },
              include: {
                mealType: true,
                options: {
                  orderBy: { sortOrder: "asc" },
                  include: { items: { orderBy: { sortOrder: "asc" } } },
                },
              },
            },
          },
        },
      },
    });
  },

  listByPatient(db: Db, organizationId: string, patientId: string) {
    return db.mealPlan.findMany({
      where: { organizationId, patientId, isTemplate: false },
      orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
      select: {
        id: true,
        name: true,
        status: true,
        updatedAt: true,
        _count: { select: { days: true } },
      },
    });
  },

  listTemplates(db: Db, organizationId: string) {
    return db.mealPlan.findMany({
      where: { organizationId, isTemplate: true, status: { not: "archived" } },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        updatedAt: true,
        _count: { select: { days: true } },
      },
    });
  },

  create(
    db: Db,
    data: {
      id?: string;
      organizationId: string;
      patientId: string | null;
      name: string;
      isTemplate: boolean;
      createdBy: string;
    },
  ) {
    return db.mealPlan.create({ data });
  },

  updateMeta(
    db: Db,
    organizationId: string,
    id: string,
    data: {
      name?: string;
      notes?: string | null;
      startDate?: Date | null;
      endDate?: Date | null;
    },
  ) {
    return db.mealPlan.updateMany({ where: { id, organizationId }, data });
  },

  setVersion(db: Db, id: string, version: number) {
    return db.mealPlan.update({ where: { id }, data: { version } });
  },

  setStatus(
    db: Db,
    id: string,
    data: { status: PlanStatus; nutritionalSnapshot?: object; version: number },
  ) {
    return db.mealPlan.update({ where: { id }, data });
  },

  archiveActiveOfPatient(
    db: Db,
    organizationId: string,
    patientId: string,
    exceptId: string,
  ) {
    return db.mealPlan.updateMany({
      where: {
        organizationId,
        patientId,
        status: "active",
        id: { not: exceptId },
      },
      data: { status: "archived" },
    });
  },

  deleteDraft(db: Db, organizationId: string, id: string) {
    return db.mealPlan.deleteMany({
      where: { id, organizationId, status: "draft" },
    });
  },

  // ── Dias ───────────────────────────────────────────────────────────────────
  createDay(
    db: Db,
    data: {
      id: string;
      mealPlanId: string;
      name: string;
      weekdays: number[];
      sortOrder: number;
    },
  ) {
    return db.planDay.create({ data });
  },
  updateDay(
    db: Db,
    planId: string,
    id: string,
    data: { name?: string; weekdays?: number[]; sortOrder?: number },
  ) {
    return db.planDay.updateMany({ where: { id, mealPlanId: planId }, data });
  },
  deleteDay(db: Db, planId: string, id: string) {
    return db.planDay.deleteMany({ where: { id, mealPlanId: planId } });
  },
  findDay(db: Db, planId: string, id: string) {
    return db.planDay.findFirst({ where: { id, mealPlanId: planId } });
  },

  // ── Refeições ──────────────────────────────────────────────────────────────
  createMeal(
    db: Db,
    data: {
      id: string;
      planDayId: string;
      mealTypeId: string;
      scheduledTime: string | null;
      sortOrder: number;
    },
  ) {
    return db.planMeal.create({ data });
  },
  updateMeal(
    db: Db,
    planId: string,
    id: string,
    data: {
      mealTypeId?: string;
      customName?: string | null;
      scheduledTime?: string | null;
      notes?: string | null;
      sortOrder?: number;
    },
  ) {
    return db.planMeal.updateMany({
      where: { id, planDay: { mealPlanId: planId } },
      data,
    });
  },
  deleteMeal(db: Db, planId: string, id: string) {
    return db.planMeal.deleteMany({
      where: { id, planDay: { mealPlanId: planId } },
    });
  },
  findMeal(db: Db, planId: string, id: string) {
    return db.planMeal.findFirst({
      where: { id, planDay: { mealPlanId: planId } },
    });
  },

  // ── Opções ─────────────────────────────────────────────────────────────────
  createOption(
    db: Db,
    data: { id: string; planMealId: string; name: string; sortOrder: number },
  ) {
    return db.mealOption.create({ data });
  },
  updateOption(
    db: Db,
    planId: string,
    id: string,
    data: { name?: string; sortOrder?: number },
  ) {
    return db.mealOption.updateMany({
      where: { id, planMeal: { planDay: { mealPlanId: planId } } },
      data,
    });
  },
  deleteOption(db: Db, planId: string, id: string) {
    return db.mealOption.deleteMany({
      where: { id, planMeal: { planDay: { mealPlanId: planId } } },
    });
  },
  findOption(db: Db, planId: string, id: string) {
    return db.mealOption.findFirst({
      where: { id, planMeal: { planDay: { mealPlanId: planId } } },
    });
  },

  // ── Itens ──────────────────────────────────────────────────────────────────
  createItem(
    db: Db,
    data: {
      id: string;
      mealOptionId: string;
      foodId: string | null;
      recipeId: string | null;
      quantity: number;
      measurementUnitId: string | null;
      foodMeasureId: string | null;
      resolvedGrams: number;
      sortOrder: number;
      notes: string | null;
    },
  ) {
    return db.mealItem.create({ data });
  },
  updateItem(
    db: Db,
    planId: string,
    id: string,
    data: {
      mealOptionId?: string;
      quantity?: number;
      measurementUnitId?: string | null;
      foodMeasureId?: string | null;
      resolvedGrams?: number;
      sortOrder?: number;
      notes?: string | null;
    },
  ) {
    return db.mealItem.updateMany({
      where: {
        id,
        mealOption: { planMeal: { planDay: { mealPlanId: planId } } },
      },
      data,
    });
  },
  deleteItem(db: Db, planId: string, id: string) {
    return db.mealItem.deleteMany({
      where: {
        id,
        mealOption: { planMeal: { planDay: { mealPlanId: planId } } },
      },
    });
  },
  findItem(db: Db, planId: string, id: string) {
    return db.mealItem.findFirst({
      where: {
        id,
        mealOption: { planMeal: { planDay: { mealPlanId: planId } } },
      },
    });
  },

  // ── Metas ──────────────────────────────────────────────────────────────────
  upsertTarget(
    db: Db,
    planId: string,
    nutrientId: string,
    data: { targetMin: number | null; targetMax: number | null },
  ) {
    return db.planNutrientTarget.upsert({
      where: { mealPlanId_nutrientId: { mealPlanId: planId, nutrientId } },
      update: data,
      create: { mealPlanId: planId, nutrientId, ...data },
    });
  },
  deleteTarget(db: Db, planId: string, nutrientId: string) {
    return db.planNutrientTarget.deleteMany({
      where: { mealPlanId: planId, nutrientId },
    });
  },
};
