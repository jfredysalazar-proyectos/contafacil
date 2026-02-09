import { useState, useMemo, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, Search, ShoppingCart, X, Image as ImageIcon, Package } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, ChevronsUpDown, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";

export default function SalesPOS() {
  const { user, loading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  
  // Estados del carrito
  const [cartItems, setCartItems] = useState<any[]>([]);
  const [customerId, setCustomerId] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card" | "transfer" | "credit">("cash");
  const [creditDays, setCreditDays] = useState<string>("30");
  const [notes, setNotes] = useState<string>("");
  
  // Estados de búsqueda y filtros
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  
  // Estados para crear cliente rápido
  const [isAddCustomerDialogOpen, setIsAddCustomerDialogOpen] = useState(false);
  const [customerSearchTerm, setCustomerSearchTerm] = useState("");
  const [openCustomerPopover, setOpenCustomerPopover] = useState(false);
  const [newCustomerData, setNewCustomerData] = useState({
    name: "",
    email: "",
    phone: "",
    idNumber: "",
  });
  
  // Estados para crear producto rápido
  const [isAddProductDialogOpen, setIsAddProductDialogOpen] = useState(false);
  const [newProductData, setNewProductData] = useState({
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
  const [newProductImagePreview, setNewProductImagePreview] = useState<string | null>(null);
  const [isUploadingNewProductImage, setIsUploadingNewProductImage] = useState(false);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      setLocation("/login");
    }
  }, [loading, isAuthenticated, setLocation]);

  const utils = trpc.useUtils();
  const { data: products, isLoading: productsLoading } = trpc.products.list.useQuery();
  const { data: customers } = trpc.customers.list.useQuery();
  const { data: inventory } = trpc.inventory.list.useQuery();

  const createSaleMutation = trpc.sales.create.useMutation({
    onSuccess: () => {
      toast.success("Venta registrada exitosamente");
      utils.sales.list.invalidate();
      utils.inventory.list.invalidate();
      utils.inventory.lowStock.invalidate();
      resetCart();
    },
    onError: (error) => {
      toast.error(error.message || "Error al registrar venta");
    },
  });
  
  const createCustomerMutation = trpc.customers.create.useMutation({
    onSuccess: (data) => {
      toast.success("Cliente creado exitosamente");
      utils.customers.list.invalidate();
      // Validar que data tenga id antes de usarlo
      if (data && data.id) {
        setCustomerId(data.id.toString());
      }
      setIsAddCustomerDialogOpen(false);
      setNewCustomerData({ name: "", email: "", phone: "", idNumber: "" });
    },
    onError: (error) => {
      toast.error(error.message || "Error al crear cliente");
    },
  });
  
  const createProductMutation = trpc.products.create.useMutation({
    onSuccess: () => {
      toast.success("Producto creado exitosamente");
      utils.products.list.invalidate();
      utils.inventory.list.invalidate();
      setIsAddProductDialogOpen(false);
      setNewProductData({
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
      setNewProductImagePreview(null);
    },
    onError: (error) => {
      toast.error(error.message || "Error al crear producto");
    },
  });
  
  const uploadNewProductImageMutation = trpc.upload.uploadImage.useMutation({
    onSuccess: (data) => {
      setNewProductData({ ...newProductData, imageUrl: data.url });
      toast.success("Imagen subida exitosamente");
      setIsUploadingNewProductImage(false);
    },
    onError: (error) => {
      toast.error(error.message || "Error al subir la imagen");
      setIsUploadingNewProductImage(false);
    },
  });
  
  const handleNewProductImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
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

      setIsUploadingNewProductImage(true);
      toast.info("Subiendo imagen...");

      // Crear preview
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64Image = reader.result as string;
        setNewProductImagePreview(base64Image);
        
        // Subir a Cloudinary
        uploadNewProductImageMutation.mutate({
          image: base64Image,
          folder: "contafacil/products",
        });
      };
      reader.readAsDataURL(file);
    }
  };

  // Filtrar productos por búsqueda y categoría
  const filteredProducts = useMemo(() => {
    if (!products) return [];
    
    return products.filter(product => {
      const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (product.sku && product.sku.toLowerCase().includes(searchTerm.toLowerCase())) ||
                           (product.barcode && product.barcode.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesCategory = selectedCategory === "all" || product.categoryId?.toString() === selectedCategory;
      
      return matchesSearch && matchesCategory;
    });
  }, [products, searchTerm, selectedCategory]);

  // Calcular totales del carrito
  const getTaxRate = (taxType: string): number => {
    switch(taxType) {
      case 'excluded': return 0;
      case 'exempt': return 0;
      case 'iva_5': return 0.05;
      case 'iva_19': return 0.19;
      default: return 0.19;
    }
  };

  const cartTotals = useMemo(() => {
    let subtotal = 0;
    let tax = 0;
    let total = 0;
    
    cartItems.forEach(item => {
      // El precio del producto YA incluye IVA
      const priceWithTax = item.quantity * Number(item.unitPrice);
      total += priceWithTax;
      
      // Obtener el producto para ver su taxType
      const product = products?.find(p => p.id === item.productId);
      if (product) {
        const taxRate = getTaxRate((product as any).taxType || 'iva_19');
        
        // Discriminar el IVA del precio con IVA incluido
        // Fórmula: Precio sin IVA = Precio con IVA / (1 + tasa de IVA)
        // IVA = Precio con IVA - Precio sin IVA
        if (taxRate > 0) {
          const priceWithoutTax = priceWithTax / (1 + taxRate);
          const itemTax = priceWithTax - priceWithoutTax;
          subtotal += priceWithoutTax;
          tax += itemTax;
        } else {
          // Si no tiene IVA, el subtotal es igual al total
          subtotal += priceWithTax;
        }
      } else {
        // Si no se encuentra el producto, asumir que no tiene IVA
        subtotal += priceWithTax;
      }
    });
    
    return { subtotal, tax, total };
  }, [cartItems, products]);

  const addToCart = (product: any) => {
    // Verificar stock disponible
    const productInventory = inventory?.find((inv: any) => inv.id === product.id);
    const availableStock = productInventory?.stock || 0;
    
    // Verificar cantidad ya en el carrito
    const existingItem = cartItems.find(item => item.productId === product.id);
    const currentQuantity = existingItem ? existingItem.quantity : 0;
    
    if (currentQuantity >= availableStock) {
      toast.error(`Stock insuficiente para ${product.name}. Disponible: ${availableStock}`);
      return;
    }
    
    if (existingItem) {
      // Incrementar cantidad si ya existe
      setCartItems(cartItems.map(item =>
        item.productId === product.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      // Agregar nuevo item
      setCartItems([...cartItems, {
        productId: product.id,
        productName: product.name,
        quantity: 1,
        unitPrice: Number(product.price),
        subtotal: Number(product.price),
        hasSerial: false,
        serialNumbers: "",
        warrantyDays: 90, // Por defecto 3 meses
      }]);
    }
    
    toast.success(`${product.name} agregado al carrito`);
  };

  const updateQuantity = (productId: number, newQuantity: number) => {
    if (newQuantity < 1) {
      removeFromCart(productId);
      return;
    }
    
    // Verificar stock
    const productInventory = inventory?.find((inv: any) => inv.id === productId);
    const availableStock = productInventory?.stock || 0;
    
    if (newQuantity > availableStock) {
      toast.error(`Stock insuficiente. Disponible: ${availableStock}`);
      return;
    }
    
    setCartItems(cartItems.map(item =>
      item.productId === productId
        ? { ...item, quantity: newQuantity, subtotal: newQuantity * item.unitPrice }
        : item
    ));
  };

  const removeFromCart = (productId: number) => {
    setCartItems(cartItems.filter(item => item.productId !== productId));
  };

  const resetCart = () => {
    setCartItems([]);
    setCustomerId("");
    setPaymentMethod("cash");
    setCreditDays("30");
    setNotes("");
  };
  
  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newCustomerData.name.trim()) {
      toast.error("El nombre del cliente es requerido");
      return;
    }
    
    await createCustomerMutation.mutateAsync({
      name: newCustomerData.name,
      email: newCustomerData.email || undefined,
      phone: newCustomerData.phone || undefined,
      idNumber: newCustomerData.idNumber || undefined,
    });
  };
  
  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Construir payload solo con campos que tienen valores
    const payload: any = {
      name: newProductData.name,
      price: newProductData.price,
      stockAlert: parseInt(newProductData.stockAlert),
      stock: parseInt(newProductData.stock),
      sellBy: newProductData.sellBy,
      taxType: newProductData.taxType,
      stockControlEnabled: newProductData.stockControlEnabled || false,
      featured: newProductData.featured || false,
    };

    // Agregar campos opcionales solo si tienen valor
    if (newProductData.description) payload.description = newProductData.description;
    if (newProductData.sku) payload.sku = newProductData.sku;
    if (newProductData.cost) payload.cost = newProductData.cost;
    if (newProductData.imageUrl) payload.imageUrl = newProductData.imageUrl;
    if (newProductData.promotionalPrice) payload.promotionalPrice = newProductData.promotionalPrice;

    await createProductMutation.mutateAsync(payload);
  };
  
  // Filtrar clientes por búsqueda
  const filteredCustomers = useMemo(() => {
    if (!customers) return [];
    if (!customerSearchTerm.trim()) return customers;
    
    const searchLower = customerSearchTerm.toLowerCase();
    return customers.filter(customer => 
      customer.name.toLowerCase().includes(searchLower) ||
      customer.email?.toLowerCase().includes(searchLower) ||
      customer.phone?.includes(searchLower) ||
      customer.idNumber?.includes(searchLower)
    );
  }, [customers, customerSearchTerm]);

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (cartItems.length === 0) {
      toast.error("El carrito está vacío");
      return;
    }
    
    // Validar que se seleccione un cliente para ventas a crédito
    if (paymentMethod === "credit" && (!customerId || customerId === "none")) {
      toast.error("Debe seleccionar un cliente para ventas a crédito");
      return;
    }
    
    // Validar días de crédito
    if (paymentMethod === "credit" && (!creditDays || parseInt(creditDays) <= 0)) {
      toast.error("Ingresa los días de crédito");
      return;
    }
    
    try {
      await createSaleMutation.mutateAsync({
        customerId: customerId && customerId !== "none" ? parseInt(customerId) : undefined,
        saleNumber: `VTA-${Date.now()}`,
        saleDate: new Date(),
        paymentMethod,
        creditDays: paymentMethod === "credit" ? parseInt(creditDays) : undefined,
        notes: notes.trim() || undefined,
        items: cartItems.map(item => ({
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          unitPrice: item.unitPrice.toString(),
          subtotal: item.subtotal.toString(),
          hasSerial: item.hasSerial,
          serialNumbers: item.serialNumbers,
          warrantyDays: item.warrantyDays || 90, // Días de garantía
        })),
        subtotal: cartTotals.subtotal.toString(),
        tax: cartTotals.tax.toString(),
        total: cartTotals.total.toString(),
      });
    } catch (error) {
      console.error("Error al registrar venta:", error);
    }
  };

  if (loading || productsLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-3 flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Punto de Venta</h1>
          <p className="text-sm text-gray-500">Registra ventas de forma rápida y eficiente</p>
        </div>
        <Button
          variant="outline"
          onClick={() => setLocation("/sales-history")}
        >
          Ver Historial
        </Button>
      </div>

      {/* Main Content - 2 Columns */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Column - Product Catalog */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Search and Filters */}
          <div className="bg-white border-b px-6 py-4 space-y-3">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <Input
                  type="text"
                  placeholder="Buscar por nombre, SKU o código de barras..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-12 text-lg"
                />
              </div>
              <Button
                onClick={() => setIsAddProductDialogOpen(true)}
                size="lg"
                className="h-12 px-4"
              >
                <Plus className="h-5 w-5 mr-2" />
                Nuevo Producto
              </Button>
            </div>
            
            <div className="flex gap-2">
              <Button
                variant={selectedCategory === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory("all")}
              >
                Todos
              </Button>
              {/* Aquí se pueden agregar más categorías */}
            </div>
          </div>

          {/* Product Grid */}
          <div className="flex-1 overflow-y-auto p-6">
            {filteredProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400">
                <ShoppingCart className="h-16 w-16 mb-4" />
                <p className="text-lg">No se encontraron productos</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {filteredProducts.map((product) => {
                  const productInventory = inventory?.find((inv: any) => inv.id === product.id);
                  const stock = productInventory?.stock || 0;
                  const isOutOfStock = stock === 0;
                  
                  return (
                    <Card
                      key={product.id}
                      className={`cursor-pointer transition-all hover:shadow-lg hover:scale-105 ${
                        isOutOfStock ? 'opacity-50' : ''
                      }`}
                      onClick={() => !isOutOfStock && addToCart(product)}
                    >
                      <CardContent className="p-4 space-y-2">
                        {/* Product image or placeholder */}
                        <div className="aspect-square bg-gradient-to-br from-blue-100 to-blue-200 rounded-lg flex items-center justify-center mb-2 overflow-hidden">
                          {product.imageUrl ? (
                            <img 
                              src={product.imageUrl} 
                              alt={product.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-4xl font-bold text-blue-600">
                              {product.name.charAt(0).toUpperCase()}
                            </span>
                          )}
                        </div>
                        
                        <div>
                          <h3 className="font-semibold text-sm line-clamp-2 min-h-[2.5rem]">
                            {product.name}
                          </h3>
                          <p className="text-lg font-bold text-blue-600 mt-1">
                            ${Number(product.price).toLocaleString("es-CO")}
                          </p>
                          <div className="flex items-center justify-between mt-2">
                            <Badge variant={stock > 10 ? "default" : stock > 0 ? "secondary" : "destructive"}>
                              Stock: {stock}
                            </Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Cart */}
        <div className="w-96 bg-white border-l flex flex-col">
          {/* Cart Header */}
          <div className="border-b px-6 py-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Carrito</h2>
              {cartItems.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={resetCart}
                >
                  <X className="h-4 w-4 mr-1" />
                  Limpiar
                </Button>
              )}
            </div>
            
            {/* Customer Selection */}
            <div className="space-y-2">
              <Label>Cliente (opcional)</Label>
              <div className="flex gap-2">
                <Popover open={openCustomerPopover} onOpenChange={setOpenCustomerPopover}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={openCustomerPopover}
                      className="flex-1 justify-between"
                    >
                      {customerId && customerId !== "none"
                        ? customers?.find((c) => c.id.toString() === customerId)?.name
                        : "Seleccionar cliente"}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[300px] p-0">
                    <Command>
                      <CommandInput placeholder="Buscar cliente..." />
                      <CommandEmpty>No se encontró cliente.</CommandEmpty>
                      <CommandGroup className="max-h-64 overflow-auto">
                        <CommandItem
                          value="none"
                          onSelect={() => {
                            setCustomerId("none");
                            setOpenCustomerPopover(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              customerId === "none" ? "opacity-100" : "opacity-0"
                            )}
                          />
                          Sin cliente
                        </CommandItem>
                        {customers?.map((customer) => (
                          <CommandItem
                            key={customer.id}
                            value={customer.name}
                            onSelect={() => {
                              setCustomerId(customer.id.toString());
                              setOpenCustomerPopover(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                customerId === customer.id.toString()
                                  ? "opacity-100"
                                  : "opacity-0"
                              )}
                            />
                            <div className="flex flex-col">
                              <span>{customer.name}</span>
                              {customer.phone && (
                                <span className="text-xs text-gray-500">{customer.phone}</span>
                              )}
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </Command>
                  </PopoverContent>
                </Popover>
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  onClick={() => setIsAddCustomerDialogOpen(true)}
                  title="Agregar cliente nuevo"
                >
                  <UserPlus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Cart Items */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {cartItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400">
                <ShoppingCart className="h-16 w-16 mb-4" />
                <p className="text-center">
                  Tu carrito está vacío
                  <br />
                  <span className="text-sm">Haz clic en los productos para agregarlos</span>
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {cartItems.map((item) => (
                  <Card key={item.productId} className="p-3">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <h4 className="font-medium text-sm">{item.productName}</h4>
                        <p className="text-sm text-gray-500">
                          ${Number(item.unitPrice).toLocaleString("es-CO")} c/u
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFromCart(item.productId)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                        >
                          -
                        </Button>
                        <span className="w-12 text-center font-medium">{item.quantity}</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                        >
                          +
                        </Button>
                      </div>
                      <p className="font-bold">
                        ${(item.quantity * Number(item.unitPrice)).toLocaleString("es-CO")}
                      </p>
                    </div>
                    
                    {/* Campo de número de serie */}
                    <div className="mt-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <Label htmlFor={`serial-${item.productId}`} className="text-xs">Serial:</Label>
                        <Select
                          value={item.hasSerial ? "yes" : "no"}
                          onValueChange={(value) => {
                            setCartItems(cartItems.map(i =>
                              i.productId === item.productId
                                ? { ...i, hasSerial: value === "yes", serialNumbers: value === "no" ? "" : i.serialNumbers }
                                : i
                            ));
                          }}
                        >
                          <SelectTrigger className="h-8 w-20">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="no">No</SelectItem>
                            <SelectItem value="yes">Sí</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      {item.hasSerial && (
                        <div className="space-y-2">
                          <div>
                            <Input
                              id={`serial-${item.productId}`}
                              type="text"
                              placeholder={item.quantity > 1 ? `Ingrese ${item.quantity} seriales separados por coma` : "Ingrese el número de serie"}
                              value={item.serialNumbers}
                              onChange={(e) => {
                                setCartItems(cartItems.map(i =>
                                  i.productId === item.productId
                                    ? { ...i, serialNumbers: e.target.value }
                                    : i
                                ));
                              }}
                              className="text-xs"
                            />
                            {item.quantity > 1 && (
                              <p className="text-xs text-gray-500 mt-1">
                                {item.serialNumbers.split(',').filter(s => s.trim()).length} de {item.quantity} seriales ingresados
                              </p>
                            )}
                          </div>
                          
                          {/* Campo de Garantía */}
                          <div>
                            <Label htmlFor={`warranty-${item.productId}`} className="text-xs">Garantía:</Label>
                            <Select
                              value={item.warrantyDays?.toString() || "90"}
                              onValueChange={(value) => {
                                setCartItems(cartItems.map(i =>
                                  i.productId === item.productId
                                    ? { ...i, warrantyDays: parseInt(value) }
                                    : i
                                ));
                              }}
                            >
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="90">3 meses (90 días)</SelectItem>
                                <SelectItem value="180">6 meses (180 días)</SelectItem>
                                <SelectItem value="365">1 año (365 días)</SelectItem>
                                <SelectItem value="1095">3 años (1095 días)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Cart Footer - Totals and Checkout */}
          {cartItems.length > 0 && (
            <div className="border-t px-6 py-4 space-y-4">
              {/* Payment Method */}
              <div className="space-y-2">
                <Label>Método de pago</Label>
                <Select value={paymentMethod} onValueChange={(value: any) => setPaymentMethod(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Efectivo</SelectItem>
                    <SelectItem value="card">Tarjeta</SelectItem>
                    <SelectItem value="transfer">Transferencia</SelectItem>
                    <SelectItem value="credit">Crédito</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Credit Days - Only show when payment method is credit */}
              {paymentMethod === "credit" && (
                <div className="space-y-2">
                  <Label htmlFor="creditDays">Días de crédito *</Label>
                  <Input
                    id="creditDays"
                    type="number"
                    min="1"
                    value={creditDays}
                    onChange={(e) => setCreditDays(e.target.value)}
                    placeholder="Ej: 30, 60, 90"
                  />
                </div>
              )}

              {/* Notes */}
              <div className="space-y-2">
                <Label>Notas (opcional)</Label>
                <Input
                  placeholder="Agregar notas sobre la venta..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="h-9"
                />
              </div>

              {/* Totals */}
              <div className="space-y-2 pt-2 border-t">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal:</span>
                  <span className="font-medium">${cartTotals.subtotal.toLocaleString("es-CO")}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">IVA (19%):</span>
                  <span className="font-medium">${cartTotals.tax.toLocaleString("es-CO")}</span>
                </div>
                <div className="flex justify-between text-lg font-bold border-t pt-2">
                  <span>Total:</span>
                  <span className="text-blue-600">${cartTotals.total.toLocaleString("es-CO")}</span>
                </div>
              </div>

              {/* Checkout Button */}
              <Button
                className="w-full h-12 text-lg"
                onClick={handleCheckout}
                disabled={createSaleMutation.isPending}
              >
                {createSaleMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Procesando...
                  </>
                ) : (
                  <>
                    <ShoppingCart className="mr-2 h-5 w-5" />
                    Finalizar Venta
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </div>
      
      {/* Dialog para crear cliente rápido */}
      <Dialog open={isAddCustomerDialogOpen} onOpenChange={setIsAddCustomerDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Agregar Cliente Nuevo</DialogTitle>
            <DialogDescription>
              Crea un cliente rápidamente para agregarlo a la venta
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateCustomer}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="customer-name">Nombre *</Label>
                <Input
                  id="customer-name"
                  placeholder="Nombre del cliente"
                  value={newCustomerData.name}
                  onChange={(e) => setNewCustomerData({ ...newCustomerData, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customer-phone">Teléfono</Label>
                <Input
                  id="customer-phone"
                  placeholder="Teléfono"
                  value={newCustomerData.phone}
                  onChange={(e) => setNewCustomerData({ ...newCustomerData, phone: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customer-email">Email</Label>
                <Input
                  id="customer-email"
                  type="email"
                  placeholder="email@ejemplo.com"
                  value={newCustomerData.email}
                  onChange={(e) => setNewCustomerData({ ...newCustomerData, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customer-id">Cédula/NIT</Label>
                <Input
                  id="customer-id"
                  placeholder="Cédula o NIT"
                  value={newCustomerData.idNumber}
                  onChange={(e) => setNewCustomerData({ ...newCustomerData, idNumber: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsAddCustomerDialogOpen(false);
                  setNewCustomerData({ name: "", email: "", phone: "", idNumber: "" });
                }}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={createCustomerMutation.isPending}>
                {createCustomerMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creando...
                  </>
                ) : (
                  <>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Crear Cliente
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      
      {/* Diálogo para crear producto rápido */}
      <Dialog open={isAddProductDialogOpen} onOpenChange={setIsAddProductDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Crear Nuevo Producto</DialogTitle>
            <DialogDescription>
              Crea un producto rápido sin salir de la pantalla de ventas
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateProduct}>
            <div className="grid gap-6 py-4">
              {/* Imagen del Producto */}
              <div className="space-y-2">
                <Label>Imagen del Producto (Opcional)</Label>
                <div className="flex items-center gap-4">
                  <div className="w-32 h-32 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center overflow-hidden bg-gray-50">
                    {newProductImagePreview ? (
                      <img src={newProductImagePreview} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <ImageIcon className="h-12 w-12 text-gray-400" />
                    )}
                  </div>
                  <div className="flex-1">
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={handleNewProductImageChange}
                      className="cursor-pointer"
                      disabled={isUploadingNewProductImage}
                    />
                    {isUploadingNewProductImage ? (
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
                    value={newProductData.name}
                    onChange={(e) => setNewProductData({ ...newProductData, name: e.target.value })}
                    placeholder="Ej: Laptop HP 15"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sku">SKU / Código</Label>
                  <Input
                    id="sku"
                    value={newProductData.sku}
                    onChange={(e) => setNewProductData({ ...newProductData, sku: e.target.value })}
                    placeholder="Ej: LAP-HP-001"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descripción</Label>
                <Textarea
                  id="description"
                  value={newProductData.description}
                  onChange={(e) => setNewProductData({ ...newProductData, description: e.target.value })}
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
                    value={newProductData.price}
                    onChange={(e) => setNewProductData({ ...newProductData, price: e.target.value })}
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
                    value={newProductData.cost}
                    onChange={(e) => setNewProductData({ ...newProductData, cost: e.target.value })}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="promotionalPrice">Precio Promocional (COP)</Label>
                  <Input
                    id="promotionalPrice"
                    type="number"
                    step="0.01"
                    value={newProductData.promotionalPrice}
                    onChange={(e) => setNewProductData({ ...newProductData, promotionalPrice: e.target.value })}
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
                  value={newProductData.sellBy}
                  onValueChange={(value: "unit" | "fraction") => 
                    setNewProductData({ ...newProductData, sellBy: value })
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
                  {newProductData.sellBy === "unit" 
                    ? "Se venderá en cantidades enteras (1, 2, 3...)" 
                    : "Se puede vender en cantidades decimales (1.5 kg, 2.75 litros...)"}
                </p>
              </div>

              {/* Tipo de Impuesto */}
              <div className="space-y-2">
                <Label htmlFor="taxType">Tipo de Impuesto</Label>
                <Select
                  value={newProductData.taxType}
                  onValueChange={(value: "excluded" | "exempt" | "iva_5" | "iva_19") => 
                    setNewProductData({ ...newProductData, taxType: value })
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
                  {newProductData.taxType === "excluded" && "Producto excluido de IVA"}
                  {newProductData.taxType === "exempt" && "Producto exento de IVA (0%)"}
                  {newProductData.taxType === "iva_5" && "Se aplicará IVA del 5%"}
                  {newProductData.taxType === "iva_19" && "Se aplicará IVA del 19%"}
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
                    checked={newProductData.stockControlEnabled}
                    onCheckedChange={(checked) => 
                      setNewProductData({ ...newProductData, stockControlEnabled: checked })
                    }
                  />
                </div>

                {newProductData.stockControlEnabled && (
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                    <div className="space-y-2">
                      <Label htmlFor="stock">Stock Actual</Label>
                      <Input
                        id="stock"
                        type="number"
                        value={newProductData.stock}
                        onChange={(e) => setNewProductData({ ...newProductData, stock: e.target.value })}
                        placeholder="0"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="stockAlert">Stock Mínimo (Alerta)</Label>
                      <Input
                        id="stockAlert"
                        type="number"
                        value={newProductData.stockAlert}
                        onChange={(e) => setNewProductData({ ...newProductData, stockAlert: e.target.value })}
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
                  checked={newProductData.featured}
                  onCheckedChange={(checked) => 
                    setNewProductData({ ...newProductData, featured: checked })
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
                  setIsAddProductDialogOpen(false);
                  setNewProductData({
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
                  setNewProductImagePreview(null);
                }}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={createProductMutation.isPending}>
                {createProductMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creando...
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    Crear Producto
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
