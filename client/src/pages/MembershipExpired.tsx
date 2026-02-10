import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, Mail, Phone } from "lucide-react";

export default function MembershipExpired() {
  const { logout } = useAuth();
  const [, setLocation] = useLocation();

  const handleLogout = async () => {
    await logout();
    setLocation("/login");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
            <AlertCircle className="h-6 w-6 text-red-600" />
          </div>
          <CardTitle className="text-2xl">Membresía Expirada</CardTitle>
          <CardDescription>
            Tu período de prueba o membresía ha finalizado
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-center text-muted-foreground">
            Para continuar usando ContaFácil, por favor contacta al administrador para renovar tu membresía.
          </p>

          <div className="bg-muted p-4 rounded-md space-y-2">
            <h3 className="font-semibold text-sm">Contacto del Administrador:</h3>
            <div className="flex items-center gap-2 text-sm">
              <Mail className="h-4 w-4" />
              <a href="mailto:admin@contafacil.com" className="text-primary hover:underline">
                admin@contafacil.com
              </a>
            </div>
          </div>

          <div className="space-y-2">
            <Button onClick={handleLogout} className="w-full">
              Cerrar Sesión
            </Button>
          </div>

          <p className="text-xs text-center text-muted-foreground">
            Una vez que tu membresía sea renovada, podrás acceder nuevamente a todas las funcionalidades de ContaFácil.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
