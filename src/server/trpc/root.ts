import { router } from "@/server/trpc/trpc";
import { organizationRouter } from "@/server/trpc/routers/organization";
import { catalogRouter } from "@/server/trpc/routers/catalog";
import { foodRouter } from "@/server/trpc/routers/food";
import { recipeRouter } from "@/server/trpc/routers/recipe";
import { patientRouter } from "@/server/trpc/routers/patient";

export const appRouter = router({
  organization: organizationRouter,
  catalog: catalogRouter,
  food: foodRouter,
  recipe: recipeRouter,
  patient: patientRouter,
});

export type AppRouter = typeof appRouter;
