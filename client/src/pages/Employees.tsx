import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Plus, Pencil, Trash2, Power, PowerOff, Users } from "lucide-react";

interface EmployeeFormData {
  email: string;
  password: string;
  name: string;
  phone: string;
  roleId: number | null;
}

export default function Employees() {
  // Toast imported from sonner
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [filterRole, setFilterRole] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const [formData, setFormData] = useState<EmployeeFormData>({
    email: "",
    password: "",
    name: "",
    phone: "",
    roleId: null,
  });

  const [editFormData, setEditFormData] = useState<Partial<EmployeeFormData>>({
    name: "",
    phone: "",
    roleId: null,
    password: "",
  });

  // Queries
  const { data: employees, isLoading, refetch } = trpc.businessUsers.list.useQuery();
  const { data: roles } = trpc.roles.list.useQuery();

  // Mutations
  const createMutation = trpc.businessUsers.create.useMutation({
    onSuccess: () => {
      toast.success("El empleado se ha creado exitosamente.");
      refetch();
      setIsCreateDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error(error.message || "Error al procesar la solicitud");
    },
  });

  const updateMutation = trpc.businessUsers.update.useMutation({
    onSuccess: () => {
      toast.success("El empleado se ha actualizado exitosamente.");
      refetch();
      setIsEditDialogOpen(false);
      setSelectedEmployee(null);
    },
    onError: (error) => {
      toast.error(error.message || "Error al procesar la solicitud");
    },
  });

  const deleteMutation = trpc.businessUsers.delete.useMutation({
    onSuccess: () => {
      toast.success("El empleado se ha eliminado exitosamente.");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Error al procesar la solicitud");
    },
  });

  const toggleStatusMutation = trpc.businessUsers.toggleStatus.useMutation({
    onSuccess: (data) => {
      toast.success(`El empleado ha sido ${data.isActive ? "activado" : "desactivado"} exitosamente.`);
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Error al procesar la solicitud");
    },
  });

  const resetForm = () => {
    setFormData({
      email: "",
      password: "",
      name: "",
      phone: "",
      roleId: null,
    });
  };

  const handleCreate = () => {
    if (!formData.email || !formData.password || !formData.name || !formData.roleId) {
      toast.error("Por favor completa todos los campos obligatorios.");
      return;
    }

    createMutation.mutate({
      email: formData.email,
      password: formData.password,
      name: formData.name,
      phone: formData.phone || undefined,
      roleId: formData.roleId,
    });
  };

  const handleEdit = (employee: any) => {
    setSelectedEmployee(employee);
    setEditFormData({
      name: employee.name,
      phone: employee.phone || "",
      roleId: employee.roleId,
      password: "",
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdate = () => {
    if (!selectedEmployee) return;

    const updateData: any = {
      id: selectedEmployee.id,
    };

    if (editFormData.name && editFormData.name !== selectedEmployee.name) {
      updateData.name = editFormData.name;
    }

    if (editFormData.phone !== undefined && editFormData.phone !== selectedEmployee.phone) {
      updateData.phone = editFormData.phone;
    }

    if (editFormData.roleId && editFormData.roleId !== selectedEmployee.roleId) {
      updateData.roleId = editFormData.roleId;
    }

    if (editFormData.password && editFormData.password.length >= 6) {
      updateData.password = editFormData.password;
    }

    updateMutation.mutate(updateData);
  };

  const handleDelete = (id: number) => {
    if (confirm("¿Estás seguro de que deseas eliminar este empleado?")) {
      deleteMutation.mutate({ id });
    }
  };

  const handleToggleStatus = (id: number, currentStatus: boolean) => {
    toggleStatusMutation.mutate({
      id,
      isActive: !currentStatus,
    });
  };

  // Filtrar empleados
  const filteredEmployees = employees?.filter((emp) => {
    if (filterRole !== "all" && emp.roleId !== parseInt(filterRole)) {
      return false;
    }
    if (filterStatus === "active" && !emp.isActive) {
      return false;
    }
    if (filterStatus === "inactive" && emp.isActive) {
      return false;
    }
    return true;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Users className="w-8 h-8" />
            Gestión de Empleados
          </h1>
          <p className="text-muted-foreground mt-1">
            Administra los empleados y sus roles en el sistema
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Nuevo Empleado
        </Button>
      </div>

      {/* Filtros */}
      <div className="flex gap-4">
        <div className="w-48">
          <Label>Filtrar por Rol</Label>
          <Select value={filterRole} onValueChange={setFilterRole}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los roles</SelectItem>
              {roles?.map((role) => (
                <SelectItem key={role.id} value={role.id.toString()}>
                  {role.displayName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="w-48">
          <Label>Filtrar por Estado</Label>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="active">Activos</SelectItem>
              <SelectItem value="inactive">Inactivos</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Tabla */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Teléfono</TableHead>
              <TableHead>Rol</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Fecha de Creación</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredEmployees && filteredEmployees.length > 0 ? (
              filteredEmployees.map((employee) => (
                <TableRow key={employee.id}>
                  <TableCell className="font-medium">{employee.name}</TableCell>
                  <TableCell>{employee.email}</TableCell>
                  <TableCell>{employee.phone || "-"}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{employee.role?.displayName || "Sin rol"}</Badge>
                  </TableCell>
                  <TableCell>
                    {employee.isActive ? (
                      <Badge variant="default" className="bg-green-500">
                        Activo
                      </Badge>
                    ) : (
                      <Badge variant="secondary">Inactivo</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {new Date(employee.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(employee)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleStatus(employee.id, employee.isActive)}
                      >
                        {employee.isActive ? (
                          <PowerOff className="w-4 h-4 text-orange-500" />
                        ) : (
                          <Power className="w-4 h-4 text-green-500" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(employee.id)}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No hay empleados registrados
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Dialog de Crear */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Crear Nuevo Empleado</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Nombre *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Juan Pérez"
              />
            </div>
            <div>
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="juan@ejemplo.com"
              />
            </div>
            <div>
              <Label htmlFor="password">Contraseña *</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Mínimo 6 caracteres"
              />
            </div>
            <div>
              <Label htmlFor="phone">Teléfono</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+1234567890"
              />
            </div>
            <div>
              <Label htmlFor="role">Rol *</Label>
              <Select
                value={formData.roleId?.toString() || ""}
                onValueChange={(value) => setFormData({ ...formData, roleId: parseInt(value) })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un rol" />
                </SelectTrigger>
                <SelectContent>
                  {roles?.map((role) => (
                    <SelectItem key={role.id} value={role.id.toString()}>
                      {role.displayName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending}>
              {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Crear Empleado
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Editar */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Empleado</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-name">Nombre</Label>
              <Input
                id="edit-name"
                value={editFormData.name}
                onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="edit-phone">Teléfono</Label>
              <Input
                id="edit-phone"
                value={editFormData.phone}
                onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="edit-role">Rol</Label>
              <Select
                value={editFormData.roleId?.toString() || ""}
                onValueChange={(value) => setEditFormData({ ...editFormData, roleId: parseInt(value) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {roles?.map((role) => (
                    <SelectItem key={role.id} value={role.id.toString()}>
                      {role.displayName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="edit-password">Nueva Contraseña (opcional)</Label>
              <Input
                id="edit-password"
                type="password"
                value={editFormData.password}
                onChange={(e) => setEditFormData({ ...editFormData, password: e.target.value })}
                placeholder="Dejar vacío para no cambiar"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleUpdate} disabled={updateMutation.isPending}>
              {updateMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Guardar Cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
