import {
  router,
  patientProcedure,
  protectedProcedure,
} from "@/server/trpc/trpc";
import { portalService } from "@/server/services/portal-service";
import { claimInviteInput, diaryAddInput } from "@/lib/schemas/portal";
import { idParam } from "@/lib/schemas/catalog";

export const portalRouter = router({
  me: patientProcedure.query(({ ctx }) => portalService.me(ctx.patientProfile)),
  activePlan: patientProcedure.query(({ ctx }) =>
    portalService.activePlan(ctx.patientProfile),
  ),
  diary: router({
    list: patientProcedure.query(({ ctx }) =>
      portalService.diary.list(ctx.patientProfile),
    ),
    add: patientProcedure
      .input(diaryAddInput)
      .mutation(({ ctx, input }) =>
        portalService.diary.add(ctx.patientProfile, ctx.tenant.user.id, input),
      ),
    remove: patientProcedure
      .input(idParam)
      .mutation(({ ctx, input }) =>
        portalService.diary.remove(ctx.patientProfile, input.id),
      ),
  }),
  claimInvite: protectedProcedure
    .input(claimInviteInput)
    .mutation(({ ctx, input }) =>
      portalService.claimInvite(ctx.tenant.user.id, input.token),
    ),
});
