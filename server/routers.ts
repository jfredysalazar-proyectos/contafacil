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
  serialNumbersRouter,
} from "./features";
import { pdfRouter } from "./pdf";
import { passwordResetRouter } from "./password-reset-router";
import { profileRouter } from "./profile-router";
import { uploadRouter } from "./upload-router";
import { membershipRouter } from "./membership-router";
import {
  rolesRouter,
  permissionsRouter,
  businessUsersRouter,
  activityRouter,
} from "./features-roles";

export const appRouter = router({
  system: systemRouter,
  auth: authRouter,
  membership: membershipRouter,
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
  serialNumbers: serialNumbersRouter,
  pdf: pdfRouter,
  passwordReset: passwordResetRouter,
  profile: profileRouter,
  upload: uploadRouter,
  roles: rolesRouter,
  permissions: permissionsRouter,
  businessUsers: businessUsersRouter,
  activity: activityRouter,
});

export type AppRouter = typeof appRouter;
