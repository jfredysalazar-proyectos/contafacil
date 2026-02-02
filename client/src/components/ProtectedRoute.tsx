import { ReactNode } from "react";
import { Redirect } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useHasPermission, useHasAnyPermission, usePermissions } from "@/hooks/usePermissions";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: ReactNode;
  permission?: string;
  permissions?: string[];
  requireAll?: boolean;
  redirectTo?: string;
}

/**
 * Componente para proteger rutas basado en permisos
 */
export default function ProtectedRoute({
  children,
  permission,
  permissions,
  requireAll = false,
  redirectTo = "/unauthorized",
}: ProtectedRouteProps) {
  const { user, loading: authLoading } = useAuth();
  const { isLoading: permissionsLoading } = usePermissions();
  const hasSinglePermission = useHasPermission(permission || "");
  const hasAnyPermission = useHasAnyPermission(permissions || []);

  // Mostrar loading mientras se cargan los datos
  if (authLoading || permissionsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Si no hay usuario autenticado, redirigir al login
  if (!user) {
    return <Redirect to="/login" />;
  }

  // Si se especifica un permiso único
  if (permission) {
    if (!hasSinglePermission) {
      return <Redirect to={redirectTo} />;
    }
    return <>{children}</>;
  }

  // Si se especifican múltiples permisos
  if (permissions && permissions.length > 0) {
    if (requireAll) {
      const hasAll = permissions.every((p) => useHasPermission(p));
      if (!hasAll) {
        return <Redirect to={redirectTo} />;
      }
    } else {
      if (!hasAnyPermission) {
        return <Redirect to={redirectTo} />;
      }
    }
  }

  // Si no se especifica ningún permiso, solo requiere autenticación
  return <>{children}</>;
}
