import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "@/server/trpc/root";
import { createTRPCContext } from "@/server/trpc/trpc";
import { logger } from "@/lib/logger";
import { clientIp, rateLimit } from "@/lib/rate-limit";

const handler = (req: Request) => {
  if (!rateLimit(`trpc:${clientIp(req)}`)) {
    return new Response(JSON.stringify({ error: "rate_limited" }), {
      status: 429,
      headers: { "Content-Type": "application/json", "Retry-After": "60" },
    });
  }
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: createTRPCContext,
    onError({ error, path }) {
      logger.error({ path, code: error.code }, "trpc_error");
    },
  });
};

export { handler as GET, handler as POST };
