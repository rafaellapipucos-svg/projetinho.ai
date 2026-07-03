import { router, orgProcedure } from "@/server/trpc/trpc";
import { planService } from "@/server/services/plan-service";
import {
  planApplyChangesInput,
  planCreateInput,
  planListByPatientInput,
  planSaveAsTemplateInput,
} from "@/lib/schemas/plan";
import { idParam } from "@/lib/schemas/catalog";

export const planRouter = router({
  create: orgProcedure
    .input(planCreateInput)
    .mutation(({ ctx, input }) =>
      planService.create(
        ctx.membership.organizationId,
        ctx.tenant.user.id,
        input,
      ),
    ),
  get: orgProcedure
    .input(idParam)
    .query(({ ctx, input }) =>
      planService.get(ctx.membership.organizationId, input.id),
    ),
  applyChanges: orgProcedure
    .input(planApplyChangesInput)
    .mutation(({ ctx, input }) =>
      planService.applyChanges(ctx.membership.organizationId, input),
    ),
  activate: orgProcedure
    .input(idParam)
    .mutation(({ ctx, input }) =>
      planService.activate(ctx.membership.organizationId, input.id),
    ),
  archive: orgProcedure
    .input(idParam)
    .mutation(({ ctx, input }) =>
      planService.archive(ctx.membership.organizationId, input.id),
    ),
  removeDraft: orgProcedure
    .input(idParam)
    .mutation(({ ctx, input }) =>
      planService.removeDraft(ctx.membership.organizationId, input.id),
    ),
  saveAsTemplate: orgProcedure
    .input(planSaveAsTemplateInput)
    .mutation(({ ctx, input }) =>
      planService.saveAsTemplate(
        ctx.membership.organizationId,
        ctx.tenant.user.id,
        input.planId,
        input.name,
      ),
    ),
  listByPatient: orgProcedure
    .input(planListByPatientInput)
    .query(({ ctx, input }) =>
      planService.listByPatient(ctx.membership.organizationId, input.patientId),
    ),
  listTemplates: orgProcedure.query(({ ctx }) =>
    planService.listTemplates(ctx.membership.organizationId),
  ),
});
