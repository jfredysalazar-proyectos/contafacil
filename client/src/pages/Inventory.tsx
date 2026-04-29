import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ResponsiveTable } from "@/components/ResponsiveTable";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  Loader2, Package, AlertTriangle, Plus, Minus, Edit, Search,
  FileSpreadsheet, TrendingUp, DollarSign, Boxes, History, ArrowUpCircle, ArrowDownCircle, SlidersHorizontal,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function Inventory() {
  const { user, loading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  const [searchTerm, setSearchTerm] = useState("");

  const [addStockDialogOpen, setAddStockDialogOpen] = useState(false);
  const [reduceStockDialogOpen, setReduceStockDialogOpen] = useState(false);
  const [adjustStockDialogOpen, setAdjustStockDialogOpen] = useState(false);
  const [quickSupplierDialogOpen, setQuickSupplierDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);

  const [addQuantity, setAddQuantity] = useState("");
  const [selectedSupplierId, setSelectedSupplierId] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [unitCost, setUnitCost] = useState("");
  const [addNotes, setAddNotes] = useState("");

  const [reduceQuantity, setReduceQuantity] = useState("");
  const [reduceReason, setReduceReason] = useState("");
  const [reduceNotes, setReduceNotes] = useState("");

  const [adjustStock, setAdjustStock] = useState("");
  const [adjustReason, setAdjustReason] = useState("");
  const [adjustNotes, setAdjustNotes] = useState("");

  const [quickSupplierName, setQuickSupplierName] = useState("");
  const [quickSupplierEmail, setQuickSupplierEmail] = useState("");
  const [quickSupplierPhone, setQuickSupplierPhone] = useState("");

  const [isDownloadingExcel, setIsDownloadingExcel] = useState(false);

  // Estado del modal de historial de movimientos
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [historyProduct, setHistoryProduct] = useState<any>(null);
  const [historyProductId, setHistoryProductId] = useState<number | null>(null);

  const { data: movementsData, isLoading: isLoadingMovements } = trpc.inventory.getMovements.useQuery(
    historyProductId ? { productId: historyProductId } : { productId: 0 },
    { enabled: !!historyProductId }
  );

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      setLocation("/login");
    }
  }, [loading, isAuthenticated, setLocation]);

  const utils = trpc.useUtils();
  const { data: inventory, isLoading } = trpc.inventory.list.useQuery();
  const { data: lowStockItems } = trpc.inventory.lowStock.useQuery();
  const { data: suppliers } = trpc.suppliers.list.useQuery();

  // Solo productos físicos (el backend ya filtra servicios, pero por si acaso)
  const filteredInventory = useMemo(() => {
    if (!inventory) return [];
    const items = (inventory as any[]).filter((item: any) => !item.isService);
    if (!searchTerm.trim()) return items;
    const term = searchTerm.toLowerCase();
    return items.filter((item: any) => {
      const productName = (item.productName || item.name || "").toLowerCase();
      const sku = (item.sku || "").toLowerCase();
      return productName.includes(term) || sku.includes(term);
    });
  }, [inventory, searchTerm]);

  // Resumen de valuación del inventario
  const inventorySummary = useMemo(() => {
    if (!filteredInventory.length) return { totalUnits: 0, totalValueCost: 0, totalValueSale: 0 };
    return filteredInventory.reduce(
      (acc: any, item: any) => {
        const stock = item.stock ?? 0;
        const avgCost = parseFloat(item.averageCost ?? "0") || 0;
        const price = parseFloat(item.productPrice ?? item.price ?? "0") || 0;
        return {
          totalUnits: acc.totalUnits + stock,
          totalValueCost: acc.totalValueCost + stock * avgCost,
          totalValueSale: acc.totalValueSale + stock * price,
        };
      },
      { totalUnits: 0, totalValueCost: 0, totalValueSale: 0 }
    );
  }, [filteredInventory]);

  // Calcular CPP proyectado al abrir el modal de agregar stock
  const projectedAvgCost = useMemo(() => {
    if (!selectedProduct || !unitCost || !addQuantity) return null;
    const currentStock = selectedProduct.stock ?? 0;
    const currentAvg = parseFloat(selectedProduct.averageCost ?? "0") || 0;
    const newQty = parseInt(addQuantity) || 0;
    const newCost = parseFloat(unitCost) || 0;
    if (newQty <= 0 || newCost <= 0) return null;
    const totalUnits = currentStock + newQty;
    if (totalUnits === 0) return newCost;
    return (currentStock * currentAvg + newQty * newCost) / totalUnits;
  }, [selectedProduct, unitCost, addQuantity]);

  const addStockMutation = trpc.inventory.addStock.useMutation({
    onSuccess: () => {
      toast.success("Stock agregado exitosamente");
      utils.inventory.list.invalidate();
      utils.inventory.lowStock.invalidate();
      utils.products.list.invalidate();
      resetAddStockForm();
      setAddStockDialogOpen(false);
    },
    onError: (error) => toast.error(error.message || "Error al agregar stock"),
  });

  const reduceStockMutation = trpc.inventory.reduceStock.useMutation({
    onSuccess: () => {
      toast.success("Stock reducido exitosamente");
      utils.inventory.list.invalidate();
      utils.inventory.lowStock.invalidate();
      utils.products.list.invalidate();
      resetReduceStockForm();
      setReduceStockDialogOpen(false);
    },
    onError: (error) => toast.error(error.message || "Error al reducir stock"),
  });

  const adjustStockMutation = trpc.inventory.adjustStock.useMutation({
    onSuccess: () => {
      toast.success("Inventario ajustado exitosamente");
      utils.inventory.list.invalidate();
      utils.inventory.lowStock.invalidate();
      utils.products.list.invalidate();
      resetAdjustStockForm();
      setAdjustStockDialogOpen(false);
    },
    onError: (error) => toast.error(error.message || "Error al ajustar inventario"),
  });

  const createQuickSupplierMutation = trpc.suppliers.create.useMutation({
    onSuccess: () => {
      toast.success("Proveedor creado exitosamente");
      utils.suppliers.list.invalidate();
      resetQuickSupplierForm();
      setQuickSupplierDialogOpen(false);
    },
    onError: (error) => toast.error(error.message || "Error al crear proveedor"),
  });

  const resetAddStockForm = () => {
    setAddQuantity(""); setSelectedSupplierId(""); setInvoiceNumber("");
    setUnitCost(""); setAddNotes(""); setSelectedProduct(null);
  };
  const resetReduceStockForm = () => {
    setReduceQuantity(""); setReduceReason(""); setReduceNotes(""); setSelectedProduct(null);
  };
  const resetAdjustStockForm = () => {
    setAdjustStock(""); setAdjustReason(""); setAdjustNotes(""); setSelectedProduct(null);
  };
  const resetQuickSupplierForm = () => {
    setQuickSupplierName(""); setQuickSupplierEmail(""); setQuickSupplierPhone("");
  };

  const handleAddStock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) { toast.error("No se ha seleccionado un producto"); return; }
    if (!addQuantity || parseInt(addQuantity) <= 0) { toast.error("La cantidad debe ser mayor a 0"); return; }
    let notes = addNotes || "";
    if (invoiceNumber.trim()) notes = `Factura: ${invoiceNumber}${notes ? ` - ${notes}` : ""}`;
    addStockMutation.mutate({
      productId: selectedProduct.productId || selectedProduct.id,
      quantity: parseInt(addQuantity),
      supplierId: selectedSupplierId ? parseInt(selectedSupplierId) : undefined,
      unitCost: unitCost ? parseFloat(unitCost) : undefined,
      notes: notes || undefined,
    });
  };

  const handleReduceStock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;
    reduceStockMutation.mutate({
      productId: selectedProduct.productId || selectedProduct.id,
      quantity: parseInt(reduceQuantity),
      reason: reduceReason || undefined,
      notes: reduceNotes || undefined,
    });
  };

  const handleAdjustStock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;
    adjustStockMutation.mutate({
      productId: selectedProduct.productId || selectedProduct.id,
      newStock: parseInt(adjustStock),
      reason: adjustReason || undefined,
      notes: adjustNotes || undefined,
    });
  };

  const openAddStockDialog = (product: any) => {
    setSelectedProduct(product);
    setUnitCost(product.averageCost > 0 ? String(product.averageCost) : "");
    setAddStockDialogOpen(true);
  };
  const openReduceStockDialog = (product: any) => { setSelectedProduct(product); setReduceStockDialogOpen(true); };
  const openAdjustStockDialog = (product: any) => {
    setSelectedProduct(product);
    setAdjustStock(product.stock?.toString() || "0");
    setAdjustStockDialogOpen(true);
  };

  const openHistoryDialog = (product: any) => {
    setHistoryProduct(product);
    setHistoryProductId(product.productId || product.id);
    setHistoryDialogOpen(true);
  };

  const handleCreateQuickSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickSupplierName.trim()) { toast.error("El nombre del proveedor es requerido"); return; }
    createQuickSupplierMutation.mutate({
      name: quickSupplierName,
      email: quickSupplierEmail || undefined,
      phone: quickSupplierPhone || undefined,
    });
  };

  const handleDownloadInventoryExcel = async () => {
    setIsDownloadingExcel(true);
    try {
      const response = await fetch("/api/inventory/excel", { credentials: "include" });
      if (!response.ok) throw new Error("Error al generar el reporte");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const today = new Date().toISOString().split("T")[0];
      link.download = `ContaFacil_Inventario_${today}.xlsx`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success("Reporte de inventario descargado");
    } catch {
      toast.error("Error al descargar el reporte de inventario");
    } finally {
      setIsDownloadingExcel(false);
    }
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

        {/* Encabezado */}
        <div className="flex flex-wrap justify-between items-start gap-4">
          <div>
            <h1 className="text-4xl font-bold text-foreground">Inventario</h1>
            <p className="text-muted-foreground mt-2">
              Gestiona el stock de tus productos físicos · Valuación: Costo Promedio Ponderado (CPP)
            </p>
          </div>
          <div className="flex items-center gap-3">
            {lowStockCount > 0 && (
              <Badge variant="destructive" className="text-sm px-3 py-1.5">
                <AlertTriangle className="mr-1.5 h-4 w-4" />
                {lowStockCount} alertas
              </Badge>
            )}
            <Button
              onClick={handleDownloadInventoryExcel}
              disabled={isDownloadingExcel}
              variant="outline"
              className="border-green-600 text-green-700 hover:bg-green-50"
            >
              {isDownloadingExcel ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <FileSpreadsheet className="mr-2 h-4 w-4" />
              )}
              Reporte Excel
            </Button>
          </div>
        </div>

        {/* Tarjetas de resumen de valuación */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="pt-4 pb-4 flex items-center gap-3">
              <Boxes className="h-8 w-8 text-blue-500 shrink-0" />
              <div>
                <p className="text-sm text-blue-600 font-medium">Total unidades</p>
                <p className="text-2xl font-bold text-blue-800">
                  {inventorySummary.totalUnits.toLocaleString("es-CO")}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-amber-50 border-amber-200">
            <CardContent className="pt-4 pb-4 flex items-center gap-3">
              <DollarSign className="h-8 w-8 text-amber-500 shrink-0" />
              <div>
                <p className="text-sm text-amber-600 font-medium">Valor a costo (CPP)</p>
                <p className="text-2xl font-bold text-amber-800">
                  ${inventorySummary.totalValueCost.toLocaleString("es-CO", { maximumFractionDigits: 0 })}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-green-50 border-green-200">
            <CardContent className="pt-4 pb-4 flex items-center gap-3">
              <TrendingUp className="h-8 w-8 text-green-500 shrink-0" />
              <div>
                <p className="text-sm text-green-600 font-medium">Valor a precio de venta</p>
                <p className="text-2xl font-bold text-green-800">
                  ${inventorySummary.totalValueSale.toLocaleString("es-CO", { maximumFractionDigits: 0 })}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Alertas de stock bajo */}
        {lowStockCount > 0 && (
          <Card className="shadow-lg border-destructive/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                Productos con stock bajo
              </CardTitle>
              <CardDescription>Los siguientes productos necesitan reabastecimiento</CardDescription>
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
                    <Button onClick={() => openAddStockDialog(item)} size="sm" variant="outline">
                      <Plus className="h-4 w-4 mr-1" /> Reponer
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tabla de inventario */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Listado de Productos Físicos
            </CardTitle>
            <CardDescription>
              {filteredInventory?.length || 0} productos en inventario · Los servicios no aparecen aquí
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nombre o SKU..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredInventory && filteredInventory.length > 0 ? (
              <ResponsiveTable>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Producto</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead className="text-right">Precio Venta</TableHead>
                      <TableHead className="text-right">Costo Prom. (CPP)</TableHead>
                      <TableHead className="text-right">Stock</TableHead>
                      <TableHead className="text-right">Valor Inventario</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredInventory.map((item: any) => {
                      const stock = item.stock ?? 0;
                      const stockAlert = item.stockAlert ?? 10;
                      const isLowStock = stock <= stockAlert;
                      const avgCost = parseFloat(item.averageCost ?? "0") || 0;
                      const price = parseFloat(item.productPrice ?? item.price ?? "0") || 0;
                      const valorInventario = stock * avgCost;

                      return (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.productName || item.name}</TableCell>
                          <TableCell className="text-muted-foreground">{item.sku || "-"}</TableCell>
                          <TableCell className="text-right">
                            {price > 0 ? `$${price.toLocaleString("es-CO")}` : "-"}
                          </TableCell>
                          <TableCell className="text-right">
                            {avgCost > 0 ? (
                              <span className="font-medium text-amber-700">
                                ${avgCost.toLocaleString("es-CO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            ) : (
                              <span className="text-muted-foreground text-sm">Sin costo</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <span className={isLowStock ? "text-destructive font-bold" : "font-medium"}>
                              {stock}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            {valorInventario > 0 ? (
                              <span className="text-sm">
                                ${valorInventario.toLocaleString("es-CO", { maximumFractionDigits: 0 })}
                              </span>
                            ) : "-"}
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
                              <Button onClick={() => openAddStockDialog(item)} size="sm" variant="outline" title="Agregar stock">
                                <Plus className="h-4 w-4" />
                              </Button>
                              <Button onClick={() => openReduceStockDialog(item)} size="sm" variant="outline" title="Reducir stock">
                                <Minus className="h-4 w-4" />
                              </Button>
                              <Button onClick={() => openAdjustStockDialog(item)} size="sm" variant="outline" title="Ajustar inventario">
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button onClick={() => openHistoryDialog(item)} size="sm" variant="outline" title="Historial de movimientos" className="text-purple-600 hover:text-purple-700 hover:bg-purple-50">
                                <History className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </ResponsiveTable>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                {searchTerm ? "No se encontraron productos que coincidan con la búsqueda" : "No hay productos físicos en el inventario"}
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
              Registra una entrada de inventario para <strong>{selectedProduct?.productName || selectedProduct?.name}</strong>
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddStock} className="space-y-4">
            <div>
              <Label htmlFor="addQuantity">Cantidad *</Label>
              <Input id="addQuantity" type="number" min="1" value={addQuantity}
                onChange={(e) => setAddQuantity(e.target.value)} placeholder="Ej: 50" required />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label htmlFor="supplier">Proveedor</Label>
                <Button type="button" variant="outline" size="sm" onClick={() => setQuickSupplierDialogOpen(true)} className="h-7 text-xs">
                  <Plus className="h-3 w-3 mr-1" /> Nuevo
                </Button>
              </div>
              <Select value={selectedSupplierId} onValueChange={setSelectedSupplierId}>
                <SelectTrigger><SelectValue placeholder="Selecciona un proveedor" /></SelectTrigger>
                <SelectContent>
                  {suppliers?.map((supplier: any) => (
                    <SelectItem key={supplier.id} value={supplier.id.toString()}>{supplier.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="invoiceNumber">Número de Factura</Label>
              <Input id="invoiceNumber" value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} placeholder="Ej: FAC-001234" />
            </div>

            <div>
              <Label htmlFor="unitCost">Costo unitario de compra</Label>
              <Input id="unitCost" type="number" min="0" step="0.01" value={unitCost}
                onChange={(e) => setUnitCost(e.target.value)} placeholder="Ej: 15000" />
              {/* Información de CPP actual y proyectado */}
              <div className="mt-2 space-y-1 text-sm">
                {selectedProduct?.averageCost > 0 && (
                  <p className="text-muted-foreground">
                    CPP actual: <strong>${parseFloat(selectedProduct.averageCost).toLocaleString("es-CO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                    {" "}· Stock actual: <strong>{selectedProduct.stock}</strong>
                  </p>
                )}
                {projectedAvgCost !== null && (
                  <p className="text-amber-700 font-medium">
                    → Nuevo CPP proyectado: ${projectedAvgCost.toLocaleString("es-CO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                )}
                {unitCost && addQuantity && (
                  <p className="text-muted-foreground">
                    Costo total de esta entrada: ${(parseFloat(unitCost) * parseInt(addQuantity || "0")).toLocaleString("es-CO")}
                  </p>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="addNotes">Notas adicionales</Label>
              <Input id="addNotes" value={addNotes} onChange={(e) => setAddNotes(e.target.value)} placeholder="Información adicional" />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddStockDialogOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={addStockMutation.isPending}>
                {addStockMutation.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Agregando...</> : "Agregar Stock"}
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
              <Input id="reduceQuantity" type="number" min="1" max={selectedProduct?.stock || 0}
                value={reduceQuantity} onChange={(e) => setReduceQuantity(e.target.value)} placeholder="Ej: 10" required />
              <p className="text-sm text-muted-foreground mt-1">Stock disponible: {selectedProduct?.stock || 0}</p>
            </div>
            <div>
              <Label htmlFor="reduceReason">Motivo *</Label>
              <Select value={reduceReason} onValueChange={setReduceReason} required>
                <SelectTrigger><SelectValue placeholder="Selecciona un motivo" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="damaged">Producto dañado</SelectItem>
                  <SelectItem value="expired">Producto vencido</SelectItem>
                  <SelectItem value="sample">Muestra o regalo</SelectItem>
                  <SelectItem value="theft">Pérdida o robo</SelectItem>
                  <SelectItem value="return">Devolución a proveedor</SelectItem>
                  <SelectItem value="other">Otro motivo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="reduceNotes">Notas adicionales</Label>
              <Input id="reduceNotes" value={reduceNotes} onChange={(e) => setReduceNotes(e.target.value)} placeholder="Información adicional" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setReduceStockDialogOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={reduceStockMutation.isPending}>
                {reduceStockMutation.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Reduciendo...</> : "Reducir Stock"}
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
              <Input id="adjustStock" type="number" min="0" value={adjustStock}
                onChange={(e) => setAdjustStock(e.target.value)} placeholder="Ej: 100" required />
              <p className="text-sm text-muted-foreground mt-1">Stock actual: {selectedProduct?.stock || 0}</p>
            </div>
            <div>
              <Label htmlFor="adjustReason">Motivo</Label>
              <Input id="adjustReason" value={adjustReason} onChange={(e) => setAdjustReason(e.target.value)} placeholder="Ej: Inventario físico, Corrección, etc." />
            </div>
            <div>
              <Label htmlFor="adjustNotes">Notas</Label>
              <Input id="adjustNotes" value={adjustNotes} onChange={(e) => setAdjustNotes(e.target.value)} placeholder="Información adicional" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAdjustStockDialogOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={adjustStockMutation.isPending}>
                {adjustStockMutation.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Ajustando...</> : "Ajustar Inventario"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal: Historial de Movimientos */}
      <Dialog open={historyDialogOpen} onOpenChange={(open) => { if (!open) { setHistoryDialogOpen(false); setHistoryProduct(null); setHistoryProductId(null); } }}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5 text-purple-600" />
              Historial de Movimientos
            </DialogTitle>
            <DialogDescription>
              <strong>{historyProduct?.productName || historyProduct?.name}</strong> — Todas las entradas, salidas y ajustes
            </DialogDescription>
          </DialogHeader>

          {isLoadingMovements ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-purple-500" />
            </div>
          ) : !movementsData || (movementsData as any[]).length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <History className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p>No hay movimientos registrados para este producto</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-right">Cantidad</TableHead>
                    <TableHead className="text-right">Costo Unit.</TableHead>
                    <TableHead className="text-right">Stock Resultante</TableHead>
                    <TableHead>Motivo / Notas</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(movementsData as any[]).map((mov: any) => {
                    // La BD guarda movementType: "in" | "out" | "adjustment"
                    const mType = mov.movementType || mov.type || "";
                    const isEntry = mType === "in";
                    const isAdjust = mType === "adjustment";
                    const isOut = mType === "out";

                    // Determinar etiqueta legible según el motivo
                    let typeLabel = "Movimiento";
                    if (isEntry) {
                      const r = (mov.reason || "").toLowerCase();
                      typeLabel = r.includes("devoluci") ? "Devolución" : "Entrada";
                    } else if (isAdjust) {
                      typeLabel = "Ajuste";
                    } else if (isOut) {
                      const r = (mov.reason || "").toLowerCase();
                      typeLabel = r.includes("venta") ? "Venta" : "Salida";
                    }

                    // MySQL puede devolver createdAt como objeto Date, string ISO o timestamp
                    const rawDate = mov.createdAt;
                    let dateDisplay = "-";
                    try {
                      let d: Date;
                      if (rawDate instanceof Date) {
                        d = rawDate;
                      } else if (typeof rawDate === "string") {
                        // MySQL devuelve "2026-02-03 19:06:19" (con espacio, no T)
                        // new Date() no parsea este formato en Safari/Firefox
                        const isoStr = rawDate.replace(" ", "T");
                        d = new Date(isoStr);
                      } else {
                        d = new Date(rawDate);
                      }
                      if (!isNaN(d.getTime())) {
                        dateDisplay = d.toLocaleString("es-CO", { dateStyle: "short", timeStyle: "short" });
                      }
                    } catch {}

                    // MySQL puede devolver quantity como string
                    const qty = typeof mov.quantity === "string" ? parseInt(mov.quantity, 10) : (mov.quantity ?? 0);

                    return (
                      <TableRow key={mov.id}>
                        <TableCell className="text-sm whitespace-nowrap">
                          {dateDisplay}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            {isEntry ? (
                              <ArrowUpCircle className="h-4 w-4 text-green-600" />
                            ) : isAdjust ? (
                              <SlidersHorizontal className="h-4 w-4 text-blue-600" />
                            ) : (
                              <ArrowDownCircle className="h-4 w-4 text-red-500" />
                            )}
                            <span className={`text-xs font-medium ${
                              isEntry ? "text-green-700" : isAdjust ? "text-blue-700" : "text-red-600"
                            }`}>
                              {typeLabel}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          <span className={isEntry ? "text-green-700" : isAdjust ? "text-blue-700" : "text-red-600"}>
                            {isEntry ? "+" : isAdjust ? "→" : "-"}{Math.abs(qty)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right text-sm">
                          {mov.unitCost && parseFloat(mov.unitCost) > 0
                            ? `$${parseFloat(mov.unitCost).toLocaleString("es-CO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                            : "-"}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {mov.stockAfter ?? "-"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                          {mov.reason || mov.notes || "-"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          <div className="flex justify-end pt-2">
            <Button variant="outline" onClick={() => setHistoryDialogOpen(false)}>Cerrar</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal: Crear Proveedor Rápido */}
      <Dialog open={quickSupplierDialogOpen} onOpenChange={setQuickSupplierDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Crear Proveedor Rápido</DialogTitle>
            <DialogDescription>Agrega un nuevo proveedor sin salir del flujo de inventario</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateQuickSupplier} className="space-y-4">
            <div>
              <Label htmlFor="quickSupplierName">Nombre *</Label>
              <Input id="quickSupplierName" value={quickSupplierName} onChange={(e) => setQuickSupplierName(e.target.value)} placeholder="Ej: Distribuidora XYZ" required />
            </div>
            <div>
              <Label htmlFor="quickSupplierEmail">Email</Label>
              <Input id="quickSupplierEmail" type="email" value={quickSupplierEmail} onChange={(e) => setQuickSupplierEmail(e.target.value)} placeholder="Ej: contacto@proveedor.com" />
            </div>
            <div>
              <Label htmlFor="quickSupplierPhone">Teléfono</Label>
              <Input id="quickSupplierPhone" value={quickSupplierPhone} onChange={(e) => setQuickSupplierPhone(e.target.value)} placeholder="Ej: +57 300 123 4567" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setQuickSupplierDialogOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={createQuickSupplierMutation.isPending}>
                {createQuickSupplierMutation.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creando...</> : "Crear Proveedor"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
