import { router } from "@/server/trpc/trpc";
import { organizationRouter } from "@/server/trpc/routers/organization";
import { catalogRouter } from "@/server/trpc/routers/catalog";
import { foodRouter } from "@/server/trpc/routers/food";
import { recipeRouter } from "@/server/trpc/routers/recipe";
import { patientRouter } from "@/server/trpc/routers/patient";
import { planRouter } from "@/server/trpc/routers/plan";
import { portalRouter } from "@/server/trpc/routers/portal";

export const appRouter = router({
  organization: organizationRouter,
  catalog: catalogRouter,
  food: foodRouter,
  recipe: recipeRouter,
  patient: patientRouter,
  plan: planRouter,
  portal: portalRouter,
});

export type AppRouter = typeof appRouter;
