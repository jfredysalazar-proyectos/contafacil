import { systemRouter } from "./_core/systemRouter";
import { router } from "./_core/trpc";
import { authRouter } from "./auth";
import {
  productsRouter,
  inventoryRouter,
  customersRouter,
  suppliersRouter,
  salesRouter,
  expensesRouter,
  debtsRouter,
  statsRouter,
  categoriesRouter,
  quotationsRouter,
} from "./features";
import { pdfRouter } from "./pdf";
import { passwordResetRouter } from "./password-reset-router";
import { profileRouter } from "./profile-router";
import {
  rolesRouter,
  permissionsRouter,
  businessUsersRouter,
  activityRouter,
} from "./features-roles";

export const appRouter = router({
  system: systemRouter,
  auth: authRouter,
  products: productsRouter,
  inventory: inventoryRouter,
  customers: customersRouter,
  suppliers: suppliersRouter,
  sales: salesRouter,
  expenses: expensesRouter,
  debts: debtsRouter,
  stats: statsRouter,
  categories: categoriesRouter,
  quotations: quotationsRouter,
  pdf: pdfRouter,
  passwordReset: passwordResetRouter,
  profile: profileRouter,
  roles: rolesRouter,
  permissions: permissionsRouter,
  businessUsers: businessUsersRouter,
  activity: activityRouter,
});

export type AppRouter = typeof appRouter;
