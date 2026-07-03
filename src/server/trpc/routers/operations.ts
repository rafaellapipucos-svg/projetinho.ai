import { router, orgProcedure } from "@/server/trpc/trpc";
import { operationsService } from "@/server/services/operations-service";
import {
  appointmentInput,
  appointmentRangeInput,
  appointmentStatusInput,
  appointmentUpdateInput,
  documentIssueInput,
  documentTemplateInput,
  messageSendInput,
  serviceInput,
  serviceUpdateInput,
} from "@/lib/schemas/operations";
import { idParam } from "@/lib/schemas/catalog";
import { patientIdInput } from "@/lib/schemas/clinical";

export const operationsRouter = router({
  services: router({
    list: orgProcedure.query(({ ctx }) =>
      operationsService.services.list(ctx.membership.organizationId),
    ),
    create: orgProcedure
      .input(serviceInput)
      .mutation(({ ctx, input }) =>
        operationsService.services.create(ctx.membership.organizationId, input),
      ),
    update: orgProcedure
      .input(serviceUpdateInput)
      .mutation(({ ctx, input: { id, ...data } }) =>
        operationsService.services.update(
          ctx.membership.organizationId,
          id,
          data,
        ),
      ),
    remove: orgProcedure
      .input(idParam)
      .mutation(({ ctx, input }) =>
        operationsService.services.remove(
          ctx.membership.organizationId,
          input.id,
        ),
      ),
  }),

  appointments: router({
    range: orgProcedure
      .input(appointmentRangeInput)
      .query(({ ctx, input }) =>
        operationsService.appointments.listRange(
          ctx.membership.organizationId,
          new Date(input.from),
          new Date(input.to),
        ),
      ),
    create: orgProcedure
      .input(appointmentInput)
      .mutation(({ ctx, input }) =>
        operationsService.appointments.create(
          ctx.membership.organizationId,
          ctx.tenant.user.id,
          input,
        ),
      ),
    update: orgProcedure
      .input(appointmentUpdateInput)
      .mutation(({ ctx, input: { id, ...data } }) =>
        operationsService.appointments.update(
          ctx.membership.organizationId,
          id,
          data,
        ),
      ),
    setStatus: orgProcedure
      .input(appointmentStatusInput)
      .mutation(({ ctx, input }) =>
        operationsService.appointments.setStatus(
          ctx.membership.organizationId,
          input.id,
          input.status,
        ),
      ),
  }),

  documents: router({
    templates: orgProcedure.query(({ ctx }) =>
      operationsService.documents.templates(ctx.membership.organizationId),
    ),
    saveTemplate: orgProcedure
      .input(documentTemplateInput)
      .mutation(({ ctx, input }) =>
        operationsService.documents.saveTemplate(
          ctx.membership.organizationId,
          input,
        ),
      ),
    deactivateTemplate: orgProcedure
      .input(idParam)
      .mutation(({ ctx, input }) =>
        operationsService.documents.deactivateTemplate(
          ctx.membership.organizationId,
          input.id,
        ),
      ),
    mergeContext: orgProcedure
      .input(patientIdInput)
      .query(({ ctx, input }) =>
        operationsService.documents.mergeContext(
          ctx.membership.organizationId,
          input.patientId,
          ctx.tenant.user.name,
        ),
      ),
    list: orgProcedure
      .input(patientIdInput)
      .query(({ ctx, input }) =>
        operationsService.documents.list(
          ctx.membership.organizationId,
          input.patientId,
        ),
      ),
    byId: orgProcedure
      .input(idParam)
      .query(({ ctx, input }) =>
        operationsService.documents.byId(
          ctx.membership.organizationId,
          input.id,
        ),
      ),
    issue: orgProcedure
      .input(documentIssueInput)
      .mutation(({ ctx, input }) =>
        operationsService.documents.issue(
          ctx.membership.organizationId,
          ctx.tenant.user.id,
          ctx.tenant.user.name,
          input,
        ),
      ),
    remove: orgProcedure
      .input(idParam)
      .mutation(({ ctx, input }) =>
        operationsService.documents.remove(
          ctx.membership.organizationId,
          input.id,
        ),
      ),
  }),

  messages: router({
    list: orgProcedure
      .input(patientIdInput)
      .query(({ ctx, input }) =>
        operationsService.messages.list(
          ctx.membership.organizationId,
          input.patientId,
          ctx.tenant.user.id,
        ),
      ),
    send: orgProcedure
      .input(messageSendInput)
      .mutation(({ ctx, input }) =>
        operationsService.messages.send(
          ctx.membership.organizationId,
          input.patientId,
          ctx.tenant.user.id,
          input.body,
        ),
      ),
  }),
});
