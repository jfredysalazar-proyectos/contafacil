import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Loader2, Package, AlertTriangle, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function Inventory() {
  const { user, loading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [newStock, setNewStock] = useState("");

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      setLocation("/login");
    }
  }, [loading, isAuthenticated, setLocation]);

  const utils = trpc.useUtils();
  const { data: inventory, isLoading } = trpc.inventory.list.useQuery();
  const { data: lowStockItems } = trpc.inventory.lowStock.useQuery();

  const updateMutation = trpc.inventory.update.useMutation({
    onSuccess: () => {
      toast.success("Inventario actualizado exitosamente");
      utils.inventory.list.invalidate();
      utils.inventory.lowStock.invalidate();
      setIsDialogOpen(false);
      setSelectedItem(null);
      setNewStock("");
    },
    onError: (error) => {
      toast.error(error.message || "Error al actualizar inventario");
    },
  });

  const handleUpdateStock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;

    updateMutation.mutate({
      productId: selectedItem.productId,
      variationId: selectedItem.variationId,
      stock: parseInt(newStock),
    });
  };

  const openUpdateDialog = (item: any) => {
    setSelectedItem(item);
    setNewStock(item.stock.toString());
    setIsDialogOpen(true);
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
              Controla el stock de tus productos
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
                {lowStockItems?.map((item) => (
                  <div
                    key={item.productId}
                    className="flex justify-between items-center p-3 bg-destructive/10 rounded-lg border border-destructive/20"
                  >
                    <div>
                      <p className="font-medium">{item.productName}</p>
                      <p className="text-sm text-muted-foreground">
                        Stock actual: <span className="font-semibold text-destructive">{item.stock}</span> | 
                        Alerta: {item.stockAlert}
                      </p>
                    </div>
                    <Package className="h-5 w-5 text-destructive" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Inventario General</CardTitle>
            <CardDescription>
              {inventory?.length || 0} items en inventario
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center items-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : inventory && inventory.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Producto</TableHead>
                    <TableHead>Variación</TableHead>
                    <TableHead>Stock Actual</TableHead>
                    <TableHead>Alerta</TableHead>
                    <TableHead>Precio</TableHead>
                    <TableHead>Último Reabastecimiento</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inventory.map((item, index) => {
                    const isLowStock = item.stock <= (item.stockAlert || 0);
                    return (
                      <TableRow key={index} className={isLowStock ? "bg-destructive/5" : ""}>
                        <TableCell className="font-medium">{item.productName}</TableCell>
                        <TableCell>{item.variationName || "-"}</TableCell>
                        <TableCell>
                          <Badge variant={isLowStock ? "destructive" : "default"}>
                            {item.stock}
                          </Badge>
                        </TableCell>
                        <TableCell>{item.stockAlert}</TableCell>
                        <TableCell>
                          ${item.productPrice ? Number(item.productPrice).toLocaleString("es-CO") : "0"}
                        </TableCell>
                        <TableCell>
                          {item.lastRestockDate 
                            ? new Date(item.lastRestockDate).toLocaleDateString("es-CO")
                            : "-"
                          }
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openUpdateDialog(item)}
                          >
                            <TrendingUp className="h-4 w-4 mr-2" />
                            Actualizar
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-12">
                <Package className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No hay items en inventario</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Los productos aparecerán aquí cuando realices ventas
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <form onSubmit={handleUpdateStock}>
              <DialogHeader>
                <DialogTitle>Actualizar Stock</DialogTitle>
                <DialogDescription>
                  {selectedItem?.productName}
                  {selectedItem?.variationName && ` - ${selectedItem.variationName}`}
                </DialogDescription>
              </DialogHeader>
              <div className="py-4 space-y-4">
                <div className="space-y-2">
                  <Label>Stock actual</Label>
                  <p className="text-2xl font-bold">{selectedItem?.stock}</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newStock">Nuevo stock *</Label>
                  <Input
                    id="newStock"
                    type="number"
                    value={newStock}
                    onChange={(e) => setNewStock(e.target.value)}
                    required
                    min="0"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Actualizando...
                    </>
                  ) : (
                    "Actualizar"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
