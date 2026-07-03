import { router, orgProcedure } from "@/server/trpc/trpc";
import { equivalenceService } from "@/server/services/equivalence-service";
import { equivalenceGroupInput } from "@/lib/schemas/equivalence";
import { idParam } from "@/lib/schemas/catalog";

export const equivalenceRouter = router({
  list: orgProcedure.query(({ ctx }) =>
    equivalenceService.list(ctx.membership.organizationId),
  ),
  save: orgProcedure
    .input(equivalenceGroupInput)
    .mutation(({ ctx, input }) =>
      equivalenceService.save(ctx.membership.organizationId, input),
    ),
  remove: orgProcedure
    .input(idParam)
    .mutation(({ ctx, input }) =>
      equivalenceService.remove(ctx.membership.organizationId, input.id),
    ),
});
