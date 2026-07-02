import { router, orgProcedure } from "@/server/trpc/trpc";
import { patientService } from "@/server/services/patient-service";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import {
  attachmentRegisterInput,
  patientInput,
  patientListInput,
  patientUpdateInput,
} from "@/lib/schemas/patient";
import { idParam } from "@/lib/schemas/catalog";

export const patientRouter = router({
  list: orgProcedure
    .input(patientListInput)
    .query(({ ctx, input }) =>
      patientService.list(ctx.membership.organizationId, input.term),
    ),
  byId: orgProcedure
    .input(idParam)
    .query(({ ctx, input }) =>
      patientService.byId(ctx.membership.organizationId, input.id),
    ),
  create: orgProcedure.input(patientInput).mutation(async ({ ctx, input }) => {
    const patient = await patientService.create(
      ctx.membership.organizationId,
      ctx.tenant.user.id,
      input,
    );
    return { id: patient.id };
  }),
  update: orgProcedure
    .input(patientUpdateInput)
    .mutation(({ ctx, input: { id, ...data } }) =>
      patientService.update(ctx.membership.organizationId, id, data),
    ),
  archive: orgProcedure
    .input(idParam)
    .mutation(({ ctx, input }) =>
      patientService.archive(ctx.membership.organizationId, input.id),
    ),

  attachments: router({
    list: orgProcedure
      .input(idParam)
      .query(({ ctx, input }) =>
        patientService.attachments.list(
          ctx.membership.organizationId,
          input.id,
        ),
      ),
    register: orgProcedure
      .input(attachmentRegisterInput)
      .mutation(({ ctx, input }) =>
        patientService.attachments.register(
          ctx.membership.organizationId,
          ctx.tenant.user.id,
          input,
        ),
      ),
    remove: orgProcedure.input(idParam).mutation(async ({ ctx, input }) => {
      const { storagePath } = await patientService.attachments.remove(
        ctx.membership.organizationId,
        input.id,
      );
      // Remoção no Storage é best-effort: a linha já saiu; um arquivo órfão
      // não vaza (policies por org) e é registrado para limpeza.
      const supabase = await createClient();
      const { error } = await supabase.storage
        .from("attachments")
        .remove([storagePath]);
      if (error) {
        logger.warn(
          { storagePath, error: error.message },
          "attachment_storage_orphan",
        );
      }
    }),
  }),
});
