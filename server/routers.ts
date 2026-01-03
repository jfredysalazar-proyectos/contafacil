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
} from "./features";
import { pdfRouter } from "./pdf";
import { passwordResetRouter } from "./password-reset-router";

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
  pdf: pdfRouter,
  passwordReset: passwordResetRouter,
});

export type AppRouter = typeof appRouter;
