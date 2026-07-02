import { router, orgProcedure } from "@/server/trpc/trpc";
import { recipeService } from "@/server/services/recipe-service";
import { recipeInput, recipeUpdateInput } from "@/lib/schemas/recipe";
import { idParam } from "@/lib/schemas/catalog";

export const recipeRouter = router({
  list: orgProcedure.query(({ ctx }) =>
    recipeService.list(ctx.membership.organizationId),
  ),
  byId: orgProcedure
    .input(idParam)
    .query(({ ctx, input }) =>
      recipeService.byId(ctx.membership.organizationId, input.id),
    ),
  create: orgProcedure
    .input(recipeInput)
    .mutation(({ ctx, input }) =>
      recipeService.create(
        ctx.membership.organizationId,
        ctx.tenant.user.id,
        input,
      ),
    ),
  update: orgProcedure
    .input(recipeUpdateInput)
    .mutation(({ ctx, input: { id, ...data } }) =>
      recipeService.update(ctx.membership.organizationId, id, data),
    ),
  deactivate: orgProcedure
    .input(idParam)
    .mutation(({ ctx, input }) =>
      recipeService.deactivate(ctx.membership.organizationId, input.id),
    ),
});
