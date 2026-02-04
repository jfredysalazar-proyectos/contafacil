import { z } from "zod";
import { protectedProcedure, router } from "./_core/trpc";
import * as roleQueries from "./db-queries-roles";
import { TRPCError } from "@trpc/server";
import bcrypt from "bcryptjs";

/**
 * ============================================
 * ROUTER DE ROLES
 * ============================================
 */

export const rolesRouter = router({
  // Listar todos los roles
  list: protectedProcedure.query(async () => {
    return await roleQueries.getAllRoles();
  }),

  // Obtener un rol por ID con sus permisos
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const role = await roleQueries.getRoleById(input.id);
      if (!role) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Rol no encontrado",
        });
      }
      
      const permissions = await roleQueries.getPermissionsByRoleId(input.id);
      
      return {
        ...role,
        permissions,
      };
    }),

  // Crear un nuevo rol
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(50),
        displayName: z.string().min(1),
        description: z.string().optional(),
        permissionIds: z.array(z.number()).optional().default([]),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // El owner (administrador del sistema) siempre puede crear roles
      // No se verifica permisos para owners

      const { permissionIds, ...roleData } = input;
      
      // Crear el rol
      const role = await roleQueries.createRole({
        ...roleData,
        isSystem: false,
      });

      // Asignar permisos si se proporcionaron
      if (permissionIds.length > 0) {
        await roleQueries.assignPermissionsToRole(role.id, permissionIds);
      }

      // Registrar actividad
      await roleQueries.createActivityLog({
        userId: ctx.user.id,
        userType: 'owner',
        action: 'create_role',
        module: 'usuarios',
        details: JSON.stringify({ roleId: role.id, name: role.name }),
      });

      return role;
    }),

  // Actualizar un rol existente
  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        displayName: z.string().min(1).optional(),
        description: z.string().optional(),
        permissionIds: z.array(z.number()).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // El owner (administrador del sistema) siempre puede actualizar roles
      // No se verifica permisos para owners

      const { id, permissionIds, ...updateData } = input;

      // Verificar que el rol existe y no es del sistema
      const role = await roleQueries.getRoleById(id);
      if (!role) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Rol no encontrado",
        });
      }

      if (role.isSystem) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "No se pueden modificar roles del sistema",
        });
      }

      // Actualizar el rol
      const updatedRole = await roleQueries.updateRole(id, updateData);

      // Actualizar permisos si se proporcionaron
      if (permissionIds !== undefined) {
        await roleQueries.assignPermissionsToRole(id, permissionIds);
      }

      // Registrar actividad
      await roleQueries.createActivityLog({
        userId: ctx.user.id,
        userType: 'owner',
        action: 'update_role',
        module: 'usuarios',
        details: JSON.stringify({ roleId: id, changes: updateData }),
      });

      return updatedRole;
    }),

  // Eliminar un rol
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      // El owner (administrador del sistema) siempre puede eliminar roles
      // No se verifica permisos para owners

      // Verificar que no haya usuarios con este rol
      const users = await roleQueries.getBusinessUsersByOwnerId(ctx.user.id);
      const usersWithRole = users.filter(u => u.roleId === input.id);
      
      if (usersWithRole.length > 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `No se puede eliminar el rol porque hay ${usersWithRole.length} usuario(s) asignado(s)`,
        });
      }

      await roleQueries.deleteRole(input.id);

      // Registrar actividad
      await roleQueries.createActivityLog({
        userId: ctx.user.id,
        userType: 'owner',
        action: 'delete_role',
        module: 'usuarios',
        details: JSON.stringify({ roleId: input.id }),
      });

      return { success: true };
    }),
});

/**
 * ============================================
 * ROUTER DE PERMISOS
 * ============================================
 */

export const permissionsRouter = router({
  // Listar todos los permisos
  list: protectedProcedure.query(async () => {
    return await roleQueries.getAllPermissions();
  }),

  // Listar permisos por módulo
  listByModule: protectedProcedure
    .input(z.object({ module: z.string() }))
    .query(async ({ input }) => {
      return await roleQueries.getPermissionsByModule(input.module);
    }),

  // Listar permisos de un rol específico
  listByRole: protectedProcedure
    .input(z.object({ roleId: z.number() }))
    .query(async ({ input }) => {
      return await roleQueries.getPermissionsByRoleId(input.roleId);
    }),

  // Obtener permisos del usuario actual
  myPermissions: protectedProcedure.query(async ({ ctx }) => {
    return await roleQueries.getUserPermissions(ctx.user.id, 'owner');
  }),
});

/**
 * ============================================
 * ROUTER DE USUARIOS DEL NEGOCIO (EMPLEADOS)
 * ============================================
 */

export const businessUsersRouter = router({
  // Listar todos los empleados del negocio
  list: protectedProcedure.query(async ({ ctx }) => {
    const users = await roleQueries.getBusinessUsersByOwnerId(ctx.user.id);
    
    // Obtener roles para cada usuario
    const usersWithRoles = await Promise.all(
      users.map(async (user) => {
        const role = await roleQueries.getRoleById(user.roleId);
        return {
          ...user,
          role,
        };
      })
    );
    
    return usersWithRoles;
  }),

  // Obtener un empleado por ID
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      const user = await roleQueries.getBusinessUserById(input.id);
      
      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Usuario no encontrado",
        });
      }

      // Verificar que el usuario pertenece al negocio del owner
      if (user.ownerId !== ctx.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "No tienes acceso a este usuario",
        });
      }

      const role = await roleQueries.getRoleById(user.roleId);
      const permissions = await roleQueries.getPermissionsByRoleId(user.roleId);

      return {
        ...user,
        role,
        permissions,
      };
    }),

  // Crear un nuevo empleado
  create: protectedProcedure
    .input(
      z.object({
        email: z.string().email(),
        password: z.string().min(6),
        name: z.string().min(1),
        phone: z.string().optional(),
        roleId: z.number(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Verificar permisos
      const userPermissions = await roleQueries.getUserPermissions(ctx.user.id, 'owner');
      if (!userPermissions.includes('create_users')) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "No tienes permisos para crear usuarios",
        });
      }

      // Verificar que el email no esté en uso
      const existingUser = await roleQueries.getBusinessUserByEmail(input.email);
      if (existingUser) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "El email ya está en uso",
        });
      }

      // Verificar que el rol existe
      const role = await roleQueries.getRoleById(input.roleId);
      if (!role) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Rol no encontrado",
        });
      }

      // Hashear la contraseña
      const passwordHash = await bcrypt.hash(input.password, 10);

      // Crear el usuario
      const user = await roleQueries.createBusinessUser({
        ownerId: ctx.user.id,
        roleId: input.roleId,
        email: input.email,
        passwordHash,
        name: input.name,
        phone: input.phone,
        isActive: true,
      });

      // Registrar actividad
      await roleQueries.createActivityLog({
        userId: ctx.user.id,
        userType: 'owner',
        action: 'create_user',
        module: 'usuarios',
        details: JSON.stringify({ userId: user.id, email: user.email, roleId: user.roleId }),
      });

      return user;
    }),

  // Actualizar un empleado
  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(1).optional(),
        phone: z.string().optional(),
        roleId: z.number().optional(),
        password: z.string().min(6).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Verificar permisos
      const userPermissions = await roleQueries.getUserPermissions(ctx.user.id, 'owner');
      if (!userPermissions.includes('edit_users')) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "No tienes permisos para editar usuarios",
        });
      }

      const { id, password, ...updateData } = input;

      // Verificar que el usuario existe y pertenece al owner
      const user = await roleQueries.getBusinessUserById(id);
      if (!user || user.ownerId !== ctx.user.id) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Usuario no encontrado",
        });
      }

      // Si se proporciona nueva contraseña, hashearla
      let finalUpdateData = { ...updateData };
      if (password) {
        const passwordHash = await bcrypt.hash(password, 10);
        finalUpdateData = { ...finalUpdateData, passwordHash };
      }

      // Actualizar el usuario
      const updatedUser = await roleQueries.updateBusinessUser(id, finalUpdateData);

      // Registrar actividad
      await roleQueries.createActivityLog({
        userId: ctx.user.id,
        userType: 'owner',
        action: 'update_user',
        module: 'usuarios',
        details: JSON.stringify({ userId: id, changes: updateData }),
      });

      return updatedUser;
    }),

  // Eliminar un empleado
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      // Verificar permisos
      const userPermissions = await roleQueries.getUserPermissions(ctx.user.id, 'owner');
      if (!userPermissions.includes('delete_users')) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "No tienes permisos para eliminar usuarios",
        });
      }

      // Verificar que el usuario existe y pertenece al owner
      const user = await roleQueries.getBusinessUserById(input.id);
      if (!user || user.ownerId !== ctx.user.id) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Usuario no encontrado",
        });
      }

      await roleQueries.deleteBusinessUser(input.id);

      // Registrar actividad
      await roleQueries.createActivityLog({
        userId: ctx.user.id,
        userType: 'owner',
        action: 'delete_user',
        module: 'usuarios',
        details: JSON.stringify({ userId: input.id, email: user.email }),
      });

      return { success: true };
    }),

  // Activar/Desactivar un empleado
  toggleStatus: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        isActive: z.boolean(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Verificar permisos
      const userPermissions = await roleQueries.getUserPermissions(ctx.user.id, 'owner');
      if (!userPermissions.includes('edit_users')) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "No tienes permisos para modificar usuarios",
        });
      }

      // Verificar que el usuario existe y pertenece al owner
      const user = await roleQueries.getBusinessUserById(input.id);
      if (!user || user.ownerId !== ctx.user.id) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Usuario no encontrado",
        });
      }

      const updatedUser = await roleQueries.toggleBusinessUserStatus(input.id, input.isActive);

      // Registrar actividad
      await roleQueries.createActivityLog({
        userId: ctx.user.id,
        userType: 'owner',
        action: input.isActive ? 'activate_user' : 'deactivate_user',
        module: 'usuarios',
        details: JSON.stringify({ userId: input.id }),
      });

      return updatedUser;
    }),
});

/**
 * ============================================
 * ROUTER DE REGISTRO DE ACTIVIDAD
 * ============================================
 */

export const activityRouter = router({
  // Listar todas las actividades (con límite)
  list: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(500).default(100),
      }).optional()
    )
    .query(async ({ input }) => {
      const limit = input?.limit || 100;
      return await roleQueries.getAllActivityLogs(limit);
    }),

  // Listar actividades por usuario
  listByUser: protectedProcedure
    .input(
      z.object({
        userId: z.number(),
        userType: z.enum(['owner', 'employee']),
        limit: z.number().min(1).max(500).default(100),
      })
    )
    .query(async ({ input }) => {
      return await roleQueries.getActivityLogByUserId(input.userId, input.userType, input.limit);
    }),

  // Listar actividades por módulo
  listByModule: protectedProcedure
    .input(
      z.object({
        module: z.string(),
        limit: z.number().min(1).max(500).default(100),
      })
    )
    .query(async ({ input }) => {
      return await roleQueries.getActivityLogByModule(input.module, input.limit);
    }),
});
