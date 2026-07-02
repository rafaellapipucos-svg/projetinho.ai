import { router } from "@/server/trpc/trpc";
import { organizationRouter } from "@/server/trpc/routers/organization";

export const appRouter = router({
  organization: organizationRouter,
});

export type AppRouter = typeof appRouter;
