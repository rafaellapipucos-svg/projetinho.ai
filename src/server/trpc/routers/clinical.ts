import { router, orgProcedure } from "@/server/trpc/trpc";
import { clinicalService } from "@/server/services/clinical-service";
import {
  anamnesisRespondInput,
  anamnesisTemplateSaveInput,
  assessmentCreateInput,
  energyCreateInput,
  examCreateInput,
  patientIdInput,
} from "@/lib/schemas/clinical";
import { idParam } from "@/lib/schemas/catalog";

export const clinicalRouter = router({
  assessments: router({
    list: orgProcedure
      .input(patientIdInput)
      .query(({ ctx, input }) =>
        clinicalService.assessments.list(
          ctx.membership.organizationId,
          input.patientId,
        ),
      ),
    create: orgProcedure
      .input(assessmentCreateInput)
      .mutation(({ ctx, input }) =>
        clinicalService.assessments.create(
          ctx.membership.organizationId,
          ctx.tenant.user.id,
          input,
        ),
      ),
    remove: orgProcedure
      .input(idParam)
      .mutation(({ ctx, input }) =>
        clinicalService.assessments.remove(
          ctx.membership.organizationId,
          input.id,
        ),
      ),
  }),

  energy: router({
    list: orgProcedure
      .input(patientIdInput)
      .query(({ ctx, input }) =>
        clinicalService.energy.list(
          ctx.membership.organizationId,
          input.patientId,
        ),
      ),
    create: orgProcedure
      .input(energyCreateInput)
      .mutation(({ ctx, input }) =>
        clinicalService.energy.create(
          ctx.membership.organizationId,
          ctx.tenant.user.id,
          input,
        ),
      ),
    remove: orgProcedure
      .input(idParam)
      .mutation(({ ctx, input }) =>
        clinicalService.energy.remove(ctx.membership.organizationId, input.id),
      ),
  }),

  anamnesis: router({
    templates: orgProcedure.query(({ ctx }) =>
      clinicalService.anamnesis.listTemplates(ctx.membership.organizationId),
    ),
    saveTemplate: orgProcedure
      .input(anamnesisTemplateSaveInput)
      .mutation(({ ctx, input }) =>
        clinicalService.anamnesis.saveTemplate(
          ctx.membership.organizationId,
          input,
        ),
      ),
    deactivateTemplate: orgProcedure
      .input(idParam)
      .mutation(({ ctx, input }) =>
        clinicalService.anamnesis.deactivateTemplate(
          ctx.membership.organizationId,
          input.id,
        ),
      ),
    responses: orgProcedure
      .input(patientIdInput)
      .query(({ ctx, input }) =>
        clinicalService.anamnesis.listResponses(
          ctx.membership.organizationId,
          input.patientId,
        ),
      ),
    respond: orgProcedure
      .input(anamnesisRespondInput)
      .mutation(({ ctx, input }) =>
        clinicalService.anamnesis.respond(
          ctx.membership.organizationId,
          ctx.tenant.user.id,
          input,
        ),
      ),
    removeResponse: orgProcedure
      .input(idParam)
      .mutation(({ ctx, input }) =>
        clinicalService.anamnesis.removeResponse(
          ctx.membership.organizationId,
          input.id,
        ),
      ),
  }),

  exams: router({
    list: orgProcedure
      .input(patientIdInput)
      .query(({ ctx, input }) =>
        clinicalService.exams.list(
          ctx.membership.organizationId,
          input.patientId,
        ),
      ),
    create: orgProcedure
      .input(examCreateInput)
      .mutation(({ ctx, input }) =>
        clinicalService.exams.create(
          ctx.membership.organizationId,
          ctx.tenant.user.id,
          input,
        ),
      ),
    remove: orgProcedure
      .input(idParam)
      .mutation(({ ctx, input }) =>
        clinicalService.exams.remove(ctx.membership.organizationId, input.id),
      ),
  }),
});
