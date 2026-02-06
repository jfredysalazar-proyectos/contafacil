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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Loader2, Plus, Edit, Trash2, Package, Upload, Image as ImageIcon, QrCode } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

export default function Products() {
  const { user, loading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    sku: "",
    price: "",
    cost: "",
    imageUrl: "",
    stockControlEnabled: false,
    stock: "0",
    stockAlert: "10",
    sellBy: "unit" as "unit" | "fraction",
    taxType: "iva_19" as "excluded" | "exempt" | "iva_5" | "iva_19",
    promotionalPrice: "",
    featured: false,
  });

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      setLocation("/login");
    }
  }, [loading, isAuthenticated, setLocation]);

  // Detectar si se debe abrir el diálogo de crear producto
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('action') === 'create') {
      setIsDialogOpen(true);
      // Limpiar el parámetro de la URL
      window.history.replaceState({}, '', '/products');
    }
  }, []);

  const utils = trpc.useUtils();
  const { data: products, isLoading } = trpc.products.list.useQuery();

  const createMutation = trpc.products.create.useMutation({
    onSuccess: () => {
      toast.success("Producto creado exitosamente");
      utils.products.list.invalidate();
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error(error.message || "Error al crear producto");
    },
  });

  const updateMutation = trpc.products.update.useMutation({
    onSuccess: () => {
      toast.success("Producto actualizado exitosamente");
      utils.products.list.invalidate();
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error(error.message || "Error al actualizar producto");
    },
  });

  const deleteMutation = trpc.products.delete.useMutation({
    onSuccess: () => {
      toast.success("Producto eliminado exitosamente");
      utils.products.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Error al eliminar producto");
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      sku: "",
      price: "",
      cost: "",
      imageUrl: "",
      stockControlEnabled: false,
      stock: "0",
      stockAlert: "10",
      sellBy: "unit",
      taxType: "iva_19",
      promotionalPrice: "",
      featured: false,
    });
    setImagePreview(null);
    setEditingProduct(null);
  };

  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const uploadImageMutation = trpc.upload.uploadImage.useMutation({
    onSuccess: (data) => {
      setFormData({ ...formData, imageUrl: data.url });
      toast.success("Imagen subida exitosamente");
      setIsUploadingImage(false);
    },
    onError: (error) => {
      toast.error(error.message || "Error al subir la imagen");
      setIsUploadingImage(false);
    },
  });

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validar tamaño (máx 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error("La imagen no debe superar los 5MB");
        return;
      }

      // Validar tipo
      if (!file.type.startsWith("image/")) {
        toast.error("Solo se permiten archivos de imagen");
        return;
      }

      setIsUploadingImage(true);
      toast.info("Subiendo imagen...");

      // Crear preview
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64Image = reader.result as string;
        setImagePreview(base64Image);
        
        // Subir a Cloudinary
        uploadImageMutation.mutate({
          image: base64Image,
          folder: "contafacil/products",
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Construir payload solo con campos que tienen valores
    const payload: any = {
      name: formData.name,
      price: formData.price,
      stockAlert: parseInt(formData.stockAlert),
      stock: parseInt(formData.stock),
      sellBy: formData.sellBy,
      taxType: formData.taxType,
      hasVariations: formData.hasVariations || false,
      stockControlEnabled: formData.stockControlEnabled || false,
      featured: formData.featured || false,
    };

    // Agregar campos opcionales solo si tienen valor
    if (formData.description) payload.description = formData.description;
    if (formData.sku) payload.sku = formData.sku;
    if (formData.cost) payload.cost = formData.cost;
    if (formData.imageUrl) payload.imageUrl = formData.imageUrl;
    if (formData.promotionalPrice) payload.promotionalPrice = formData.promotionalPrice;
    // NO agregar categoryId ni barcode si no tienen valor

    if (editingProduct) {
      updateMutation.mutate({
        id: editingProduct.id,
        ...payload,
      });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleEdit = (product: any) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description || "",
      sku: product.sku || "",
      price: product.price,
      cost: product.cost || "",
      imageUrl: product.imageUrl || "",
      stockControlEnabled: product.stockControlEnabled || false,
      stock: product.stock?.toString() || "0",
      stockAlert: product.stockAlert?.toString() || "10",
      sellBy: product.sellBy || "unit",
      taxType: (product as any).taxType || "iva_19",
      promotionalPrice: product.promotionalPrice || "",
      featured: product.featured || false,
    });
    if (product.imageUrl) {
      setImagePreview(product.imageUrl);
    }
    setIsDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("¿Estás seguro de eliminar este producto?")) {
      deleteMutation.mutate({ id });
    }
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
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold text-foreground">Productos</h1>
            <p className="text-muted-foreground mt-2">
              Gestiona tu catálogo de productos
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setLocation("/serial-numbers")}
            >
              <Package className="mr-2 h-4 w-4" />
              Números de Serie
            </Button>
            <Button
              variant="outline"
              onClick={() => setLocation("/product-qr-codes")}
            >
              <QrCode className="mr-2 h-4 w-4" />
              Códigos QR
            </Button>
            <Dialog open={isDialogOpen} onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) resetForm();
            }}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Nuevo Producto
                </Button>
              </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <form onSubmit={handleSubmit}>
                <DialogHeader>
                  <DialogTitle>
                    {editingProduct ? "Editar Producto" : "Nuevo Producto"}
                  </DialogTitle>
                  <DialogDescription>
                    Completa la información del producto
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-6 py-4">
                  {/* Imagen del Producto */}
                  <div className="space-y-2">
                    <Label>Imagen del Producto (Opcional)</Label>
                    <div className="flex items-center gap-4">
                      <div className="w-32 h-32 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center overflow-hidden bg-gray-50">
                        {imagePreview ? (
                          <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                        ) : (
                          <ImageIcon className="h-12 w-12 text-gray-400" />
                        )}
                      </div>
                      <div className="flex-1">
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={handleImageChange}
                          className="cursor-pointer"
                          disabled={isUploadingImage}
                        />
                        {isUploadingImage ? (
                          <p className="text-sm text-blue-600 mt-2 flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Subiendo imagen a Cloudinary...
                          </p>
                        ) : (
                          <p className="text-sm text-muted-foreground mt-2">
                            Sube una imagen del producto (JPG, PNG, máx 5MB)
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Información Básica */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Nombre del Producto *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Ej: Laptop HP 15"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="sku">SKU / Código</Label>
                      <Input
                        id="sku"
                        value={formData.sku}
                        onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                        placeholder="Ej: LAP-HP-001"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Descripción</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Describe las características del producto..."
                      rows={3}
                    />
                  </div>

                  {/* Precios */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="price">Precio de Venta (COP) *</Label>
                      <Input
                        id="price"
                        type="number"
                        step="0.01"
                        value={formData.price}
                        onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                        placeholder="0.00"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cost">Costo (COP)</Label>
                      <Input
                        id="cost"
                        type="number"
                        step="0.01"
                        value={formData.cost}
                        onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                        placeholder="0.00"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="promotionalPrice">Precio Promocional (COP)</Label>
                      <Input
                        id="promotionalPrice"
                        type="number"
                        step="0.01"
                        value={formData.promotionalPrice}
                        onChange={(e) => setFormData({ ...formData, promotionalPrice: e.target.value })}
                        placeholder="0.00"
                      />
                      <p className="text-xs text-muted-foreground">
                        El precio normal aparecerá tachado
                      </p>
                    </div>
                  </div>

                  {/* Tipo de Venta */}
                  <div className="space-y-2">
                    <Label htmlFor="sellBy">Vender por</Label>
                    <Select
                      value={formData.sellBy}
                      onValueChange={(value: "unit" | "fraction") => 
                        setFormData({ ...formData, sellBy: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unit">Unidad (enteros)</SelectItem>
                        <SelectItem value="fraction">Fracción (kg, litros, metros, etc.)</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-sm text-muted-foreground">
                      {formData.sellBy === "unit" 
                        ? "Se venderá en cantidades enteras (1, 2, 3...)" 
                        : "Se puede vender en cantidades decimales (1.5 kg, 2.75 litros...)"}
                    </p>
                  </div>

                  {/* Tipo de Impuesto */}
                  <div className="space-y-2">
                    <Label htmlFor="taxType">Tipo de Impuesto</Label>
                    <Select
                      value={formData.taxType}
                      onValueChange={(value: "excluded" | "exempt" | "iva_5" | "iva_19") => 
                        setFormData({ ...formData, taxType: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="excluded">Excluido</SelectItem>
                        <SelectItem value="exempt">IVA 0% (Exento)</SelectItem>
                        <SelectItem value="iva_5">IVA 5%</SelectItem>
                        <SelectItem value="iva_19">IVA 19%</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-sm text-muted-foreground">
                      {formData.taxType === "excluded" && "Producto excluido de IVA"}
                      {formData.taxType === "exempt" && "Producto exento de IVA (0%)"}
                      {formData.taxType === "iva_5" && "Se aplicará IVA del 5%"}
                      {formData.taxType === "iva_19" && "Se aplicará IVA del 19%"}
                    </p>
                  </div>

                  {/* Control de Stock */}
                  <div className="space-y-4 p-4 border rounded-lg bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="stockControl" className="text-base font-semibold">
                          Control de Stock
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          Activa esta opción para controlar el inventario del producto
                        </p>
                      </div>
                      <Switch
                        id="stockControl"
                        checked={formData.stockControlEnabled}
                        onCheckedChange={(checked) => 
                          setFormData({ ...formData, stockControlEnabled: checked })
                        }
                      />
                    </div>

                    {formData.stockControlEnabled && (
                      <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                        <div className="space-y-2">
                          <Label htmlFor="stock">Stock Actual</Label>
                          <Input
                            id="stock"
                            type="number"
                            value={formData.stock}
                            onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                            placeholder="0"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="stockAlert">Stock Mínimo (Alerta)</Label>
                          <Input
                            id="stockAlert"
                            type="number"
                            value={formData.stockAlert}
                            onChange={(e) => setFormData({ ...formData, stockAlert: e.target.value })}
                            placeholder="10"
                          />
                          <p className="text-xs text-muted-foreground">
                            Recibirás una alerta cuando el stock esté por debajo de este valor
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Producto Destacado */}
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-0.5">
                      <Label htmlFor="featured" className="text-base font-semibold">
                        Producto Destacado
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Este producto aparecerá destacado en tu catálogo
                      </p>
                    </div>
                    <Switch
                      id="featured"
                      checked={formData.featured}
                      onCheckedChange={(checked) => 
                        setFormData({ ...formData, featured: checked })
                      }
                    />
                  </div>

                  {/* TODO: Sección de Variaciones */}
                  <div className="p-4 border-2 border-dashed rounded-lg bg-blue-50/50">
                    <div className="flex items-center gap-2 mb-2">
                      <Package className="h-5 w-5 text-blue-600" />
                      <h3 className="font-semibold text-blue-900">Producto con Variación</h3>
                      <span className="text-xs bg-blue-600 text-white px-2 py-1 rounded">PRÓXIMAMENTE</span>
                    </div>
                    <p className="text-sm text-blue-700">
                      Agrega variaciones como color, talla, voltaje o sabor a tus productos.
                      Esta funcionalidad estará disponible próximamente.
                    </p>
                  </div>
                </div>

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsDialogOpen(false);
                      resetForm();
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                    {(createMutation.isPending || updateMutation.isPending) ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Guardando...
                      </>
                    ) : (
                      "Guardar Producto"
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
          </div>
        </div>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Lista de Productos</CardTitle>
            <CardDescription>
              {products?.length || 0} productos registrados
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : products && products.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Imagen</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Precio</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((product: any) => (
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
                      <TableCell>{product.sku || "-"}</TableCell>
                      <TableCell>
                        {product.promotionalPrice ? (
                          <div>
                            <span className="line-through text-gray-400 text-sm">
                              ${parseFloat(product.price).toLocaleString()}
                            </span>
                            <br />
                            <span className="text-green-600 font-semibold">
                              ${parseFloat(product.promotionalPrice).toLocaleString()}
                            </span>
                          </div>
                        ) : (
                          `$${parseFloat(product.price).toLocaleString()}`
                        )}
                      </TableCell>
                      <TableCell>
                        {product.stockControlEnabled ? (
                          <span className={product.stock <= product.stockAlert ? "text-red-600 font-semibold" : ""}>
                            {product.stock} {product.stock <= product.stockAlert && "⚠️"}
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
