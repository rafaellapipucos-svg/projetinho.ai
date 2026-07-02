import "server-only";
import { prisma } from "@/server/db";
import { catalogRepo } from "@/server/repositories/catalog-repo";
import { ConflictError, NotFoundError } from "@/server/errors";
import { messages } from "@/messages/pt-br";
import type {
  ExamTypeInput,
  FoodCategoryInput,
  MealTypeInput,
} from "@/lib/schemas/catalog";

function referenceRangeFrom(input: ExamTypeInput): object {
  const range: { min?: number; max?: number } = {};
  if (input.referenceMin != null) range.min = input.referenceMin;
  if (input.referenceMax != null) range.max = input.referenceMax;
  return range;
}

export const catalogService = {
  mealTypes: {
    list(organizationId: string) {
      return catalogRepo.listMealTypes(prisma, organizationId);
    },
    async create(organizationId: string, input: MealTypeInput) {
      const systemRow = await catalogRepo.findSystemMealTypeByName(
        prisma,
        input.name,
      );
      if (systemRow)
        throw new ConflictError(messages.config.nameConflictsWithSystem);
      return catalogRepo.createMealType(prisma, organizationId, {
        name: input.name,
        defaultTime: input.defaultTime ?? null,
      });
    },
    async update(organizationId: string, id: string, input: MealTypeInput) {
      const result = await catalogRepo.updateMealType(
        prisma,
        organizationId,
        id,
        {
          name: input.name,
          defaultTime: input.defaultTime ?? null,
        },
      );
      if (result.count === 0) throw new NotFoundError(messages.errors.notFound);
    },
    async remove(organizationId: string, id: string) {
      const result = await catalogRepo.deleteMealType(
        prisma,
        organizationId,
        id,
      );
      if (result.count === 0) throw new NotFoundError(messages.errors.notFound);
    },
  },

  foodCategories: {
    list(organizationId: string) {
      return catalogRepo.listFoodCategories(prisma, organizationId);
    },
    async create(organizationId: string, input: FoodCategoryInput) {
      const systemRow = await catalogRepo.findSystemFoodCategoryByName(
        prisma,
        input.name,
      );
      if (systemRow)
        throw new ConflictError(messages.config.nameConflictsWithSystem);
      return catalogRepo.createFoodCategory(prisma, organizationId, {
        name: input.name,
      });
    },
    async update(organizationId: string, id: string, input: FoodCategoryInput) {
      const result = await catalogRepo.updateFoodCategory(
        prisma,
        organizationId,
        id,
        {
          name: input.name,
        },
      );
      if (result.count === 0) throw new NotFoundError(messages.errors.notFound);
    },
    async remove(organizationId: string, id: string) {
      const result = await catalogRepo.deleteFoodCategory(
        prisma,
        organizationId,
        id,
      );
      if (result.count === 0) throw new NotFoundError(messages.errors.notFound);
    },
  },

  examTypes: {
    list(organizationId: string) {
      return catalogRepo.listExamTypes(prisma, organizationId);
    },
    async create(organizationId: string, input: ExamTypeInput) {
      const systemRow = await catalogRepo.findSystemExamTypeByName(
        prisma,
        input.name,
      );
      if (systemRow)
        throw new ConflictError(messages.config.nameConflictsWithSystem);
      return catalogRepo.createExamType(prisma, organizationId, {
        name: input.name,
        unit: input.unit ?? null,
        referenceRange: referenceRangeFrom(input),
      });
    },
    async update(organizationId: string, id: string, input: ExamTypeInput) {
      const result = await catalogRepo.updateExamType(
        prisma,
        organizationId,
        id,
        {
          name: input.name,
          unit: input.unit ?? null,
          referenceRange: referenceRangeFrom(input),
        },
      );
      if (result.count === 0) throw new NotFoundError(messages.errors.notFound);
    },
    async remove(organizationId: string, id: string) {
      const result = await catalogRepo.deleteExamType(
        prisma,
        organizationId,
        id,
      );
      if (result.count === 0) throw new NotFoundError(messages.errors.notFound);
    },
  },

  system: {
    nutrients() {
      return catalogRepo.listNutrients(prisma);
    },
    async measurementUnits() {
      const units = await catalogRepo.listMeasurementUnits(prisma);
      // Decimal → number na borda do service (superjson não serializa Decimal)
      return units.map((unit) => ({
        ...unit,
        gramsPerUnit:
          unit.gramsPerUnit === null ? null : Number(unit.gramsPerUnit),
      }));
    },
    calculationMethods() {
      return catalogRepo.listCalculationMethods(prisma);
    },
    measurementTypes() {
      return catalogRepo.listMeasurementTypes(prisma);
    },
  },
};
