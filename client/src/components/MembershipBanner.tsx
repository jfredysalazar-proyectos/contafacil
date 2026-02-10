import { useEffect } from "react";
import { useLocation } from "wouter";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { AlertCircle, Clock, CheckCircle } from "lucide-react";

export function MembershipBanner() {
  const [, setLocation] = useLocation();
  const { data: membership, isLoading } = trpc.membership.getMyMembership.useQuery();

  useEffect(() => {
    // Si la membresía está expirada, redirigir a la página de expiración
    if (membership && !membership.isActive) {
      setLocation("/membership-expired");
    }
  }, [membership, setLocation]);

  if (isLoading || !membership) {
    return null;
  }

  // No mostrar banner si es admin
  if (membership.daysRemaining === null) {
    return null;
  }

  // No mostrar si tiene más de 7 días
  if (membership.daysRemaining > 7) {
    return null;
  }

  // Banner de advertencia si quedan 7 días o menos
  if (membership.daysRemaining > 0) {
    return (
      <Alert variant={membership.daysRemaining <= 3 ? "destructive" : "default"} className="mb-4">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>
          {membership.status === "trial" ? "Período de Prueba" : "Membresía"} por Vencer
        </AlertTitle>
        <AlertDescription className="flex items-center justify-between">
          <span>
            Tu {membership.status === "trial" ? "período de prueba" : "membresía"} expira en{" "}
            <strong>{membership.daysRemaining} día{membership.daysRemaining !== 1 ? "s" : ""}</strong>.
            Contacta al administrador para renovar.
          </span>
          <a href="mailto:admin@contafacil.com" className="text-sm underline ml-4">
            Contactar
          </a>
        </AlertDescription>
      </Alert>
    );
  }

  return null;
}
