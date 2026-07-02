import "server-only";
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { ZodError } from "zod";
import { getTenantContext } from "@/server/auth/tenant-context";
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
export const publicProcedure = t.procedure;

/** Exige sessão válida; o contexto passa a ter `tenant` não-nulo. */
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.tenant) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: messages.errors.unauthorized,
    });
  }
  return next({ ctx: { ...ctx, tenant: ctx.tenant } });
});
