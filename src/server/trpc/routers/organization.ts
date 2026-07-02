import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { router, protectedProcedure, orgProcedure } from "@/server/trpc/trpc";
import { organizationService } from "@/server/services/organization-service";
import { messages } from "@/messages/pt-br";

export const organizationRouter = router({
  current: orgProcedure.query(({ ctx }) => ({
    id: ctx.membership.organizationId,
    name: ctx.membership.organizationName,
    slug: ctx.membership.organizationSlug,
    roleKey: ctx.membership.roleKey,
  })),
  create: protectedProcedure
    .input(
      z.object({
        name: z
          .string()
          .trim()
          .min(2, messages.validation.orgNameMin)
          .max(80, messages.validation.orgNameMax),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.tenant.membership) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: messages.errors.alreadyInOrganization,
        });
      }
      const organization = await organizationService.createForUser(
        ctx.tenant.user.id,
        input,
      );
      return {
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
      };
    }),
});
