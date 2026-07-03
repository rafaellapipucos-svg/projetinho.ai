import "server-only";
import { prisma } from "@/server/db";
import { equivalenceRepo } from "@/server/repositories/equivalence-repo";
import { foodRepo } from "@/server/repositories/food-repo";
import { catalogRepo } from "@/server/repositories/catalog-repo";
import { NotFoundError } from "@/server/errors";
import { DomainError } from "@/domain/shared/errors";
import { resolveGrams } from "@/domain/nutrition/quantity";
import { messages } from "@/messages/pt-br";
import type { EquivalenceGroupInput } from "@/lib/schemas/equivalence";

/**
 * Resolve os gramas de cada item com o motor (validação autoritativa —
 * mesmo padrão do recipe-service; nunca confia em número do cliente).
 */
async function resolveItems(
  organizationId: string,
  input: EquivalenceGroupInput,
) {
  const foodIds = [...new Set(input.items.map((item) => item.foodId))];
  const foods = await foodRepo.findVisibleByIdsWithMeasures(
    prisma,
    organizationId,
    foodIds,
  );
  const foodById = new Map(foods.map((food) => [food.id, food]));
  if (foodById.size !== foodIds.length) {
    throw new NotFoundError(messages.errors.notFound);
  }

  const measureIds = input.items
    .map((item) => item.foodMeasureId)
    .filter((id): id is string => id !== null);
  const measures = await foodRepo.findMeasuresByIds(
    prisma,
    organizationId,
    measureIds,
  );
  const measureById = new Map(measures.map((measure) => [measure.id, measure]));

  const unitIds = input.items
    .map((item) => item.measurementUnitId)
    .filter((id): id is string => id !== null);
  const units = await catalogRepo.findMeasurementUnitsByIds(prisma, unitIds);
  const unitById = new Map(units.map((unit) => [unit.id, unit]));

  return input.items.map((item, index) => {
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
    return {
      foodId: item.foodId,
      quantity: item.quantity,
      measurementUnitId: item.measurementUnitId,
      foodMeasureId: item.foodMeasureId,
      resolvedGrams: resolveGrams(item.quantity, {
        measureGramWeight,
        unit: unitRef,
      }),
      sortOrder: index,
    };
  });
}

export const equivalenceService = {
  async list(organizationId: string) {
    const groups = await equivalenceRepo.list(prisma, organizationId);
    return groups.map((group) => ({
      id: group.id,
      name: group.name,
      items: group.items.map((item) => ({
        id: item.id,
        foodId: item.foodId,
        foodName: item.food.name,
        quantity: Number(item.quantity),
        measurementUnitId: item.measurementUnitId,
        unitAbbreviation: item.measurementUnit?.abbreviation ?? null,
        foodMeasureId: item.foodMeasureId,
        resolvedGrams: Number(item.resolvedGrams),
      })),
    }));
  },

  async save(organizationId: string, input: EquivalenceGroupInput) {
    const items = await resolveItems(organizationId, input);
    if (input.id) {
      const existing = await equivalenceRepo.findForOrg(
        prisma,
        organizationId,
        input.id,
      );
      if (!existing) throw new NotFoundError(messages.errors.notFound);
      await equivalenceRepo.replace(prisma, input.id, input.name, items);
      return { id: input.id };
    }
    const group = await equivalenceRepo.create(
      prisma,
      organizationId,
      input.name,
      items,
    );
    return { id: group.id };
  },

  async remove(organizationId: string, id: string) {
    const result = await equivalenceRepo.deactivate(prisma, organizationId, id);
    if (result.count === 0) throw new NotFoundError(messages.errors.notFound);
  },
};
