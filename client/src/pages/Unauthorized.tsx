import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { ShieldAlert, ArrowLeft, Home } from "lucide-react";

export default function Unauthorized() {
  const [, setLocation] = useLocation();

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="text-center max-w-md px-6">
        <div className="flex justify-center mb-6">
          <div className="bg-red-100 p-4 rounded-full">
            <ShieldAlert className="h-16 w-16 text-red-600" />
          </div>
        </div>
        
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Acceso No Autorizado
        </h1>
        
        <p className="text-gray-600 mb-8">
          No tienes los permisos necesarios para acceder a esta página. 
          Si crees que esto es un error, contacta con tu administrador.
        </p>
        
        <div className="flex gap-4 justify-center">
          <Button
            onClick={() => window.history.back()}
            variant="outline"
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver Atrás
          </Button>
          
          <Button
            onClick={() => setLocation("/dashboard")}
            className="gap-2"
          >
            <Home className="h-4 w-4" />
            Ir al Inicio
          </Button>
        </div>
      </div>
    </div>
  );
}
