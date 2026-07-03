import "server-only";
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { ZodError } from "zod";
import { getTenantContext } from "@/server/auth/tenant-context";
import { ConflictError, NotFoundError } from "@/server/errors";
import { DomainError } from "@/domain/shared/errors";
import { messages } from "@/messages/pt-br";

export async function createTRPCContext() {
  const tenant = await getTenantContext();
  return { tenant };
}

type Context = Awaited<ReturnType<typeof createTRPCContext>>;

const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodIssues: error.cause instanceof ZodError ? error.cause.issues : null,
      },
    };
  },
});

export const router = t.router;

/** Converte erros semânticos das camadas internas em códigos tRPC. */
const mapDomainErrors = t.middleware(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    if (error instanceof NotFoundError) {
      throw new TRPCError({ code: "NOT_FOUND", message: error.message });
    }
    if (error instanceof ConflictError) {
      throw new TRPCError({ code: "CONFLICT", message: error.message });
    }
    if (error instanceof DomainError) {
      throw new TRPCError({ code: "BAD_REQUEST", message: error.message });
    }
    throw error;
  }
});

export const publicProcedure = t.procedure.use(mapDomainErrors);

/** Exige sessão válida; o contexto passa a ter `tenant` não-nulo. */
export const protectedProcedure = publicProcedure.use(({ ctx, next }) => {
  if (!ctx.tenant) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: messages.errors.unauthorized,
    });
  }
  return next({ ctx: { ...ctx, tenant: ctx.tenant } });
});

/** Exige participação ativa em uma clínica; expõe `membership` tipado. */
export const orgProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (!ctx.tenant.membership) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: messages.errors.noOrganization,
    });
  }
  return next({ ctx: { ...ctx, membership: ctx.tenant.membership } });
});

/** Exige vínculo de paciente (portal); tudo restrito ao próprio prontuário. */
export const patientProcedure = protectedProcedure.use(({ ctx, next }) => {
  const profile = ctx.tenant.patientProfiles[0];
  if (!profile) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: messages.portal.noProfile,
    });
  }
  return next({ ctx: { ...ctx, patientProfile: profile } });
});
