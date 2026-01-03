import { useState, useMemo } from "react";
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
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Loader2, Plus, ShoppingCart, Trash2, FileText, Download, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { generateReceiptPDF } from "@/lib/pdfGenerator";

export default function Sales() {
  const { user, loading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [saleItems, setSaleItems] = useState<any[]>([]);
  const [selectedProduct, setSelectedProduct] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [customerId, setCustomerId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card" | "transfer" | "credit">("cash");

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      setLocation("/login");
    }
  }, [loading, isAuthenticated, setLocation]);

  const utils = trpc.useUtils();
  const { data: sales, isLoading } = trpc.sales.list.useQuery();
  const { data: products } = trpc.products.list.useQuery();
  const { data: customers } = trpc.customers.list.useQuery();

  const createMutation = trpc.sales.create.useMutation({
    onSuccess: () => {
      toast.success("Venta registrada exitosamente");
      utils.sales.list.invalidate();
      utils.inventory.list.invalidate();
      utils.inventory.lowStock.invalidate();
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error(error.message || "Error al registrar venta");
    },
  });

  const handleViewPDF = async (sale: any) => {
    if (!user) return;
    
    try {
      // Cargar items de la venta desde la base de datos
      const items = await utils.sales.getItems.fetch({ saleId: sale.id });
      
      const pdfDataUrl = generateReceiptPDF(
        {
          saleNumber: sale.saleNumber || "N/A",
          saleDate: new Date(sale.saleDate),
          customerName: sale.customerId ? customers?.find(c => c.id === sale.customerId)?.name : undefined,
          items: items.map((item: any) => ({
            productName: item.productName,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            subtotal: item.subtotal,
          })),
          subtotal: sale.subtotal,
          tax: sale.tax,
          total: sale.total,
        },
        {
          name: user.name || "Negocio",
          email: user.email || undefined,
          businessName: (user as any).businessName || user.name || "Mi Negocio",
          nit: (user as any).nit || undefined,
          address: (user as any).address || undefined,
          phone: user.phone || undefined,
          logoUrl: (user as any).logoUrl || undefined,
        }
      );
      
      // Crear elemento temporal para abrir el PDF
      const link = document.createElement('a');
      link.href = pdfDataUrl;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success('Comprobante PDF generado');
    } catch (error) {
      console.error("Error al generar PDF:", error);
      toast.error("Error al generar comprobante PDF");
    }
  };

  const handleDownloadPDF = async (sale: any) => {
    if (!user) return;
    
    try {
      // Cargar items de la venta desde la base de datos
      const items = await utils.sales.getItems.fetch({ saleId: sale.id });
      
      const pdfDataUrl = generateReceiptPDF(
        {
          saleNumber: sale.saleNumber || "N/A",
          saleDate: new Date(sale.saleDate),
          customerName: sale.customerId ? customers?.find(c => c.id === sale.customerId)?.name : undefined,
          items: items.map((item: any) => ({
            productName: item.productName,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            subtotal: item.subtotal,
          })),
          subtotal: sale.subtotal,
          tax: sale.tax,
          total: sale.total,
        },
        {
          name: user.name || "Negocio",
          email: user.email || undefined,
          businessName: (user as any).businessName || user.name || "Mi Negocio",
          nit: (user as any).nit || undefined,
          address: (user as any).address || undefined,
          phone: user.phone || undefined,
          logoUrl: (user as any).logoUrl || undefined,
        }
      );
      
      // Descargar PDF
      const link = document.createElement('a');
      link.href = pdfDataUrl;
      link.download = `Comprobante-${sale.saleNumber || 'venta'}.pdf`;
      link.click();
      
      toast.success("Comprobante descargado");
    } catch (error) {
      console.error("Error al generar PDF:", error);
      toast.error("Error al generar comprobante PDF");
    }
  };

  const resetForm = () => {
    setSaleItems([]);
    setSelectedProduct("");
    setQuantity("1");
    setCustomerId("");
    setPaymentMethod("cash");
  };

  const addItem = () => {
    if (!selectedProduct || !quantity) return;

    const product = products?.find(p => p.id.toString() === selectedProduct);
    if (!product) return;

    const qty = parseInt(quantity);
    const unitPrice = Number(product.price);
    const subtotal = qty * unitPrice;

    setSaleItems([
      ...saleItems,
      {
        productId: product.id,
        productName: product.name,
        quantity: qty,
        unitPrice: unitPrice.toString(),
        subtotal: subtotal.toString(),
      },
    ]);

    setSelectedProduct("");
    setQuantity("1");
  };

  const removeItem = (index: number) => {
    setSaleItems(saleItems.filter((_, i) => i !== index));
  };

  const totals = useMemo(() => {
    const subtotal = saleItems.reduce((sum, item) => sum + Number(item.subtotal), 0);
    const tax = subtotal * 0.19; // IVA 19%
    const total = subtotal + tax;
    return { subtotal, tax, total };
  }, [saleItems]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (saleItems.length === 0) {
      toast.error("Agrega al menos un producto a la venta");
      return;
    }

    const saleNumber = `V-${Date.now()}`;

    createMutation.mutate({
      customerId: customerId ? parseInt(customerId) : undefined,
      saleNumber,
      saleDate: new Date(),
      items: saleItems,
      subtotal: totals.subtotal.toString(),
      tax: totals.tax.toString(),
      discount: "0",
      total: totals.total.toString(),
      paymentMethod,
      status: "completed",
    });
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
            <h1 className="text-4xl font-bold text-foreground">Ventas</h1>
            <p className="text-muted-foreground mt-2">
              Registra y gestiona tus ventas
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Nueva Venta
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <form onSubmit={handleSubmit}>
                <DialogHeader>
                  <DialogTitle>Nueva Venta</DialogTitle>
                  <DialogDescription>
                    Registra una nueva venta
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="customer">Cliente (opcional)</Label>
                      <Select value={customerId} onValueChange={setCustomerId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona un cliente" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Sin cliente</SelectItem>
                          {customers?.map((customer) => (
                            <SelectItem key={customer.id} value={customer.id.toString()}>
                              {customer.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="paymentMethod">Método de pago *</Label>
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
                  </div>

                  <div className="border-t pt-4">
                    <h3 className="font-semibold mb-3">Agregar productos</h3>
                    <div className="grid grid-cols-12 gap-2">
                      <div className="col-span-7">
                        <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona un producto" />
                          </SelectTrigger>
                          <SelectContent>
                            {products?.map((product) => (
                              <SelectItem key={product.id} value={product.id.toString()}>
                                {product.name} - ${Number(product.price).toLocaleString("es-CO")}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="col-span-3">
                        <Input
                          type="number"
                          placeholder="Cantidad"
                          value={quantity}
                          onChange={(e) => setQuantity(e.target.value)}
                          min="1"
                        />
                      </div>
                      <div className="col-span-2">
                        <Button type="button" onClick={addItem} className="w-full">
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  {saleItems.length > 0 && (
                    <div className="border rounded-lg p-4 space-y-3">
                      <h3 className="font-semibold">Productos en la venta</h3>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Producto</TableHead>
                            <TableHead>Cantidad</TableHead>
                            <TableHead>Precio Unit.</TableHead>
                            <TableHead>Subtotal</TableHead>
                            <TableHead></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {saleItems.map((item, index) => (
                            <TableRow key={index}>
                              <TableCell>{item.productName}</TableCell>
                              <TableCell>{item.quantity}</TableCell>
                              <TableCell>${Number(item.unitPrice).toLocaleString("es-CO")}</TableCell>
                              <TableCell>${Number(item.subtotal).toLocaleString("es-CO")}</TableCell>
                              <TableCell>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeItem(index)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>

                      <div className="border-t pt-3 space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Subtotal:</span>
                          <span>${totals.subtotal.toLocaleString("es-CO")}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>IVA (19%):</span>
                          <span>${totals.tax.toLocaleString("es-CO")}</span>
                        </div>
                        <div className="flex justify-between text-lg font-bold">
                          <span>Total:</span>
                          <span>${totals.total.toLocaleString("es-CO")}</span>
                        </div>
                      </div>
                    </div>
                  )}
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
                  <Button type="submit" disabled={createMutation.isPending || saleItems.length === 0}>
                    {createMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Registrando...
                      </>
                    ) : (
                      "Registrar Venta"
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Historial de Ventas</CardTitle>
            <CardDescription>
              {sales?.length || 0} ventas registradas
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center items-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : sales && sales.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>N° Venta</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Método de Pago</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sales.map((sale) => (
                    <TableRow key={sale.id}>
                      <TableCell className="font-medium">{sale.saleNumber}</TableCell>
                      <TableCell>{new Date(sale.saleDate).toLocaleDateString("es-CO")}</TableCell>
                      <TableCell>${Number(sale.total).toLocaleString("es-CO")}</TableCell>
                      <TableCell className="capitalize">{sale.paymentMethod}</TableCell>
                      <TableCell>
                        <Badge variant={sale.status === "completed" ? "default" : "secondary"}>
                          {sale.status === "completed" ? "Completada" : sale.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleViewPDF(sale)}
                            title="Ver comprobante"
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Ver
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleDownloadPDF(sale)}
                            title="Descargar comprobante"
                          >
                            <Download className="h-4 w-4 mr-1" />
                            Descargar
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-12">
                <ShoppingCart className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No hay ventas registradas</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Registra tu primera venta para comenzar
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
