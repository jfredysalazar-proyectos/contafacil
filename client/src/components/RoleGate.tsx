import { ReactNode } from "react";
import { useHasRole, useHasAnyRole } from "@/hooks/usePermissions";

interface RoleGateProps {
  children: ReactNode;
  role?: string;
  roles?: string[];
  fallback?: ReactNode;
}

/**
 * Componente para mostrar/ocultar elementos UI basado en roles
 */
export default function RoleGate({
  children,
  role,
  roles,
  fallback = null,
}: RoleGateProps) {
  const hasSingleRole = useHasRole(role || "");
  const hasAnyRole = useHasAnyRole(roles || []);

  // Si se especifica un rol único
  if (role) {
    return hasSingleRole ? <>{children}</> : <>{fallback}</>;
  }

  // Si se especifican múltiples roles
  if (roles && roles.length > 0) {
    return hasAnyRole ? <>{children}</> : <>{fallback}</>;
  }

  // Si no se especifica ningún rol, mostrar el contenido
  return <>{children}</>;
}
