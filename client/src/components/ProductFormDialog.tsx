import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Loader2, Package, Image as ImageIcon, Camera, FolderOpen, X } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

export interface ProductFormData {
  name: string;
  description: string;
  categoryId: string | number;
  sku: string;
  price: string;
  cost: string;
  imageUrl: string;
  stockControlEnabled: boolean;
  stock: string;
  stockAlert: string;
  sellBy: "unit" | "fraction";
  taxType: "excluded" | "exempt" | "iva_5" | "iva_19";
  promotionalPrice: string;
  featured: boolean;
  isService: boolean;
}

const defaultFormData: ProductFormData = {
  name: "",
  description: "",
  categoryId: "",
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
  isService: false,
};

interface ProductFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Si se pasa, el formulario entra en modo edición */
  editingProduct?: any;
  /** Callback que se ejecuta tras crear o actualizar exitosamente */
  onSuccess?: () => void;
}

export function ProductFormDialog({
  open,
  onOpenChange,
  editingProduct,
  onSuccess,
}: ProductFormDialogProps) {
  const utils = trpc.useUtils();
  const isMobile = useIsMobile();
  const [formData, setFormData] = useState<ProductFormData>(defaultFormData);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [showNewCategory, setShowNewCategory] = useState(false);
  const galleryInputRef = React.useRef<HTMLInputElement>(null);
  const cameraInputRef = React.useRef<HTMLInputElement>(null);

  const { data: categories } = trpc.categories.products.list.useQuery();

  // Poblar formulario cuando se edita un producto existente
  useEffect(() => {
    if (editingProduct) {
      setFormData({
        name: editingProduct.name,
        description: editingProduct.description || "",
        categoryId: editingProduct.categoryId || "",
        isService: editingProduct.isService || false,
        sku: editingProduct.sku || "",
        price: editingProduct.price,
        cost: editingProduct.cost || "",
        imageUrl: editingProduct.imageUrl || "",
        stockControlEnabled: editingProduct.stockControlEnabled || false,
        stock: editingProduct.stock?.toString() || "0",
        stockAlert: editingProduct.stockAlert?.toString() || "10",
        sellBy: editingProduct.sellBy || "unit",
        taxType: editingProduct.taxType || "iva_19",
        promotionalPrice: editingProduct.promotionalPrice || "",
        featured: editingProduct.featured || false,
      });
      if (editingProduct.imageUrl) {
        setImagePreview(editingProduct.imageUrl);
      }
    } else {
      resetForm();
    }
  }, [editingProduct, open]);

  const resetForm = () => {
    setFormData(defaultFormData);
    setShowNewCategory(false);
    setNewCategoryName("");
    setImagePreview(null);
    setIsUploadingImage(false);
  };

  const createCategoryMutation = trpc.categories.products.create.useMutation({
    onSuccess: () => {
      utils.categories.products.list.invalidate();
      toast.success("Categoría creada");
      setNewCategoryName("");
      setShowNewCategory(false);
    },
  });

  const uploadImageMutation = trpc.upload.uploadImage.useMutation({
    onSuccess: (data) => {
      setFormData((prev) => ({ ...prev, imageUrl: data.url }));
      toast.success("Imagen subida exitosamente");
      setIsUploadingImage(false);
    },
    onError: (error) => {
      toast.error(error.message || "Error al subir la imagen");
      setIsUploadingImage(false);
    },
  });

  const createMutation = trpc.products.create.useMutation({
    onSuccess: () => {
      toast.success("Producto creado exitosamente");
      utils.products.list.invalidate();
      onOpenChange(false);
      resetForm();
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(error.message || "Error al crear producto");
    },
  });

  const updateMutation = trpc.products.update.useMutation({
    onSuccess: () => {
      toast.success("Producto actualizado exitosamente");
      utils.products.list.invalidate();
      onOpenChange(false);
      resetForm();
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(error.message || "Error al actualizar producto");
    },
  });

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("La imagen no debe superar los 5MB");
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast.error("Solo se permiten archivos de imagen");
      return;
    }

    setIsUploadingImage(true);
    toast.info("Subiendo imagen...");

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64Image = reader.result as string;
      setImagePreview(base64Image);
      uploadImageMutation.mutate({
        image: base64Image,
        folder: "contafacil/products",
      });
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const payload: any = {
      name: formData.name,
      price: formData.price,
      stockAlert: parseInt(formData.stockAlert),
      stock: parseInt(formData.stock),
      sellBy: formData.sellBy,
      taxType: formData.taxType,
      hasVariations: false,
      stockControlEnabled: formData.stockControlEnabled || false,
      featured: formData.featured || false,
      isService: formData.isService || false,
    };

    if (formData.description) payload.description = formData.description;
    if (formData.sku) payload.sku = formData.sku;
    if (formData.cost) payload.cost = formData.cost;
    if (formData.imageUrl) payload.imageUrl = formData.imageUrl;
    if (formData.promotionalPrice) payload.promotionalPrice = formData.promotionalPrice;
    if (formData.categoryId) payload.categoryId = Number(formData.categoryId);

    if (editingProduct) {
      updateMutation.mutate({ id: editingProduct.id, ...payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) resetForm();
      }}
    >
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
              <div className="flex items-start gap-4">
                {/* Vista previa */}
                <div className="relative w-32 h-32 flex-shrink-0 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center overflow-hidden bg-gray-50">
                  {imagePreview ? (
                    <>
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                      {/* Botón quitar imagen */}
                      <button
                        type="button"
                        onClick={() => {
                          setImagePreview(null);
                          setFormData((prev) => ({ ...prev, imageUrl: "" }));
                        }}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600"
                        title="Quitar imagen"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </>
                  ) : (
                    <ImageIcon className="h-12 w-12 text-gray-400" />
                  )}
                </div>

                <div className="flex-1 space-y-2">
                  {isMobile ? (
                    /* ── Móvil: dos botones separados para Galería y Cámara ── */
                    <div className="flex flex-col gap-2">
                      {/* Botón Galería */}
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full justify-start gap-2"
                        disabled={isUploadingImage}
                        onClick={() => galleryInputRef.current?.click()}
                      >
                        <FolderOpen className="h-4 w-4" />
                        Elegir de Galería
                      </Button>
                      <input
                        ref={galleryInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleImageChange}
                      />

                      {/* Botón Cámara */}
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full justify-start gap-2"
                        disabled={isUploadingImage}
                        onClick={() => cameraInputRef.current?.click()}
                      >
                        <Camera className="h-4 w-4" />
                        Tomar Foto con Cámara
                      </Button>
                      <input
                        ref={cameraInputRef}
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className="hidden"
                        onChange={handleImageChange}
                      />
                    </div>
                  ) : (
                    /* ── Desktop: input de archivo estándar ── */
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="cursor-pointer"
                      disabled={isUploadingImage}
                    />
                  )}

                  {isUploadingImage ? (
                    <p className="text-sm text-blue-600 flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Subiendo imagen...
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      JPG, PNG, máx 5MB
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Categoría */}
            <div className="space-y-2">
              <Label htmlFor="categoryId">Categoría</Label>
              <div className="flex gap-2">
                <Select
                  value={
                    formData.categoryId ? String(formData.categoryId) : "none"
                  }
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      categoryId: value === "none" ? "" : value,
                    })
                  }
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Sin categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin categoría</SelectItem>
                    {categories?.map((cat: any) => (
                      <SelectItem key={cat.id} value={String(cat.id)}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowNewCategory(!showNewCategory)}
                >
                  + Nueva
                </Button>
              </div>
              {showNewCategory && (
                <div className="flex gap-2 mt-2">
                  <Input
                    placeholder="Nombre de la categoría"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                  />
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                      if (newCategoryName.trim()) {
                        createCategoryMutation.mutate({
                          name: newCategoryName.trim(),
                        });
                      }
                    }}
                  >
                    Crear
                  </Button>
                </div>
              )}
            </div>

            {/* Información Básica */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre del Producto *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="Ej: Laptop HP 15"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sku">SKU / Código</Label>
                <Input
                  id="sku"
                  value={formData.sku}
                  onChange={(e) =>
                    setFormData({ ...formData, sku: e.target.value })
                  }
                  placeholder="Ej: LAP-HP-001"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descripción</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
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
                  onChange={(e) =>
                    setFormData({ ...formData, price: e.target.value })
                  }
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
                  onChange={(e) =>
                    setFormData({ ...formData, cost: e.target.value })
                  }
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
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      promotionalPrice: e.target.value,
                    })
                  }
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
                  <SelectItem value="fraction">
                    Fracción (kg, litros, metros, etc.)
                  </SelectItem>
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
                onValueChange={(
                  value: "excluded" | "exempt" | "iva_5" | "iva_19"
                ) => setFormData({ ...formData, taxType: value })}
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
                {formData.taxType === "exempt" &&
                  "Producto exento de IVA (0%)"}
                {formData.taxType === "iva_5" && "Se aplicará IVA del 5%"}
                {formData.taxType === "iva_19" && "Se aplicará IVA del 19%"}
              </p>
            </div>

            {/* Control de Stock */}
            <div className="space-y-4 p-4 border rounded-lg bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label
                    htmlFor="stockControl"
                    className="text-base font-semibold"
                  >
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
                      onChange={(e) =>
                        setFormData({ ...formData, stock: e.target.value })
                      }
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="stockAlert">Stock Mínimo (Alerta)</Label>
                    <Input
                      id="stockAlert"
                      type="number"
                      value={formData.stockAlert}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          stockAlert: e.target.value,
                        })
                      }
                      placeholder="10"
                    />
                    <p className="text-xs text-muted-foreground">
                      Recibirás una alerta cuando el stock baje de este número
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Es Servicio */}
            <div className="flex items-center justify-between p-4 border rounded-lg bg-purple-50/50">
              <div className="space-y-0.5">
                <Label
                  htmlFor="isService"
                  className="text-base font-semibold text-purple-900"
                >
                  Es un Servicio
                </Label>
                <p className="text-sm text-muted-foreground">
                  Activa si es un servicio (fotocopia, impresión, etc.). No
                  descuenta inventario.
                </p>
              </div>
              <Switch
                id="isService"
                checked={formData.isService}
                onCheckedChange={(checked) =>
                  setFormData({
                    ...formData,
                    isService: checked,
                    stockControlEnabled: checked
                      ? false
                      : formData.stockControlEnabled,
                  })
                }
              />
            </div>

            {/* Producto Destacado */}
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="space-y-0.5">
                <Label
                  htmlFor="featured"
                  className="text-base font-semibold"
                >
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

            {/* Variaciones — Próximamente */}
            <div className="p-4 border-2 border-dashed rounded-lg bg-blue-50/50">
              <div className="flex items-center gap-2 mb-2">
                <Package className="h-5 w-5 text-blue-600" />
                <h3 className="font-semibold text-blue-900">
                  Producto con Variación
                </h3>
                <span className="text-xs bg-blue-600 text-white px-2 py-1 rounded">
                  PRÓXIMAMENTE
                </span>
              </div>
              <p className="text-sm text-blue-700">
                Agrega variaciones como color, talla, voltaje o sabor a tus
                productos. Esta funcionalidad estará disponible próximamente.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                onOpenChange(false);
                resetForm();
              }}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? (
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
  );
}
