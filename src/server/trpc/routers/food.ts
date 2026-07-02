import { router, orgProcedure } from "@/server/trpc/trpc";
import { foodService } from "@/server/services/food-service";
import {
  foodCreateInput,
  foodMeasureCreateInput,
  foodSearchInput,
  foodUpdateInput,
} from "@/lib/schemas/food";
import { idParam } from "@/lib/schemas/catalog";

export const foodRouter = router({
  search: orgProcedure
    .input(foodSearchInput)
    .query(({ ctx, input }) =>
      foodService.search(ctx.membership.organizationId, input.term),
    ),
  byId: orgProcedure
    .input(idParam)
    .query(({ ctx, input }) =>
      foodService.byId(ctx.membership.organizationId, input.id),
    ),
  create: orgProcedure
    .input(foodCreateInput)
    .mutation(({ ctx, input }) =>
      foodService.create(
        ctx.membership.organizationId,
        ctx.tenant.user.id,
        input,
      ),
    ),
  update: orgProcedure
    .input(foodUpdateInput)
    .mutation(({ ctx, input }) =>
      foodService.update(ctx.membership.organizationId, input),
    ),
  deactivate: orgProcedure
    .input(idParam)
    .mutation(({ ctx, input }) =>
      foodService.deactivate(ctx.membership.organizationId, input.id),
    ),
  addMeasure: orgProcedure
    .input(foodMeasureCreateInput)
    .mutation(({ ctx, input }) =>
      foodService.addMeasure(ctx.membership.organizationId, input),
    ),
  removeMeasure: orgProcedure
    .input(idParam)
    .mutation(({ ctx, input }) =>
      foodService.removeMeasure(ctx.membership.organizationId, input.id),
    ),
});
