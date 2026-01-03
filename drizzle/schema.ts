import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, decimal, boolean, index } from "drizzle-orm/mysql-core";
import { relations } from "drizzle-orm";

/**
 * Tabla de usuarios con autenticación independiente
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  passwordHash: text("passwordHash").notNull(),
  name: text("name").notNull(),
  phone: varchar("phone", { length: 20 }),
  businessName: text("businessName"),
  logoUrl: text("logoUrl"),
  nit: varchar("nit", { length: 20 }),
  address: text("address"),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Tabla de tokens de recuperación de contraseña
 * Los tokens expiran después de 15 minutos
 */
export const passwordResetTokens = mysqlTable("password_reset_tokens", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  token: varchar("token", { length: 255 }).notNull().unique(),
  expiresAt: timestamp("expiresAt").notNull(),
  used: boolean("used").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
export type InsertPasswordResetToken = typeof passwordResetTokens.$inferInsert;

/**
 * Tabla de clientes
 */
export const customers = mysqlTable("customers", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: text("name").notNull(),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 20 }),
  address: text("address"),
  idNumber: varchar("idNumber", { length: 50 }),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  userIdIdx: index("customers_userId_idx").on(table.userId),
}));

export type Customer = typeof customers.$inferSelect;
export type InsertCustomer = typeof customers.$inferInsert;

/**
 * Tabla de proveedores
 */
export const suppliers = mysqlTable("suppliers", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: text("name").notNull(),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 20 }),
  address: text("address"),
  nit: varchar("nit", { length: 20 }),
  contactPerson: text("contactPerson"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  userIdIdx: index("suppliers_userId_idx").on(table.userId),
}));

export type Supplier = typeof suppliers.$inferSelect;
export type InsertSupplier = typeof suppliers.$inferInsert;

/**
 * Tabla de categorías de productos
 */
export const productCategories = mysqlTable("productCategories", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index("productCategories_userId_idx").on(table.userId),
}));

export type ProductCategory = typeof productCategories.$inferSelect;
export type InsertProductCategory = typeof productCategories.$inferInsert;

/**
 * Tabla de productos
 */
export const products = mysqlTable("products", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  categoryId: int("categoryId"),
  name: text("name").notNull(),
  description: text("description"),
  sku: varchar("sku", { length: 100 }),
  barcode: varchar("barcode", { length: 100 }),
  price: decimal("price", { precision: 15, scale: 2 }).notNull(),
  cost: decimal("cost", { precision: 15, scale: 2 }),
  hasVariations: boolean("hasVariations").default(false).notNull(),
  stockAlert: int("stockAlert").default(10),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  userIdIdx: index("products_userId_idx").on(table.userId),
  categoryIdIdx: index("products_categoryId_idx").on(table.categoryId),
}));

export type Product = typeof products.$inferSelect;
export type InsertProduct = typeof products.$inferInsert;

/**
 * Tabla de variaciones de productos (tallas, colores, etc.)
 */
export const productVariations = mysqlTable("productVariations", {
  id: int("id").autoincrement().primaryKey(),
  productId: int("productId").notNull(),
  name: text("name").notNull(),
  sku: varchar("sku", { length: 100 }),
  barcode: varchar("barcode", { length: 100 }),
  price: decimal("price", { precision: 15, scale: 2 }),
  stock: int("stock").default(0).notNull(),
  attributes: text("attributes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  productIdIdx: index("productVariations_productId_idx").on(table.productId),
}));

export type ProductVariation = typeof productVariations.$inferSelect;
export type InsertProductVariation = typeof productVariations.$inferInsert;

/**
 * Tabla de inventario
 */
export const inventory = mysqlTable("inventory", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  productId: int("productId").notNull(),
  variationId: int("variationId"),
  stock: int("stock").default(0).notNull(),
  lastRestockDate: timestamp("lastRestockDate"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  userIdIdx: index("inventory_userId_idx").on(table.userId),
  productIdIdx: index("inventory_productId_idx").on(table.productId),
}));

export type Inventory = typeof inventory.$inferSelect;
export type InsertInventory = typeof inventory.$inferInsert;

/**
 * Tabla de ventas
 */
export const sales = mysqlTable("sales", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  customerId: int("customerId"),
  saleNumber: varchar("saleNumber", { length: 50 }).notNull(),
  saleDate: timestamp("saleDate").notNull(),
  subtotal: decimal("subtotal", { precision: 15, scale: 2 }).notNull(),
  tax: decimal("tax", { precision: 15, scale: 2 }).default("0").notNull(),
  discount: decimal("discount", { precision: 15, scale: 2 }).default("0").notNull(),
  total: decimal("total", { precision: 15, scale: 2 }).notNull(),
  paymentMethod: mysqlEnum("paymentMethod", ["cash", "card", "transfer", "credit"]).notNull(),
  status: mysqlEnum("status", ["completed", "pending", "cancelled"]).default("completed").notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  userIdIdx: index("sales_userId_idx").on(table.userId),
  customerIdIdx: index("sales_customerId_idx").on(table.customerId),
  saleDateIdx: index("sales_saleDate_idx").on(table.saleDate),
}));

export type Sale = typeof sales.$inferSelect;
export type InsertSale = typeof sales.$inferInsert;

/**
 * Tabla de items de venta
 */
export const saleItems = mysqlTable("saleItems", {
  id: int("id").autoincrement().primaryKey(),
  saleId: int("saleId").notNull(),
  productId: int("productId").notNull(),
  variationId: int("variationId"),
  productName: text("productName").notNull(),
  quantity: int("quantity").notNull(),
  unitPrice: decimal("unitPrice", { precision: 15, scale: 2 }).notNull(),
  subtotal: decimal("subtotal", { precision: 15, scale: 2 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  saleIdIdx: index("saleItems_saleId_idx").on(table.saleId),
}));

export type SaleItem = typeof saleItems.$inferSelect;
export type InsertSaleItem = typeof saleItems.$inferInsert;

/**
 * Tabla de categorías de gastos
 */
export const expenseCategories = mysqlTable("expenseCategories", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index("expenseCategories_userId_idx").on(table.userId),
}));

export type ExpenseCategory = typeof expenseCategories.$inferSelect;
export type InsertExpenseCategory = typeof expenseCategories.$inferInsert;

/**
 * Tabla de gastos
 */
export const expenses = mysqlTable("expenses", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  categoryId: int("categoryId"),
  supplierId: int("supplierId"),
  description: text("description").notNull(),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  expenseDate: timestamp("expenseDate").notNull(),
  paymentMethod: mysqlEnum("paymentMethod", ["cash", "card", "transfer", "credit"]).notNull(),
  receiptNumber: varchar("receiptNumber", { length: 100 }),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  userIdIdx: index("expenses_userId_idx").on(table.userId),
  categoryIdIdx: index("expenses_categoryId_idx").on(table.categoryId),
  expenseDateIdx: index("expenses_expenseDate_idx").on(table.expenseDate),
}));

export type Expense = typeof expenses.$inferSelect;
export type InsertExpense = typeof expenses.$inferInsert;

/**
 * Tabla de deudas por cobrar (clientes)
 */
export const receivables = mysqlTable("receivables", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  customerId: int("customerId").notNull(),
  saleId: int("saleId"),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  paidAmount: decimal("paidAmount", { precision: 15, scale: 2 }).default("0").notNull(),
  remainingAmount: decimal("remainingAmount", { precision: 15, scale: 2 }).notNull(),
  dueDate: timestamp("dueDate"),
  status: mysqlEnum("status", ["pending", "partial", "paid", "overdue"]).default("pending").notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  userIdIdx: index("receivables_userId_idx").on(table.userId),
  customerIdIdx: index("receivables_customerId_idx").on(table.customerId),
  dueDateIdx: index("receivables_dueDate_idx").on(table.dueDate),
}));

export type Receivable = typeof receivables.$inferSelect;
export type InsertReceivable = typeof receivables.$inferInsert;

/**
 * Tabla de deudas por pagar (proveedores)
 */
export const payables = mysqlTable("payables", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  supplierId: int("supplierId").notNull(),
  expenseId: int("expenseId"),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  paidAmount: decimal("paidAmount", { precision: 15, scale: 2 }).default("0").notNull(),
  remainingAmount: decimal("remainingAmount", { precision: 15, scale: 2 }).notNull(),
  dueDate: timestamp("dueDate"),
  status: mysqlEnum("status", ["pending", "partial", "paid", "overdue"]).default("pending").notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  userIdIdx: index("payables_userId_idx").on(table.userId),
  supplierIdIdx: index("payables_supplierId_idx").on(table.supplierId),
  dueDateIdx: index("payables_dueDate_idx").on(table.dueDate),
}));

export type Payable = typeof payables.$inferSelect;
export type InsertPayable = typeof payables.$inferInsert;

/**
 * Tabla de pagos (para deudas por cobrar y por pagar)
 */
export const payments = mysqlTable("payments", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  receivableId: int("receivableId"),
  payableId: int("payableId"),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  paymentDate: timestamp("paymentDate").notNull(),
  paymentMethod: mysqlEnum("paymentMethod", ["cash", "card", "transfer"]).notNull(),
  reference: varchar("reference", { length: 100 }),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index("payments_userId_idx").on(table.userId),
  receivableIdIdx: index("payments_receivableId_idx").on(table.receivableId),
  payableIdIdx: index("payments_payableId_idx").on(table.payableId),
}));

export type Payment = typeof payments.$inferSelect;
export type InsertPayment = typeof payments.$inferInsert;

/**
 * Tabla de comprobantes generados
 */
export const receipts = mysqlTable("receipts", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  saleId: int("saleId").notNull(),
  receiptNumber: varchar("receiptNumber", { length: 50 }).notNull(),
  fileKey: text("fileKey").notNull(),
  fileUrl: text("fileUrl").notNull(),
  generatedAt: timestamp("generatedAt").defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index("receipts_userId_idx").on(table.userId),
  saleIdIdx: index("receipts_saleId_idx").on(table.saleId),
}));

export type Receipt = typeof receipts.$inferSelect;
export type InsertReceipt = typeof receipts.$inferInsert;

/**
 * Tabla de reportes generados
 */
export const reports = mysqlTable("reports", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  reportType: mysqlEnum("reportType", ["sales", "expenses", "inventory", "debts", "profitability"]).notNull(),
  title: text("title").notNull(),
  startDate: timestamp("startDate"),
  endDate: timestamp("endDate"),
  fileKey: text("fileKey").notNull(),
  fileUrl: text("fileUrl").notNull(),
  generatedAt: timestamp("generatedAt").defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index("reports_userId_idx").on(table.userId),
}));

export type Report = typeof reports.$inferSelect;
export type InsertReport = typeof reports.$inferInsert;

/**
 * Tabla de configuración de alertas
 */
export const alertSettings = mysqlTable("alertSettings", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  lowStockEnabled: boolean("lowStockEnabled").default(true).notNull(),
  lowStockThreshold: int("lowStockThreshold").default(10).notNull(),
  debtDueEnabled: boolean("debtDueEnabled").default(true).notNull(),
  debtDueDays: int("debtDueDays").default(7).notNull(),
  largeSaleEnabled: boolean("largeSaleEnabled").default(true).notNull(),
  largeSaleThreshold: decimal("largeSaleThreshold", { precision: 15, scale: 2 }).default("1000000").notNull(),
  notificationEmail: varchar("notificationEmail", { length: 320 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  userIdIdx: index("alertSettings_userId_idx").on(table.userId),
}));

export type AlertSetting = typeof alertSettings.$inferSelect;
export type InsertAlertSetting = typeof alertSettings.$inferInsert;

/**
 * Tabla de movimientos de inventario
 * Registra todas las entradas y salidas de stock con información del proveedor y costo
 */
export const inventoryMovements = mysqlTable("inventoryMovements", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  productId: int("productId").notNull(),
  variationId: int("variationId"),
  supplierId: int("supplierId"),
  saleId: int("saleId"),
  movementType: mysqlEnum("movementType", ["in", "out", "adjustment"]).notNull(),
  quantity: int("quantity").notNull(),
  unitCost: decimal("unitCost", { precision: 15, scale: 2 }),
  totalCost: decimal("totalCost", { precision: 15, scale: 2 }),
  reason: text("reason"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index("inventoryMovements_userId_idx").on(table.userId),
  productIdIdx: index("inventoryMovements_productId_idx").on(table.productId),
  supplierIdIdx: index("inventoryMovements_supplierId_idx").on(table.supplierId),
  saleIdIdx: index("inventoryMovements_saleId_idx").on(table.saleId),
}));

export type InventoryMovement = typeof inventoryMovements.$inferSelect;
export type InsertInventoryMovement = typeof inventoryMovements.$inferInsert;
