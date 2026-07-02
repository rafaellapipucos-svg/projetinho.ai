import { router, orgProcedure } from "@/server/trpc/trpc";
import { catalogService } from "@/server/services/catalog-service";
import {
  examTypeInput,
  foodCategoryInput,
  idParam,
  mealTypeInput,
} from "@/lib/schemas/catalog";

export const catalogRouter = router({
  mealTypes: router({
    list: orgProcedure.query(({ ctx }) =>
      catalogService.mealTypes.list(ctx.membership.organizationId),
    ),
    create: orgProcedure
      .input(mealTypeInput)
      .mutation(({ ctx, input }) =>
        catalogService.mealTypes.create(ctx.membership.organizationId, input),
      ),
    update: orgProcedure
      .input(mealTypeInput.extend(idParam.shape))
      .mutation(({ ctx, input: { id, ...data } }) =>
        catalogService.mealTypes.update(
          ctx.membership.organizationId,
          id,
          data,
        ),
      ),
    remove: orgProcedure
      .input(idParam)
      .mutation(({ ctx, input }) =>
        catalogService.mealTypes.remove(
          ctx.membership.organizationId,
          input.id,
        ),
      ),
  }),

  foodCategories: router({
    list: orgProcedure.query(({ ctx }) =>
      catalogService.foodCategories.list(ctx.membership.organizationId),
    ),
    create: orgProcedure
      .input(foodCategoryInput)
      .mutation(({ ctx, input }) =>
        catalogService.foodCategories.create(
          ctx.membership.organizationId,
          input,
        ),
      ),
    update: orgProcedure
      .input(foodCategoryInput.extend(idParam.shape))
      .mutation(({ ctx, input: { id, ...data } }) =>
        catalogService.foodCategories.update(
          ctx.membership.organizationId,
          id,
          data,
        ),
      ),
    remove: orgProcedure
      .input(idParam)
      .mutation(({ ctx, input }) =>
        catalogService.foodCategories.remove(
          ctx.membership.organizationId,
          input.id,
        ),
      ),
  }),

  examTypes: router({
    list: orgProcedure.query(({ ctx }) =>
      catalogService.examTypes.list(ctx.membership.organizationId),
    ),
    create: orgProcedure
      .input(examTypeInput)
      .mutation(({ ctx, input }) =>
        catalogService.examTypes.create(ctx.membership.organizationId, input),
      ),
    update: orgProcedure
      .input(examTypeInput.extend(idParam.shape))
      .mutation(({ ctx, input: { id, ...data } }) =>
        catalogService.examTypes.update(
          ctx.membership.organizationId,
          id,
          data,
        ),
      ),
    remove: orgProcedure
      .input(idParam)
      .mutation(({ ctx, input }) =>
        catalogService.examTypes.remove(
          ctx.membership.organizationId,
          input.id,
        ),
      ),
  }),

  system: router({
    nutrients: orgProcedure.query(() => catalogService.system.nutrients()),
    measurementUnits: orgProcedure.query(() =>
      catalogService.system.measurementUnits(),
    ),
    calculationMethods: orgProcedure.query(() =>
      catalogService.system.calculationMethods(),
    ),
    measurementTypes: orgProcedure.query(() =>
      catalogService.system.measurementTypes(),
    ),
  }),
});
