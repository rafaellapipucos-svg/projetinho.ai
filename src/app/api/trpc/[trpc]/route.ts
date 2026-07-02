import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "@/server/trpc/root";
import { createTRPCContext } from "@/server/trpc/trpc";
import { logger } from "@/lib/logger";

const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: createTRPCContext,
    onError({ error, path }) {
      logger.error({ path, code: error.code }, "trpc_error");
    },
  });

export { handler as GET, handler as POST };
