import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Loader2, Plus, Edit, Trash2, Package, QrCode, Image as ImageIcon } from "lucide-react";
import { ResponsiveTable } from "@/components/ResponsiveTable";
import { ProductFormDialog } from "@/components/ProductFormDialog";

export default function Products() {
  const { loading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [filterCategory, setFilterCategory] = useState("all");

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      setLocation("/login");
    }
  }, [loading, isAuthenticated, setLocation]);

  // Detectar si se debe abrir el diálogo de crear producto desde URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("action") === "create") {
      setIsDialogOpen(true);
      window.history.replaceState({}, "", "/products");
    }
  }, []);

  const utils = trpc.useUtils();
  const { data: products, isLoading } = trpc.products.list.useQuery();
  const { data: categories } = trpc.categories.products.list.useQuery();

  const deleteMutation = trpc.products.delete.useMutation({
    onSuccess: () => {
      toast.success("Producto eliminado exitosamente");
      utils.products.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Error al eliminar producto");
    },
  });

  const handleEdit = (product: any) => {
    setEditingProduct(product);
    setIsDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("¿Estás seguro de eliminar este producto?")) {
      deleteMutation.mutate({ id });
    }
  };

  const handleDialogClose = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) setEditingProduct(null);
  };

  if (loading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-accent/5">
      <div className="container py-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-foreground">Productos</h1>
            <p className="text-muted-foreground mt-1">
              Gestiona tu catálogo de productos
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLocation("/serial-numbers")}
            >
              <Package className="mr-2 h-4 w-4" />
              Números de Serie
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLocation("/product-qr-codes")}
            >
              <QrCode className="mr-2 h-4 w-4" />
              Códigos QR
            </Button>
            <Button size="sm" onClick={() => { setEditingProduct(null); setIsDialogOpen(true); }}>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Producto
            </Button>
          </div>
        </div>

        {/* Diálogo unificado de producto */}
        <ProductFormDialog
          open={isDialogOpen}
          onOpenChange={handleDialogClose}
          editingProduct={editingProduct}
        />

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Lista de Productos</CardTitle>
            <CardDescription className="flex items-center gap-4 flex-wrap">
              <span>{products?.length || 0} productos registrados</span>
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="w-48 h-7 text-xs">
                  <SelectValue placeholder="Todas las categorías" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las categorías</SelectItem>
                  {categories?.map((cat: any) => (
                    <SelectItem key={cat.id} value={String(cat.id)}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : products && products.length > 0 ? (
              <ResponsiveTable>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Imagen</TableHead>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Categoría</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead>Precio</TableHead>
                      <TableHead>Stock</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(filterCategory === "all"
                      ? products
                      : products.filter(
                          (p: any) =>
                            String(p.categoryId) === filterCategory
                        )
                    ).map((product: any) => (
                      <TableRow key={product.id}>
                        <TableCell>
                          {product.imageUrl ? (
                            <img
                              src={product.imageUrl}
                              alt={product.name}
                              className="w-12 h-12 object-cover rounded"
                            />
                          ) : (
                            <div className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center">
                              <ImageIcon className="h-6 w-6 text-gray-400" />
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="font-medium">
                          {product.name}
                          {product.featured && (
                            <span className="ml-2 text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded">
                              ⭐ Destacado
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          {product.categoryId ? (
                            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                              {categories?.find(
                                (c: any) => c.id === product.categoryId
                              )?.name || "-"}
                            </span>
                          ) : (
                            <span className="text-gray-400 text-xs">-</span>
                          )}
                        </TableCell>
                        <TableCell>{product.sku || "-"}</TableCell>
                        <TableCell>
                          {product.promotionalPrice ? (
                            <div>
                              <span className="line-through text-gray-400 text-sm">
                                ${parseFloat(product.price).toLocaleString()}
                              </span>
                              <br />
                              <span className="text-green-600 font-semibold">
                                $
                                {parseFloat(
                                  product.promotionalPrice
                                ).toLocaleString()}
                              </span>
                            </div>
                          ) : (
                            `$${parseFloat(product.price).toLocaleString()}`
                          )}
                        </TableCell>
                        <TableCell>
                          {product.stockControlEnabled ? (
                            <span
                              className={
                                product.stock <= product.stockAlert
                                  ? "text-red-600 font-semibold"
                                  : ""
                              }
                            >
                              {product.stock}{" "}
                              {product.stock <= product.stockAlert && "⚠️"}
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                            {product.sellBy === "unit" ? "Unidad" : "Fracción"}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(product)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(product.id)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ResponsiveTable>
            ) : (
              <div className="text-center py-12">
                <Package className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-4 text-lg font-semibold text-gray-900">
                  No hay productos registrados
                </h3>
                <p className="mt-2 text-sm text-gray-500">
                  Comienza agregando tu primer producto
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
