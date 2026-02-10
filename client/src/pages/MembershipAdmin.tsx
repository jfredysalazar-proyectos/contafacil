import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ResponsiveTable } from "@/components/ResponsiveTable";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Loader2, Calendar, Users, AlertCircle, CheckCircle, XCircle, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function MembershipAdmin() {
  const { user, loading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [isExtendDialogOpen, setIsExtendDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [duration, setDuration] = useState("30");
  const [durationType, setDurationType] = useState<"days" | "months" | "years">("days");

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      setLocation("/login");
    }
    if (!loading && isAuthenticated && user?.email !== "admin@contafacil.com") {
      setLocation("/dashboard");
      toast.error("No tienes permisos para acceder a esta página");
    }
  }, [loading, isAuthenticated, user, setLocation]);

  const { data: allUsers, isLoading, refetch } = trpc.membership.getAllUsers.useQuery(undefined, {
    enabled: isAuthenticated && user?.email === "admin@contafacil.com",
  });

  const extendMutation = trpc.membership.extendMembership.useMutation({
    onSuccess: (data) => {
      toast.success(`Membresía extendida hasta ${new Date(data.newEndDate).toLocaleDateString("es-CO")}`);
      setIsExtendDialogOpen(false);
      setSelectedUser(null);
      setDuration("30");
      setDurationType("days");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const revokeMutation = trpc.membership.revokeMembership.useMutation({
    onSuccess: () => {
      toast.success("Membresía revocada exitosamente");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleExtend = () => {
    if (!selectedUser) return;

    extendMutation.mutate({
      userId: selectedUser.id,
      duration: parseInt(duration),
      durationType,
    });
  };

  const handleRevoke = (userId: number, userName: string) => {
    if (confirm(`¿Estás seguro de revocar la membresía de ${userName}?`)) {
      revokeMutation.mutate({ userId });
    }
  };

  const getStatusBadge = (status: string, daysRemaining: number | null) => {
    if (status === "trial") {
      return (
        <Badge variant="secondary" className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          Prueba ({daysRemaining !== null ? `${daysRemaining}d` : "N/A"})
        </Badge>
      );
    }
    if (status === "active") {
      return (
        <Badge variant="default" className="flex items-center gap-1 bg-green-500">
          <CheckCircle className="h-3 w-3" />
          Activa ({daysRemaining !== null ? `${daysRemaining}d` : "∞"})
        </Badge>
      );
    }
    return (
      <Badge variant="destructive" className="flex items-center gap-1">
        <XCircle className="h-3 w-3" />
        Expirada
      </Badge>
    );
  };

  if (loading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!user || user.email !== "admin@contafacil.com") {
    return null;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Administración de Membresías</h1>
          <p className="text-muted-foreground">Gestiona el acceso de los usuarios a ContaFácil</p>
        </div>
        <Button variant="outline" onClick={() => setLocation("/dashboard")}>
          Volver al Dashboard
        </Button>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Usuarios</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{allUsers?.length || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">En Prueba</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {allUsers?.filter(u => u.membershipStatus === "trial").length || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Activas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {allUsers?.filter(u => u.membershipStatus === "active").length || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Expiradas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {allUsers?.filter(u => u.membershipStatus === "expired").length || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabla de usuarios */}
      <Card>
        <CardHeader>
          <CardTitle>Usuarios Registrados</CardTitle>
          <CardDescription>
            Lista de todos los usuarios con su estado de membresía
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveTable>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Negocio</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Fecha Inicio</TableHead>
                  <TableHead>Fecha Fin</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allUsers?.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.name}</TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell>{u.businessName || "N/A"}</TableCell>
                    <TableCell>{getStatusBadge(u.membershipStatus, u.daysRemaining)}</TableCell>
                    <TableCell>
                      {new Date(u.membershipStartDate).toLocaleDateString("es-CO")}
                    </TableCell>
                    <TableCell>
                      {u.membershipEndDate
                        ? new Date(u.membershipEndDate).toLocaleDateString("es-CO")
                        : "Sin límite"}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedUser(u);
                            setIsExtendDialogOpen(true);
                          }}
                        >
                          <Calendar className="h-4 w-4 mr-1" />
                          Extender
                        </Button>
                        {u.membershipStatus !== "expired" && (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleRevoke(u.id, u.name)}
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Revocar
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {(!allUsers || allUsers.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                      No hay usuarios registrados
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </ResponsiveTable>
        </CardContent>
      </Card>

      {/* Dialog para extender membresía */}
      <Dialog open={isExtendDialogOpen} onOpenChange={setIsExtendDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Extender Membresía</DialogTitle>
            <DialogDescription>
              Usuario: <strong>{selectedUser?.name}</strong> ({selectedUser?.email})
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Duración</Label>
              <Input
                type="number"
                min="1"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                placeholder="Ej: 30"
              />
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={durationType} onValueChange={(value: any) => setDurationType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="days">Días</SelectItem>
                  <SelectItem value="months">Meses</SelectItem>
                  <SelectItem value="years">Años</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {selectedUser && (
              <div className="bg-muted p-3 rounded-md">
                <p className="text-sm">
                  <strong>Estado actual:</strong> {selectedUser.membershipStatus}
                </p>
                <p className="text-sm">
                  <strong>Expira:</strong>{" "}
                  {selectedUser.membershipEndDate
                    ? new Date(selectedUser.membershipEndDate).toLocaleDateString("es-CO")
                    : "Sin límite"}
                </p>
                <p className="text-sm">
                  <strong>Días restantes:</strong> {selectedUser.daysRemaining ?? "N/A"}
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsExtendDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleExtend} disabled={extendMutation.isPending}>
              {extendMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Extender Membresía
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
