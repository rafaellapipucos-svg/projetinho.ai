import { router, orgProcedure } from "@/server/trpc/trpc";
import { financeService } from "@/server/services/finance-service";
import { dashboardService } from "@/server/services/dashboard-service";
import {
  paymentInput,
  paymentListInput,
  paymentUpdateInput,
} from "@/lib/schemas/finance";
import { idParam } from "@/lib/schemas/catalog";

export const financeRouter = router({
  dashboard: orgProcedure.query(({ ctx }) =>
    dashboardService.summary(ctx.membership.organizationId),
  ),
  list: orgProcedure
    .input(paymentListInput)
    .query(({ ctx, input }) =>
      financeService.list(ctx.membership.organizationId, input),
    ),
  totals: orgProcedure.query(({ ctx }) =>
    financeService.totals(ctx.membership.organizationId),
  ),
  create: orgProcedure
    .input(paymentInput)
    .mutation(({ ctx, input }) =>
      financeService.create(
        ctx.membership.organizationId,
        ctx.tenant.user.id,
        input,
      ),
    ),
  update: orgProcedure
    .input(paymentUpdateInput)
    .mutation(({ ctx, input: { id, ...data } }) =>
      financeService.update(ctx.membership.organizationId, id, data),
    ),
  remove: orgProcedure
    .input(idParam)
    .mutation(({ ctx, input }) =>
      financeService.remove(ctx.membership.organizationId, input.id),
    ),
});
