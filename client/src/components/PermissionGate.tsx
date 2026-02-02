import { ReactNode } from "react";
import { useHasPermission, useHasAnyPermission, useHasAllPermissions } from "@/hooks/usePermissions";

interface PermissionGateProps {
  children: ReactNode;
  permission?: string;
  permissions?: string[];
  requireAll?: boolean;
  fallback?: ReactNode;
}

/**
 * Componente para mostrar/ocultar elementos UI basado en permisos
 */
export default function PermissionGate({
  children,
  permission,
  permissions,
  requireAll = false,
  fallback = null,
}: PermissionGateProps) {
  const hasSinglePermission = useHasPermission(permission || "");
  const hasAnyPermission = useHasAnyPermission(permissions || []);
  const hasAllPermissions = useHasAllPermissions(permissions || []);

  // Si se especifica un permiso único
  if (permission) {
    return hasSinglePermission ? <>{children}</> : <>{fallback}</>;
  }

  // Si se especifican múltiples permisos
  if (permissions && permissions.length > 0) {
    if (requireAll) {
      return hasAllPermissions ? <>{children}</> : <>{fallback}</>;
    } else {
      return hasAnyPermission ? <>{children}</> : <>{fallback}</>;
    }
  }

  // Si no se especifica ningún permiso, mostrar el contenido
  return <>{children}</>;
}
