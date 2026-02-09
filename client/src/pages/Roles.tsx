import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ResponsiveTable } from "@/components/ResponsiveTable";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { toast } from "sonner";
import { Loader2, Plus, Pencil, Trash2, Shield, ShieldCheck, Users } from "lucide-react";

interface RoleFormData {
  name: string;
  displayName: string;
  description: string;
  permissionIds: number[];
}

export default function Roles() {
  // Toast imported from sonner
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<any>(null);

  const [formData, setFormData] = useState<RoleFormData>({
    name: "",
    displayName: "",
    description: "",
    permissionIds: [],
  });

  const [editFormData, setEditFormData] = useState<Partial<RoleFormData>>({
    displayName: "",
    description: "",
    permissionIds: [],
  });

  // Queries
  const { data: roles, isLoading, refetch } = trpc.roles.list.useQuery();
  const { data: allPermissions } = trpc.permissions.list.useQuery();
  const { data: employees } = trpc.businessUsers.list.useQuery();

  // Mutations
  const createMutation = trpc.roles.create.useMutation({
    onSuccess: () => {
      toast.success("El rol se ha creado exitosamente.");
      refetch();
      setIsCreateDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error(error.message || "Error al procesar la solicitud");
    },
  });

  const updateMutation = trpc.roles.update.useMutation({
    onSuccess: () => {
      toast.success("El rol se ha actualizado exitosamente.");
      refetch();
      setIsEditDialogOpen(false);
      setSelectedRole(null);
    },
    onError: (error) => {
      toast.error(error.message || "Error al procesar la solicitud");
    },
  });

  const deleteMutation = trpc.roles.delete.useMutation({
    onSuccess: () => {
      toast.success("El rol se ha eliminado exitosamente.");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Error al procesar la solicitud");
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      displayName: "",
      description: "",
      permissionIds: [],
    });
  };

  const handleCreate = () => {
    if (!formData.name || !formData.displayName) {
      toast.error("Por favor completa el nombre y nombre para mostrar.");
      return;
    }

    createMutation.mutate({
      name: formData.name.toLowerCase().replace(/\s+/g, '_'),
      displayName: formData.displayName,
      description: formData.description || undefined,
      permissionIds: formData.permissionIds,
    });
  };

  const handleEdit = async (role: any) => {
    setSelectedRole(role);
    
    // Obtener permisos del rol
    const roleWithPerms = await trpc.roles.getById.useQuery({ id: role.id });
    
    setEditFormData({
      displayName: role.displayName,
      description: role.description || "",
      permissionIds: roleWithPerms?.permissions?.map((p: any) => p.id) || [],
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdate = () => {
    if (!selectedRole) return;

    updateMutation.mutate({
      id: selectedRole.id,
      displayName: editFormData.displayName,
      description: editFormData.description,
      permissionIds: editFormData.permissionIds,
    });
  };

  const handleDelete = (role: any) => {
    if (role.isSystem) {
      toast.error("No se pueden eliminar roles del sistema.");
      return;
    }

    // Contar usuarios con este rol
    const usersWithRole = employees?.filter(emp => emp.roleId === role.id).length || 0;
    
    if (usersWithRole > 0) {
      toast.error(`Hay ${usersWithRole} usuario(s) asignado(s) a este rol.`);
      return;
    }

    if (confirm(`¿Estás seguro de que deseas eliminar el rol "${role.displayName}"?`)) {
      deleteMutation.mutate({ id: role.id });
    }
  };

  const togglePermission = (permissionId: number, isCreate: boolean) => {
    if (isCreate) {
      setFormData(prev => ({
        ...prev,
        permissionIds: prev.permissionIds.includes(permissionId)
          ? prev.permissionIds.filter(id => id !== permissionId)
          : [...prev.permissionIds, permissionId]
      }));
    } else {
      setEditFormData(prev => ({
        ...prev,
        permissionIds: prev.permissionIds?.includes(permissionId)
          ? prev.permissionIds.filter(id => id !== permissionId)
          : [...(prev.permissionIds || []), permissionId]
      }));
    }
  };

  const toggleModulePermissions = (modulePerms: any[], isCreate: boolean) => {
    const modulePermIds = modulePerms.map(p => p.id);
    const currentPerms = isCreate ? formData.permissionIds : (editFormData.permissionIds || []);
    
    // Si todos están seleccionados, deseleccionar todos
    const allSelected = modulePermIds.every(id => currentPerms.includes(id));
    
    if (isCreate) {
      if (allSelected) {
        setFormData(prev => ({
          ...prev,
          permissionIds: prev.permissionIds.filter(id => !modulePermIds.includes(id))
        }));
      } else {
        setFormData(prev => ({
          ...prev,
          permissionIds: [...new Set([...prev.permissionIds, ...modulePermIds])]
        }));
      }
    } else {
      if (allSelected) {
        setEditFormData(prev => ({
          ...prev,
          permissionIds: prev.permissionIds?.filter(id => !modulePermIds.includes(id)) || []
        }));
      } else {
        setEditFormData(prev => ({
          ...prev,
          permissionIds: [...new Set([...(prev.permissionIds || []), ...modulePermIds])]
        }));
      }
    }
  };

  // Agrupar permisos por módulo
  const permissionsByModule = allPermissions?.reduce((acc: any, perm: any) => {
    if (!acc[perm.module]) {
      acc[perm.module] = [];
    }
    acc[perm.module].push(perm);
    return acc;
  }, {}) || {};

  const moduleNames: Record<string, string> = {
    productos: "Productos",
    inventario: "Inventario",
    clientes: "Clientes",
    proveedores: "Proveedores",
    ventas: "Ventas",
    cotizaciones: "Cotizaciones",
    gastos: "Gastos y Compras",
    deudas: "Deudas",
    reportes: "Reportes",
    configuracion: "Configuración",
    usuarios: "Usuarios",
    dashboard: "Dashboard",
  };

  // Contar usuarios por rol
  const getUserCountByRole = (roleId: number) => {
    return employees?.filter(emp => emp.roleId === roleId).length || 0;
  };

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
            <Shield className="w-8 h-8" />
            Gestión de Roles y Permisos
          </h1>
          <p className="text-muted-foreground mt-1">
            Administra los roles y sus permisos en el sistema
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Nuevo Rol
        </Button>
      </div>

      {/* Tabla */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Rol</TableHead>
              <TableHead>Descripción</TableHead>
              <TableHead>Usuarios Asignados</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {roles && roles.length > 0 ? (
              roles.map((role) => (
                <TableRow key={role.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {role.isSystem ? (
                        <ShieldCheck className="w-4 h-4 text-primary" />
                      ) : (
                        <Shield className="w-4 h-4 text-muted-foreground" />
                      )}
                      {role.displayName}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {role.description || "-"}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-muted-foreground" />
                      <span>{getUserCountByRole(role.id)}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {role.isSystem ? (
                      <Badge variant="default">Sistema</Badge>
                    ) : (
                      <Badge variant="outline">Personalizado</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(role)}
                        disabled={role.isSystem}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(role)}
                        disabled={role.isSystem}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  No hay roles registrados
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Dialog de Crear */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Crear Nuevo Rol</DialogTitle>
            <DialogDescription>
              Define un nuevo rol y asigna los permisos correspondientes
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Nombre Interno *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="vendedor_junior"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Solo letras minúsculas y guiones bajos
                </p>
              </div>
              <div>
                <Label htmlFor="displayName">Nombre para Mostrar *</Label>
                <Input
                  id="displayName"
                  value={formData.displayName}
                  onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                  placeholder="Vendedor Junior"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="description">Descripción</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descripción del rol y sus responsabilidades"
                rows={2}
              />
            </div>

            <div>
              <Label className="text-base font-semibold">Permisos</Label>
              <p className="text-sm text-muted-foreground mb-3">
                Selecciona los permisos que tendrá este rol
              </p>
              
              <Accordion type="multiple" className="w-full">
                {Object.entries(permissionsByModule).map(([module, perms]: [string, any]) => {
                  const selectedCount = perms.filter((p: any) => 
                    formData.permissionIds.includes(p.id)
                  ).length;
                  
                  return (
                    <AccordionItem key={module} value={module}>
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center justify-between w-full pr-4">
                          <span className="font-medium">{moduleNames[module] || module}</span>
                          <Badge variant="outline">
                            {selectedCount}/{perms.length}
                          </Badge>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-2 pl-4">
                          <div className="flex items-center space-x-2 pb-2 border-b">
                            <Checkbox
                              id={`module-${module}`}
                              checked={perms.every((p: any) => formData.permissionIds.includes(p.id))}
                              onCheckedChange={() => toggleModulePermissions(perms, true)}
                            />
                            <label
                              htmlFor={`module-${module}`}
                              className="text-sm font-medium cursor-pointer"
                            >
                              Seleccionar todos
                            </label>
                          </div>
                          {perms.map((perm: any) => (
                            <div key={perm.id} className="flex items-center space-x-2">
                              <Checkbox
                                id={`perm-${perm.id}`}
                                checked={formData.permissionIds.includes(perm.id)}
                                onCheckedChange={() => togglePermission(perm.id, true)}
                              />
                              <label
                                htmlFor={`perm-${perm.id}`}
                                className="text-sm cursor-pointer flex-1"
                              >
                                {perm.displayName}
                              </label>
                            </div>
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending}>
              {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Crear Rol
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Editar */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Rol</DialogTitle>
            <DialogDescription>
              Modifica el nombre y permisos del rol
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-displayName">Nombre para Mostrar</Label>
              <Input
                id="edit-displayName"
                value={editFormData.displayName}
                onChange={(e) => setEditFormData({ ...editFormData, displayName: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="edit-description">Descripción</Label>
              <Textarea
                id="edit-description"
                value={editFormData.description}
                onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                rows={2}
              />
            </div>

            <div>
              <Label className="text-base font-semibold">Permisos</Label>
              <p className="text-sm text-muted-foreground mb-3">
                Actualiza los permisos de este rol
              </p>
              
              <Accordion type="multiple" className="w-full">
                {Object.entries(permissionsByModule).map(([module, perms]: [string, any]) => {
                  const selectedCount = perms.filter((p: any) => 
                    editFormData.permissionIds?.includes(p.id)
                  ).length;
                  
                  return (
                    <AccordionItem key={module} value={module}>
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center justify-between w-full pr-4">
                          <span className="font-medium">{moduleNames[module] || module}</span>
                          <Badge variant="outline">
                            {selectedCount}/{perms.length}
                          </Badge>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-2 pl-4">
                          <div className="flex items-center space-x-2 pb-2 border-b">
                            <Checkbox
                              id={`edit-module-${module}`}
                              checked={perms.every((p: any) => editFormData.permissionIds?.includes(p.id))}
                              onCheckedChange={() => toggleModulePermissions(perms, false)}
                            />
                            <label
                              htmlFor={`edit-module-${module}`}
                              className="text-sm font-medium cursor-pointer"
                            >
                              Seleccionar todos
                            </label>
                          </div>
                          {perms.map((perm: any) => (
                            <div key={perm.id} className="flex items-center space-x-2">
                              <Checkbox
                                id={`edit-perm-${perm.id}`}
                                checked={editFormData.permissionIds?.includes(perm.id)}
                                onCheckedChange={() => togglePermission(perm.id, false)}
                              />
                              <label
                                htmlFor={`edit-perm-${perm.id}`}
                                className="text-sm cursor-pointer flex-1"
                              >
                                {perm.displayName}
                              </label>
                            </div>
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
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
