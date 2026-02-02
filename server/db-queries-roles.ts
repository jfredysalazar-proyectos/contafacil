import { eq, and, inArray } from "drizzle-orm";
import { getDb } from "./db";
import {
  roles,
  permissions,
  rolePermissions,
  businessUsers,
  userActivityLog,
  type Role,
  type InsertRole,
  type Permission,
  type InsertPermission,
  type BusinessUser,
  type InsertBusinessUser,
  type UserActivityLog,
  type InsertUserActivityLog,
} from "../drizzle/schema";

/**
 * ============================================
 * FUNCIONES DE CONSULTA PARA ROLES
 * ============================================
 */

export async function getAllRoles(): Promise<Role[]> {
  const db = getDb();
  return db.select().from(roles);
}

export async function getRoleById(id: number): Promise<Role | undefined> {
  const db = getDb();
  const [role] = await db.select().from(roles).where(eq(roles.id, id));
  return role;
}

export async function getRoleByName(name: string): Promise<Role | undefined> {
  const db = getDb();
  const [role] = await db.select().from(roles).where(eq(roles.name, name));
  return role;
}

export async function createRole(data: InsertRole): Promise<Role> {
  const db = getDb();
  const [result] = await db.insert(roles).values(data);
  return getRoleById(Number(result.insertId)) as Promise<Role>;
}

export async function updateRole(id: number, data: Partial<InsertRole>): Promise<Role> {
  const db = getDb();
  await db.update(roles).set(data).where(eq(roles.id, id));
  return getRoleById(id) as Promise<Role>;
}

export async function deleteRole(id: number): Promise<void> {
  const db = getDb();
  // Verificar que no sea un rol del sistema
  const role = await getRoleById(id);
  if (role?.isSystem) {
    throw new Error("No se pueden eliminar roles del sistema");
  }
  await db.delete(roles).where(eq(roles.id, id));
}

/**
 * ============================================
 * FUNCIONES DE CONSULTA PARA PERMISOS
 * ============================================
 */

export async function getAllPermissions(): Promise<Permission[]> {
  const db = getDb();
  return db.select().from(permissions);
}

export async function getPermissionsByModule(module: string): Promise<Permission[]> {
  const db = getDb();
  return db.select().from(permissions).where(eq(permissions.module, module));
}

export async function getPermissionsByRoleId(roleId: number): Promise<Permission[]> {
  const db = getDb();
  const result = await db
    .select({
      id: permissions.id,
      name: permissions.name,
      displayName: permissions.displayName,
      module: permissions.module,
      description: permissions.description,
      createdAt: permissions.createdAt,
    })
    .from(rolePermissions)
    .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
    .where(eq(rolePermissions.roleId, roleId));
  
  return result;
}

export async function assignPermissionsToRole(roleId: number, permissionIds: number[]): Promise<void> {
  const db = getDb();
  
  // Eliminar permisos existentes
  await db.delete(rolePermissions).where(eq(rolePermissions.roleId, roleId));
  
  // Asignar nuevos permisos
  if (permissionIds.length > 0) {
    const values = permissionIds.map(permissionId => ({
      roleId,
      permissionId,
    }));
    await db.insert(rolePermissions).values(values);
  }
}

/**
 * ============================================
 * FUNCIONES DE CONSULTA PARA USUARIOS DEL NEGOCIO
 * ============================================
 */

export async function getBusinessUsersByOwnerId(ownerId: number): Promise<BusinessUser[]> {
  const db = getDb();
  return db.select().from(businessUsers).where(eq(businessUsers.ownerId, ownerId));
}

export async function getBusinessUserById(id: number): Promise<BusinessUser | undefined> {
  const db = getDb();
  const [user] = await db.select().from(businessUsers).where(eq(businessUsers.id, id));
  return user;
}

export async function getBusinessUserByEmail(email: string): Promise<BusinessUser | undefined> {
  const db = getDb();
  const [user] = await db.select().from(businessUsers).where(eq(businessUsers.email, email));
  return user;
}

export async function createBusinessUser(data: InsertBusinessUser): Promise<BusinessUser> {
  const db = getDb();
  const [result] = await db.insert(businessUsers).values(data);
  return getBusinessUserById(Number(result.insertId)) as Promise<BusinessUser>;
}

export async function updateBusinessUser(id: number, data: Partial<InsertBusinessUser>): Promise<BusinessUser> {
  const db = getDb();
  await db.update(businessUsers).set(data).where(eq(businessUsers.id, id));
  return getBusinessUserById(id) as Promise<BusinessUser>;
}

export async function deleteBusinessUser(id: number): Promise<void> {
  const db = getDb();
  await db.delete(businessUsers).where(eq(businessUsers.id, id));
}

export async function toggleBusinessUserStatus(id: number, isActive: boolean): Promise<BusinessUser> {
  return updateBusinessUser(id, { isActive });
}

/**
 * ============================================
 * FUNCIONES DE CONSULTA PARA REGISTRO DE ACTIVIDAD
 * ============================================
 */

export async function createActivityLog(data: InsertUserActivityLog): Promise<void> {
  const db = getDb();
  await db.insert(userActivityLog).values(data);
}

export async function getActivityLogByUserId(
  userId: number,
  userType: string,
  limit: number = 100
): Promise<UserActivityLog[]> {
  const db = getDb();
  return db
    .select()
    .from(userActivityLog)
    .where(and(
      eq(userActivityLog.userId, userId),
      eq(userActivityLog.userType, userType)
    ))
    .orderBy(userActivityLog.createdAt)
    .limit(limit);
}

export async function getActivityLogByModule(
  module: string,
  limit: number = 100
): Promise<UserActivityLog[]> {
  const db = getDb();
  return db
    .select()
    .from(userActivityLog)
    .where(eq(userActivityLog.module, module))
    .orderBy(userActivityLog.createdAt)
    .limit(limit);
}

export async function getAllActivityLogs(limit: number = 100): Promise<UserActivityLog[]> {
  const db = getDb();
  return db
    .select()
    .from(userActivityLog)
    .orderBy(userActivityLog.createdAt)
    .limit(limit);
}

/**
 * ============================================
 * FUNCIONES AUXILIARES
 * ============================================
 */

export async function getUserPermissions(userId: number, userType: 'owner' | 'employee'): Promise<string[]> {
  const db = getDb();
  
  if (userType === 'owner') {
    // Los dueños tienen todos los permisos
    const allPermissions = await getAllPermissions();
    return allPermissions.map(p => p.name);
  }
  
  // Para empleados, obtener permisos según su rol
  const user = await getBusinessUserById(userId);
  if (!user) {
    return [];
  }
  
  const userPermissions = await getPermissionsByRoleId(user.roleId);
  return userPermissions.map(p => p.name);
}

export async function hasPermission(
  userId: number,
  userType: 'owner' | 'employee',
  permissionName: string
): Promise<boolean> {
  const userPermissions = await getUserPermissions(userId, userType);
  return userPermissions.includes(permissionName);
}

export async function hasAnyPermission(
  userId: number,
  userType: 'owner' | 'employee',
  permissionNames: string[]
): Promise<boolean> {
  const userPermissions = await getUserPermissions(userId, userType);
  return permissionNames.some(p => userPermissions.includes(p));
}

export async function hasAllPermissions(
  userId: number,
  userType: 'owner' | 'employee',
  permissionNames: string[]
): Promise<boolean> {
  const userPermissions = await getUserPermissions(userId, userType);
  return permissionNames.every(p => userPermissions.includes(p));
}
