import { router } from "@/server/trpc/trpc";
import { organizationRouter } from "@/server/trpc/routers/organization";
import { catalogRouter } from "@/server/trpc/routers/catalog";

export const appRouter = router({
  organization: organizationRouter,
  catalog: catalogRouter,
});

export type AppRouter = typeof appRouter;
