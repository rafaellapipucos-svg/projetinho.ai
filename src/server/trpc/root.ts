import { router } from "@/server/trpc/trpc";
import { organizationRouter } from "@/server/trpc/routers/organization";
import { catalogRouter } from "@/server/trpc/routers/catalog";
import { foodRouter } from "@/server/trpc/routers/food";
import { recipeRouter } from "@/server/trpc/routers/recipe";
import { patientRouter } from "@/server/trpc/routers/patient";
import { planRouter } from "@/server/trpc/routers/plan";
import { portalRouter } from "@/server/trpc/routers/portal";
import { clinicalRouter } from "@/server/trpc/routers/clinical";
import { operationsRouter } from "@/server/trpc/routers/operations";
import { equivalenceRouter } from "@/server/trpc/routers/equivalence";
import { financeRouter } from "@/server/trpc/routers/finance";

export const appRouter = router({
  organization: organizationRouter,
  catalog: catalogRouter,
  food: foodRouter,
  recipe: recipeRouter,
  patient: patientRouter,
  plan: planRouter,
  portal: portalRouter,
  clinical: clinicalRouter,
  operations: operationsRouter,
  equivalence: equivalenceRouter,
  finance: financeRouter,
});

export type AppRouter = typeof appRouter;
