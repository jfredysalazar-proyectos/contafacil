import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Loader2, Package, AlertTriangle, Plus, Minus, Edit } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function Inventory() {
  const { user, loading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  
  // Estados para modales
  const [addStockDialogOpen, setAddStockDialogOpen] = useState(false);
  const [reduceStockDialogOpen, setReduceStockDialogOpen] = useState(false);
  const [adjustStockDialogOpen, setAdjustStockDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  
  // Estados para formularios
  const [addQuantity, setAddQuantity] = useState("");
  const [selectedSupplierId, setSelectedSupplierId] = useState("");
  const [unitCost, setUnitCost] = useState("");
  const [addNotes, setAddNotes] = useState("");
  
  const [reduceQuantity, setReduceQuantity] = useState("");
  const [reduceReason, setReduceReason] = useState("");
  const [reduceNotes, setReduceNotes] = useState("");
  
  const [adjustStock, setAdjustStock] = useState("");
  const [adjustReason, setAdjustReason] = useState("");
  const [adjustNotes, setAdjustNotes] = useState("");

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      setLocation("/login");
    }
  }, [loading, isAuthenticated, setLocation]);

  const utils = trpc.useUtils();
  const { data: inventory, isLoading } = trpc.inventory.list.useQuery();
  const { data: lowStockItems } = trpc.inventory.lowStock.useQuery();
  const { data: suppliers } = trpc.suppliers.list.useQuery();

  const addStockMutation = trpc.inventory.addStock.useMutation({
    onSuccess: () => {
      toast.success("Stock agregado exitosamente");
      utils.inventory.list.invalidate();
      utils.inventory.lowStock.invalidate();
      resetAddStockForm();
      setAddStockDialogOpen(false);
    },
    onError: (error) => {
      toast.error(error.message || "Error al agregar stock");
    },
  });

  const reduceStockMutation = trpc.inventory.reduceStock.useMutation({
    onSuccess: () => {
      toast.success("Stock reducido exitosamente");
      utils.inventory.list.invalidate();
      utils.inventory.lowStock.invalidate();
      resetReduceStockForm();
      setReduceStockDialogOpen(false);
    },
    onError: (error) => {
      toast.error(error.message || "Error al reducir stock");
    },
  });

  const adjustStockMutation = trpc.inventory.adjustStock.useMutation({
    onSuccess: () => {
      toast.success("Inventario ajustado exitosamente");
      utils.inventory.list.invalidate();
      utils.inventory.lowStock.invalidate();
      resetAdjustStockForm();
      setAdjustStockDialogOpen(false);
    },
    onError: (error) => {
      toast.error(error.message || "Error al ajustar inventario");
    },
  });

  const resetAddStockForm = () => {
    setAddQuantity("");
    setSelectedSupplierId("");
    setUnitCost("");
    setAddNotes("");
    setSelectedProduct(null);
  };

  const resetReduceStockForm = () => {
    setReduceQuantity("");
    setReduceReason("");
    setReduceNotes("");
    setSelectedProduct(null);
  };

  const resetAdjustStockForm = () => {
    setAdjustStock("");
    setAdjustReason("");
    setAdjustNotes("");
    setSelectedProduct(null);
  };

  const handleAddStock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;

    addStockMutation.mutate({
      productId: selectedProduct.id,
      quantity: parseInt(addQuantity),
      supplierId: selectedSupplierId ? parseInt(selectedSupplierId) : undefined,
      unitCost: unitCost ? parseFloat(unitCost) : undefined,
      notes: addNotes || undefined,
    });
  };

  const handleReduceStock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;

    reduceStockMutation.mutate({
      productId: selectedProduct.id,
      quantity: parseInt(reduceQuantity),
      reason: reduceReason || undefined,
      notes: reduceNotes || undefined,
    });
  };

  const handleAdjustStock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;

    adjustStockMutation.mutate({
      productId: selectedProduct.id,
      newStock: parseInt(adjustStock),
      reason: adjustReason || undefined,
      notes: adjustNotes || undefined,
    });
  };

  const openAddStockDialog = (product: any) => {
    setSelectedProduct(product);
    setAddStockDialogOpen(true);
  };

  const openReduceStockDialog = (product: any) => {
    setSelectedProduct(product);
    setReduceStockDialogOpen(true);
  };

  const openAdjustStockDialog = (product: any) => {
    setSelectedProduct(product);
    setAdjustStock(product.stock?.toString() || "0");
    setAdjustStockDialogOpen(true);
  };

  if (loading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const lowStockCount = lowStockItems?.length || 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-accent/5">
      <div className="container py-8 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold text-foreground">Inventario</h1>
            <p className="text-muted-foreground mt-2">
              Gestiona el stock de tus productos
            </p>
          </div>
          {lowStockCount > 0 && (
            <Badge variant="destructive" className="text-lg px-4 py-2">
              <AlertTriangle className="mr-2 h-5 w-5" />
              {lowStockCount} alertas
            </Badge>
          )}
        </div>

        {lowStockCount > 0 && (
          <Card className="shadow-lg border-destructive/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                Productos con stock bajo
              </CardTitle>
              <CardDescription>
                Los siguientes productos necesitan reabastecimiento
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {lowStockItems?.map((item: any) => (
                  <div key={item.id} className="flex justify-between items-center p-3 bg-destructive/10 rounded-lg">
                    <div>
                      <p className="font-medium">{item.name}</p>
                      <p className="text-sm text-muted-foreground">
                        Stock actual: {item.stock} | Alerta: {item.stockAlert}
                      </p>
                    </div>
                    <Button 
                      onClick={() => openAddStockDialog(item)}
                      size="sm"
                      variant="outline"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Agregar Stock
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Listado de Productos
            </CardTitle>
            <CardDescription>
              {inventory?.length || 0} productos en inventario
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : inventory && inventory.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Producto</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Precio</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inventory.map((item: any) => {
                    const stock = item.stock || 0;
                    const stockAlert = item.stockAlert || 10;
                    const isLowStock = stock <= stockAlert;
                    
                    return (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.productName || item.name}</TableCell>
                        <TableCell>{item.sku || "-"}</TableCell>
                        <TableCell>${Number(item.productPrice || item.price || 0).toLocaleString()}</TableCell>
                        <TableCell>
                          <span className={isLowStock ? "text-destructive font-bold" : ""}>
                            {stock}
                          </span>
                        </TableCell>
                        <TableCell>
                          {isLowStock ? (
                            <Badge variant="destructive">Bajo</Badge>
                          ) : (
                            <Badge variant="default">Normal</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              onClick={() => openAddStockDialog(item)}
                              size="sm"
                              variant="outline"
                              title="Agregar stock"
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                            <Button
                              onClick={() => openReduceStockDialog(item)}
                              size="sm"
                              variant="outline"
                              title="Reducir stock"
                            >
                              <Minus className="h-4 w-4" />
                            </Button>
                            <Button
                              onClick={() => openAdjustStockDialog(item)}
                              size="sm"
                              variant="outline"
                              title="Ajustar inventario"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No hay productos en el inventario
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modal: Agregar Stock */}
      <Dialog open={addStockDialogOpen} onOpenChange={setAddStockDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Agregar Stock</DialogTitle>
            <DialogDescription>
              Registra una entrada de inventario para {selectedProduct?.productName || selectedProduct?.name}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddStock} className="space-y-4">
            <div>
              <Label htmlFor="addQuantity">Cantidad *</Label>
              <Input
                id="addQuantity"
                type="number"
                min="1"
                value={addQuantity}
                onChange={(e) => setAddQuantity(e.target.value)}
                placeholder="Ej: 50"
                required
              />
            </div>
            
            <div>
              <Label htmlFor="supplier">Proveedor</Label>
              <Select value={selectedSupplierId} onValueChange={setSelectedSupplierId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un proveedor" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers?.map((supplier: any) => (
                    <SelectItem key={supplier.id} value={supplier.id.toString()}>
                      {supplier.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="unitCost">Costo unitario</Label>
              <Input
                id="unitCost"
                type="number"
                min="0"
                step="0.01"
                value={unitCost}
                onChange={(e) => setUnitCost(e.target.value)}
                placeholder="Ej: 15000"
              />
              {unitCost && addQuantity && (
                <p className="text-sm text-muted-foreground mt-1">
                  Costo total: ${(parseFloat(unitCost) * parseInt(addQuantity || "0")).toLocaleString()}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="addNotes">Notas</Label>
              <Input
                id="addNotes"
                value={addNotes}
                onChange={(e) => setAddNotes(e.target.value)}
                placeholder="Información adicional"
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddStockDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={addStockMutation.isPending}>
                {addStockMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Agregando...
                  </>
                ) : (
                  "Agregar Stock"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal: Reducir Stock */}
      <Dialog open={reduceStockDialogOpen} onOpenChange={setReduceStockDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reducir Stock</DialogTitle>
            <DialogDescription>
              Registra una salida de inventario para {selectedProduct?.productName || selectedProduct?.name}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleReduceStock} className="space-y-4">
            <div>
              <Label htmlFor="reduceQuantity">Cantidad *</Label>
              <Input
                id="reduceQuantity"
                type="number"
                min="1"
                value={reduceQuantity}
                onChange={(e) => setReduceQuantity(e.target.value)}
                placeholder="Ej: 10"
                required
              />
            </div>

            <div>
              <Label htmlFor="reduceReason">Motivo</Label>
              <Input
                id="reduceReason"
                value={reduceReason}
                onChange={(e) => setReduceReason(e.target.value)}
                placeholder="Ej: Producto dañado, Muestra, etc."
              />
            </div>

            <div>
              <Label htmlFor="reduceNotes">Notas</Label>
              <Input
                id="reduceNotes"
                value={reduceNotes}
                onChange={(e) => setReduceNotes(e.target.value)}
                placeholder="Información adicional"
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setReduceStockDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={reduceStockMutation.isPending}>
                {reduceStockMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Reduciendo...
                  </>
                ) : (
                  "Reducir Stock"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal: Ajustar Inventario */}
      <Dialog open={adjustStockDialogOpen} onOpenChange={setAdjustStockDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajustar Inventario</DialogTitle>
            <DialogDescription>
              Establece el stock exacto para {selectedProduct?.productName || selectedProduct?.name}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAdjustStock} className="space-y-4">
            <div>
              <Label htmlFor="adjustStock">Nuevo stock *</Label>
              <Input
                id="adjustStock"
                type="number"
                min="0"
                value={adjustStock}
                onChange={(e) => setAdjustStock(e.target.value)}
                placeholder="Ej: 100"
                required
              />
              <p className="text-sm text-muted-foreground mt-1">
                Stock actual: {selectedProduct?.stock || 0}
              </p>
            </div>

            <div>
              <Label htmlFor="adjustReason">Motivo</Label>
              <Input
                id="adjustReason"
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                placeholder="Ej: Inventario físico, Corrección, etc."
              />
            </div>

            <div>
              <Label htmlFor="adjustNotes">Notas</Label>
              <Input
                id="adjustNotes"
                value={adjustNotes}
                onChange={(e) => setAdjustNotes(e.target.value)}
                placeholder="Información adicional"
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAdjustStockDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={adjustStockMutation.isPending}>
                {adjustStockMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Ajustando...
                  </>
                ) : (
                  "Ajustar Inventario"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
