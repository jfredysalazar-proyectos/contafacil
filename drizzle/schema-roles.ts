import { int, mysqlTable, text, timestamp, varchar, boolean, index } from "drizzle-orm/mysql-core";

/**
 * Tabla de roles del sistema
 * Roles predefinidos: admin, vendedor, contador, almacenista
 */
export const roles = mysqlTable("roles", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 50 }).notNull().unique(),
  displayName: text("displayName").notNull(),
  description: text("description"),
  isSystem: boolean("isSystem").default(false).notNull(), // Roles del sistema no se pueden eliminar
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Role = typeof roles.$inferSelect;
export type InsertRole = typeof roles.$inferInsert;

/**
 * Tabla de permisos del sistema
 * Permisos granulares para cada módulo
 */
export const permissions = mysqlTable("permissions", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull().unique(),
  displayName: text("displayName").notNull(),
  module: varchar("module", { length: 50 }).notNull(), // ventas, productos, clientes, etc.
  description: text("description"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  moduleIdx: index("permissions_module_idx").on(table.module),
}));

export type Permission = typeof permissions.$inferSelect;
export type InsertPermission = typeof permissions.$inferInsert;

/**
 * Tabla de relación entre roles y permisos (muchos a muchos)
 */
export const rolePermissions = mysqlTable("rolePermissions", {
  id: int("id").autoincrement().primaryKey(),
  roleId: int("roleId").notNull(),
  permissionId: int("permissionId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  roleIdIdx: index("rolePermissions_roleId_idx").on(table.roleId),
  permissionIdIdx: index("rolePermissions_permissionId_idx").on(table.permissionId),
  uniqueRolePermission: index("rolePermissions_unique").on(table.roleId, table.permissionId),
}));

export type RolePermission = typeof rolePermissions.$inferSelect;
export type InsertRolePermission = typeof rolePermissions.$inferInsert;

/**
 * Tabla de usuarios del negocio (empleados)
 * Relacionados con el usuario principal (dueño del negocio)
 */
export const businessUsers = mysqlTable("businessUsers", {
  id: int("id").autoincrement().primaryKey(),
  ownerId: int("ownerId").notNull(), // ID del usuario dueño del negocio
  roleId: int("roleId").notNull(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  passwordHash: text("passwordHash").notNull(),
  name: text("name").notNull(),
  phone: varchar("phone", { length: 20 }),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn"),
}, (table) => ({
  ownerIdIdx: index("businessUsers_ownerId_idx").on(table.ownerId),
  roleIdIdx: index("businessUsers_roleId_idx").on(table.roleId),
}));

export type BusinessUser = typeof businessUsers.$inferSelect;
export type InsertBusinessUser = typeof businessUsers.$inferInsert;

/**
 * Tabla de registro de actividad de usuarios
 * Para auditoría y seguimiento
 */
export const userActivityLog = mysqlTable("userActivityLog", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(), // Puede ser ownerId o businessUserId
  userType: varchar("userType", { length: 20 }).notNull(), // 'owner' o 'employee'
  action: varchar("action", { length: 100 }).notNull(), // 'create_sale', 'update_product', etc.
  module: varchar("module", { length: 50 }).notNull(), // 'ventas', 'productos', etc.
  details: text("details"), // JSON con detalles de la acción
  ipAddress: varchar("ipAddress", { length: 45 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index("userActivityLog_userId_idx").on(table.userId),
  moduleIdx: index("userActivityLog_module_idx").on(table.module),
  createdAtIdx: index("userActivityLog_createdAt_idx").on(table.createdAt),
}));

export type UserActivityLog = typeof userActivityLog.$inferSelect;
export type InsertUserActivityLog = typeof userActivityLog.$inferInsert;
