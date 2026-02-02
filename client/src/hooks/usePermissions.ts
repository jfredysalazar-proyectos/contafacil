import { useAuth } from "./useAuth";
import { trpc } from "@/lib/trpc";

/**
 * Hook para obtener todos los permisos del usuario actual
 */
export function usePermissions() {
  const { user } = useAuth();
  
  // Obtener permisos del usuario desde el backend
  const { data: permissions, isLoading } = trpc.permissions.list.useQuery(
    undefined,
    {
      enabled: !!user,
    }
  );

  // Si es admin, tiene todos los permisos
  if (user?.role === "admin") {
    return {
      permissions: permissions || [],
      hasAllPermissions: true,
      isLoading,
    };
  }

  return {
    permissions: permissions || [],
    hasAllPermissions: false,
    isLoading,
  };
}

/**
 * Hook para verificar si el usuario tiene un permiso específico
 * @param permission - Nombre del permiso (ej: "productos.crear")
 */
export function useHasPermission(permission: string): boolean {
  const { user } = useAuth();
  const { permissions, hasAllPermissions } = usePermissions();

  // Admin tiene todos los permisos
  if (user?.role === "admin" || hasAllPermissions) {
    return true;
  }

  // Verificar si el usuario tiene el permiso específico
  return permissions.some((p: any) => p.name === permission);
}

/**
 * Hook para verificar si el usuario tiene alguno de varios permisos
 * @param permissionList - Array de nombres de permisos
 */
export function useHasAnyPermission(permissionList: string[]): boolean {
  const { user } = useAuth();
  const { permissions, hasAllPermissions } = usePermissions();

  // Admin tiene todos los permisos
  if (user?.role === "admin" || hasAllPermissions) {
    return true;
  }

  // Verificar si el usuario tiene alguno de los permisos
  return permissionList.some((permission) =>
    permissions.some((p: any) => p.name === permission)
  );
}

/**
 * Hook para verificar si el usuario tiene todos los permisos especificados
 * @param permissionList - Array de nombres de permisos
 */
export function useHasAllPermissions(permissionList: string[]): boolean {
  const { user } = useAuth();
  const { permissions, hasAllPermissions } = usePermissions();

  // Admin tiene todos los permisos
  if (user?.role === "admin" || hasAllPermissions) {
    return true;
  }

  // Verificar si el usuario tiene todos los permisos
  return permissionList.every((permission) =>
    permissions.some((p: any) => p.name === permission)
  );
}

/**
 * Hook para verificar si el usuario tiene un rol específico
 * @param role - Nombre del rol (ej: "admin", "vendedor")
 */
export function useHasRole(role: string): boolean {
  const { user } = useAuth();
  return user?.role === role;
}

/**
 * Hook para verificar si el usuario tiene alguno de varios roles
 * @param roles - Array de nombres de roles
 */
export function useHasAnyRole(roles: string[]): boolean {
  const { user } = useAuth();
  return roles.includes(user?.role || "");
}
