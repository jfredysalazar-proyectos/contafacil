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
import { ResponsiveTable } from "@/components/ResponsiveTable";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Loader2, Plus, FileText, Trash2, Eye, CheckCircle, XCircle, ArrowRight, Calendar, Download, Edit } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import jsPDF from "jspdf";
import { imageUrlToBase64 } from "@/lib/imageUtils";

export default function Quotations() {
  const { user, loading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isConvertDialogOpen, setIsConvertDialogOpen] = useState(false);
  const [viewingQuotation, setViewingQuotation] = useState<any>(null);
  const [convertingQuotation, setConvertingQuotation] = useState<any>(null);
  const [editingQuotation, setEditingQuotation] = useState<any>(null);
  const [quotationItems, setQuotationItems] = useState<any[]>([]);
  const [selectedProduct, setSelectedProduct] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [discount, setDiscount] = useState("0");
  const [customerId, setCustomerId] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("");
  const [deliveryTerms, setDeliveryTerms] = useState("");
  const [notes, setNotes] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  
  // Estados para convertir a venta
  const [saleNumber, setSaleNumber] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card" | "transfer" | "credit">("cash");

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      setLocation("/login");
    }
  }, [loading, isAuthenticated, setLocation]);

  const utils = trpc.useUtils();
  const { data: quotations, isLoading } = trpc.quotations.list.useQuery(
    filterStatus !== "all" ? { status: filterStatus as any } : undefined
  );
  const { data: products } = trpc.products.list.useQuery();
  const { data: customers } = trpc.customers.list.useQuery();

  const createMutation = trpc.quotations.create.useMutation({
    onSuccess: () => {
      toast.success("Cotización creada exitosamente");
      utils.quotations.list.invalidate();
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error(error.message || "Error al crear cotización");
    },
  });

  const deleteMutation = trpc.quotations.delete.useMutation({
    onSuccess: () => {
      toast.success("Cotización eliminada exitosamente");
      utils.quotations.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Error al eliminar cotización");
    },
  });

  const updateMutation = trpc.quotations.update.useMutation({
    onSuccess: () => {
      toast.success("Cotización actualizada exitosamente");
      utils.quotations.list.invalidate();
      setIsDialogOpen(false);
      setEditingQuotation(null);
      resetForm();
    },
    onError: (error) => {
      toast.error(error.message || "Error al actualizar cotización");
    },
  });

  const updateStatusMutation = trpc.quotations.update.useMutation({
    onSuccess: () => {
      toast.success("Estado actualizado exitosamente");
      utils.quotations.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Error al actualizar estado");
    },
  });

  const convertToSaleMutation = trpc.quotations.convertToSale.useMutation({
    onSuccess: () => {
      toast.success("Cotización convertida a venta exitosamente");
      utils.quotations.list.invalidate();
      utils.sales.list.invalidate();
      setIsConvertDialogOpen(false);
      setConvertingQuotation(null);
      setSaleNumber("");
    },
    onError: (error) => {
      toast.error(error.message || "Error al convertir cotización");
    },
  });

  const resetForm = () => {
    setQuotationItems([]);
    setSelectedProduct("");
    setQuantity("1");
    setDiscount("0");
    setCustomerId("");
    setValidUntil("");
    setPaymentTerms("");
    setDeliveryTerms("");
    setNotes("");
    setEditingQuotation(null);
  };

  const addItem = () => {
    if (!selectedProduct) {
      toast.error("Selecciona un producto");
      return;
    }

    const product = products?.find((p: any) => p.id === parseInt(selectedProduct));
    if (!product) return;

    const qty = parseInt(quantity);
    const unitPrice = parseFloat(product.price);
    const discountAmount = parseFloat(discount);
    const subtotal = (qty * unitPrice) - discountAmount;

    setQuotationItems([
      ...quotationItems,
      {
        productId: product.id,
        productName: product.name,
        description: product.description || "",
        quantity: qty,
        unitPrice: product.price,
        discount: discount,
        subtotal: subtotal.toFixed(2),
      },
    ]);

    setSelectedProduct("");
    setQuantity("1");
    setDiscount("0");
  };

  const removeItem = (index: number) => {
    setQuotationItems(quotationItems.filter((_, i) => i !== index));
  };

  const calculateTotals = () => {
    const subtotal = quotationItems.reduce((sum, item) => sum + parseFloat(item.subtotal), 0);
    const tax = subtotal * 0.19; // IVA 19%
    const total = subtotal + tax;
    return { subtotal, tax, total };
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (quotationItems.length === 0) {
      toast.error("Agrega al menos un producto");
      return;
    }

    if (!validUntil) {
      toast.error("Especifica la fecha de validez");
      return;
    }

    const { subtotal, tax, total } = calculateTotals();

    if (editingQuotation) {
      // Actualizar cotización existente
      updateMutation.mutate({
        id: editingQuotation.id,
        customerId: customerId && customerId !== "0" ? parseInt(customerId) : undefined,
        validUntil: new Date(validUntil),
        items: quotationItems,
        subtotal: subtotal.toFixed(2),
        tax: tax.toFixed(2),
        discount: "0",
        total: total.toFixed(2),
        paymentTerms,
        deliveryTerms,
        notes,
      });
    } else {
      // Crear nueva cotización
      const quotationNumber = `COT-${Date.now()}`;
      createMutation.mutate({
        customerId: customerId && customerId !== "0" ? parseInt(customerId) : undefined,
        quotationNumber,
        quotationDate: new Date(),
        validUntil: new Date(validUntil),
        items: quotationItems,
        subtotal: subtotal.toFixed(2),
        tax: tax.toFixed(2),
        discount: "0",
        total: total.toFixed(2),
        status: "draft",
        paymentTerms,
        deliveryTerms,
        notes,
      });
    }
  };

  const handleViewQuotation = async (quotationId: number) => {
    const quotation = quotations?.find((q: any) => q.id === quotationId);
    if (quotation) {
      setViewingQuotation(quotation);
      setIsViewDialogOpen(true);
    }
  };

  const handleEditQuotation = async (quotationId: number) => {
    const quotation = quotations?.find((q: any) => q.id === quotationId);
    if (!quotation) return;

    // Obtener los items de la cotización
    const items = await utils.quotations.getItems.fetch({ quotationId });
    
    // Cargar datos en el formulario
    setEditingQuotation(quotation);
    setCustomerId(quotation.customerId?.toString() || "");
    setValidUntil(new Date(quotation.validUntil).toISOString().split('T')[0]);
    setPaymentTerms(quotation.paymentTerms || "");
    setDeliveryTerms(quotation.deliveryTerms || "");
    setNotes(quotation.notes || "");
    setQuotationItems(items || []);
    
    // Abrir el diálogo
    setIsDialogOpen(true);
  };

  const handleConvertToSale = (quotation: any) => {
    setConvertingQuotation(quotation);
    setSaleNumber(`VTA-${Date.now()}`);
    setIsConvertDialogOpen(true);
  };

  const confirmConvertToSale = () => {
    if (!saleNumber) {
      toast.error("Ingresa el número de venta");
      return;
    }

    convertToSaleMutation.mutate({
      quotationId: convertingQuotation.id,
      saleNumber,
      saleDate: new Date(),
      paymentMethod,
      status: "completed",
    });
  };

  const handleDownloadPDF = async (quotation: any) => {
    try {
      console.log("Iniciando generación de PDF para cotización:", quotation);
      
      // Obtener el cliente si existe
      const customer = quotation.customerId
        ? customers?.find((c: any) => c.id === quotation.customerId)
        : null;
      
      console.log("Cliente encontrado:", customer);

      // Obtener los items de la cotización
      console.log("Obteniendo items de cotización...");
      const quotationItems = await utils.quotations.getItems.fetch({ quotationId: quotation.id });
      console.log("Items obtenidos:", quotationItems);

      // Preparar datos para el PDF
      const quotationData = {
        quotationNumber: quotation.quotationNumber,
        quotationDate: quotation.quotationDate,
        validUntil: quotation.validUntil,
        customerName: customer?.name,
        customerIdNumber: customer?.idNumber || undefined,
        customerAddress: customer?.address || undefined,
        customerPhone: customer?.phone || undefined,
        customerEmail: customer?.email || undefined,
        items: quotationItems.map((item: any) => ({
          productName: item.productName,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discount: item.discount || "0",
          subtotal: item.subtotal,
        })),
        subtotal: quotation.subtotal,
        tax: quotation.tax,
        discount: quotation.discount,
        total: quotation.total,
        paymentTerms: quotation.paymentTerms,
        deliveryTerms: quotation.deliveryTerms,
        notes: quotation.notes,
        status: quotation.status,
      };

      const userData = {
        name: user?.name || "Usuario",
        email: user?.email,
        businessName: user?.businessName,
        nit: user?.nit,
        address: user?.address,
        phone: user?.phone,
        logoUrl: user?.logoUrl,
      };

      // Generar PDF inline
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const leftColX = 20;
      const rightColX = pageWidth / 2 + 5;
      let yPos = 20;

      // Título (centrado, arriba)
      doc.setFontSize(20);
      doc.setFont("helvetica", "bold");
      doc.text("COTIZACIÓN", pageWidth / 2, yPos, { align: "center" });
      yPos += 15;

      // === COLUMNA IZQUIERDA ===
      let leftY = yPos;

      // Logo (si existe)
      if (userData.logoUrl) {
        try {
          const logoBase64 = await imageUrlToBase64(userData.logoUrl);
          doc.addImage(logoBase64, "PNG", leftColX, leftY, 30, 30);
          leftY += 35;
        } catch (error) {
          console.error("Error al agregar logo al PDF:", error);
        }
      }

      // Información del negocio
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text(String(userData.businessName || userData.name || "Negocio"), leftColX, leftY);
      leftY += 7;

      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      if (userData.nit) {
        doc.text(`NIT: ${userData.nit}`, leftColX, leftY);
        leftY += 5;
      }
      if (userData.address) {
        const addressLines = doc.splitTextToSize(userData.address, 80);
        doc.text(addressLines, leftColX, leftY);
        leftY += 5 * addressLines.length;
      }
      if (userData.phone) {
        doc.text(`Tel: ${userData.phone}`, leftColX, leftY);
        leftY += 5;
      }
      if (userData.email) {
        doc.text(userData.email, leftColX, leftY);
        leftY += 5;
      }

      // === COLUMNA DERECHA ===
      let rightY = yPos;

      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text(`N° ${String(quotationData.quotationNumber || "N/A")}`, rightColX, rightY);
      rightY += 7;

      doc.setFont("helvetica", "normal");
      doc.text(`Fecha: ${new Date(quotationData.quotationDate).toLocaleDateString("es-CO")}`, rightColX, rightY);
      rightY += 7;

      doc.text(`Válida hasta: ${new Date(quotationData.validUntil).toLocaleDateString("es-CO")}`, rightColX, rightY);
      rightY += 10;

      // Información del cliente
      if (quotationData.customerName) {
        doc.setFont("helvetica", "bold");
        doc.text("CLIENTE", rightColX, rightY);
        rightY += 6;

        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.text(quotationData.customerName, rightColX, rightY);
        rightY += 5;

        if (quotationData.customerIdNumber) {
          doc.text(`CC/NIT: ${quotationData.customerIdNumber}`, rightColX, rightY);
          rightY += 5;
        }
        if (quotationData.customerAddress) {
          const addressLines = doc.splitTextToSize(quotationData.customerAddress, 80);
          doc.text(addressLines, rightColX, rightY);
          rightY += 5 * addressLines.length;
        }
        if (quotationData.customerPhone) {
          doc.text(`Tel: ${quotationData.customerPhone}`, rightColX, rightY);
          rightY += 5;
        }
        if (quotationData.customerEmail) {
          doc.text(quotationData.customerEmail, rightColX, rightY);
          rightY += 5;
        }
      }

      // Ajustar yPos al máximo de ambas columnas
      yPos = Math.max(leftY, rightY) + 10;

      // Línea separadora
      doc.setLineWidth(0.5);
      doc.line(20, yPos, pageWidth - 20, yPos);
      yPos += 10;

      // Tabla de productos
      doc.setFont("helvetica", "bold");
      doc.text("Producto", 20, yPos);
      doc.text("Cant.", 95, yPos);
      doc.text("Precio", 115, yPos);
      doc.text("Desc.", 150, yPos);
      doc.text("Subtotal", 170, yPos);
      yPos += 7;

      // Línea separadora
      doc.line(20, yPos, 190, yPos);
      yPos += 7;

      // Items
      doc.setFont("helvetica", "normal");
      quotationData.items.forEach((item: any) => {
        if (yPos > 250) {
          doc.addPage();
          yPos = 20;
        }

        doc.text(String(item.productName || "Sin nombre"), 20, yPos);
        doc.text(String(item.quantity || 0), 95, yPos);
        doc.text(`$${Number(item.unitPrice || 0).toLocaleString("es-CO")}`, 115, yPos);
        doc.text(`$${Number(item.discount || 0).toLocaleString("es-CO")}`, 150, yPos);
        doc.text(`$${Number(item.subtotal || 0).toLocaleString("es-CO")}`, 170, yPos);
        yPos += 7;

        // Descripción del producto (si existe)
        if (item.description) {
          doc.setFontSize(8);
          doc.setFont("helvetica", "italic");
          doc.text(item.description.substring(0, 80), 20, yPos);
          yPos += 5;
          doc.setFontSize(10);
          doc.setFont("helvetica", "normal");
        }
      });

      yPos += 5;
      doc.line(20, yPos, 190, yPos);
      yPos += 10;

      // Totales
      doc.setFont("helvetica", "normal");
      doc.text("Subtotal:", 135, yPos);
      doc.text(`$${Number(quotationData.subtotal).toLocaleString("es-CO")}`, 170, yPos);
      yPos += 7;

      if (quotationData.discount && Number(quotationData.discount) > 0) {
        doc.text("Descuento:", 135, yPos);
        doc.text(`-$${Number(quotationData.discount).toLocaleString("es-CO")}`, 170, yPos);
        yPos += 7;
      }

      doc.text("IVA (19%):", 135, yPos);
      doc.text(`$${Number(quotationData.tax || 0).toLocaleString("es-CO")}`, 170, yPos);
      yPos += 7;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text("TOTAL:", 135, yPos);
      doc.text(`$${Number(quotationData.total).toLocaleString("es-CO")}`, 170, yPos);
      yPos += 15;

      // Términos y condiciones
      if (quotationData.paymentTerms || quotationData.deliveryTerms || quotationData.notes) {
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text("TÉRMINOS Y CONDICIONES", 20, yPos);
        yPos += 7;

        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);

        if (quotationData.paymentTerms) {
          doc.text("Términos de Pago:", 20, yPos);
          yPos += 5;
          doc.text(quotationData.paymentTerms.substring(0, 150), 20, yPos);
          yPos += 5;
        }

        if (quotationData.deliveryTerms) {
          if (yPos > 250) {
            doc.addPage();
            yPos = 20;
          }
          doc.text("Términos de Entrega:", 20, yPos);
          yPos += 5;
          doc.text(quotationData.deliveryTerms.substring(0, 150), 20, yPos);
          yPos += 5;
        }

        if (quotationData.notes) {
          if (yPos > 250) {
            doc.addPage();
            yPos = 20;
          }
          doc.text("Notas:", 20, yPos);
          yPos += 5;
          doc.text(quotationData.notes.substring(0, 150), 20, yPos);
          yPos += 5;
        }
      }

      // Pie de página
      yPos = doc.internal.pageSize.getHeight() - 20;
      doc.setFontSize(8);
      doc.setFont("helvetica", "italic");
      doc.text("Esta cotización es válida hasta la fecha indicada", pageWidth / 2, yPos, { align: "center" });
      yPos += 5;
      doc.text("Documento generado por ContaFácil", pageWidth / 2, yPos, { align: "center" });

      // Descargar PDF
      const pdfDataUrl = doc.output("datauristring");
      const link = document.createElement("a");
      link.href = pdfDataUrl;
      link.download = `Cotizacion-${quotation.quotationNumber}.pdf`;
      link.click();

      toast.success("PDF descargado exitosamente");
    } catch (error) {
      console.error("Error al generar PDF:", error);
      const errorMessage = error instanceof Error ? error.message : "Error desconocido";
      toast.error(`Error al generar el PDF: ${errorMessage}`);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; variant: any }> = {
      draft: { label: "Borrador", variant: "secondary" },
      sent: { label: "Enviada", variant: "default" },
      accepted: { label: "Aceptada", variant: "default" },
      rejected: { label: "Rechazada", variant: "destructive" },
      expired: { label: "Expirada", variant: "secondary" },
      converted: { label: "Convertida", variant: "default" },
    };

    const config = statusConfig[status] || { label: status, variant: "default" };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const { subtotal, tax, total } = calculateTotals();

  if (loading || !isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Cotizaciones</h1>
          <p className="text-muted-foreground">Gestiona las cotizaciones de tu negocio</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nueva Cotización
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingQuotation ? "Editar Cotización" : "Nueva Cotización"}</DialogTitle>
              <DialogDescription>
                {editingQuotation ? "Modifica los datos de la cotización" : "Crea una nueva cotización para tus clientes"}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="customer">Cliente (Opcional)</Label>
                    <Select value={customerId} onValueChange={setCustomerId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona un cliente" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">Sin cliente</SelectItem>
                        {customers?.map((customer: any) => (
                          <SelectItem key={customer.id} value={customer.id.toString()}>
                            {customer.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="validUntil">Válida hasta *</Label>
                    <Input
                      id="validUntil"
                      type="date"
                      value={validUntil}
                      onChange={(e) => setValidUntil(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="border rounded-lg p-4 space-y-4">
                  <h3 className="font-semibold">Agregar Productos</h3>
                  <div className="grid grid-cols-4 gap-4">
                    <div className="col-span-2 space-y-2">
                      <Label>Producto</Label>
                      <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona un producto" />
                        </SelectTrigger>
                        <SelectContent>
                          {products?.map((product: any) => (
                            <SelectItem key={product.id} value={product.id.toString()}>
                              {product.name} - ${parseFloat(product.price).toLocaleString()}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Cantidad</Label>
                      <Input
                        type="number"
                        min="1"
                        value={quantity}
                        onChange={(e) => setQuantity(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Descuento</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={discount}
                        onChange={(e) => setDiscount(e.target.value)}
                      />
                    </div>
                  </div>
                  <Button type="button" onClick={addItem} variant="outline" className="w-full">
                    <Plus className="mr-2 h-4 w-4" />
                    Agregar Producto
                  </Button>
                </div>

                {quotationItems.length > 0 && (
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Producto</TableHead>
                          <TableHead>Cantidad</TableHead>
                          <TableHead>Precio Unit.</TableHead>
                          <TableHead>Descuento</TableHead>
                          <TableHead>Subtotal</TableHead>
                          <TableHead></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {quotationItems.map((item, index) => (
                          <TableRow key={index}>
                            <TableCell>{item.productName}</TableCell>
                            <TableCell>{item.quantity}</TableCell>
                            <TableCell>${parseFloat(item.unitPrice).toLocaleString()}</TableCell>
                            <TableCell>${parseFloat(item.discount).toLocaleString()}</TableCell>
                            <TableCell>${parseFloat(item.subtotal).toLocaleString()}</TableCell>
                            <TableCell>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeItem(index)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    <div className="p-4 bg-muted space-y-2">
                      <div className="flex justify-between">
                        <span>Subtotal:</span>
                        <span className="font-semibold">${subtotal.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>IVA (19%):</span>
                        <span className="font-semibold">${tax.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-lg font-bold">
                        <span>Total:</span>
                        <span>${total.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="paymentTerms">Términos de Pago</Label>
                    <Textarea
                      id="paymentTerms"
                      value={paymentTerms}
                      onChange={(e) => setPaymentTerms(e.target.value)}
                      placeholder="Ej: 50% anticipo, 50% contra entrega"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="deliveryTerms">Términos de Entrega</Label>
                    <Textarea
                      id="deliveryTerms"
                      value={deliveryTerms}
                      onChange={(e) => setDeliveryTerms(e.target.value)}
                      placeholder="Ej: Entrega en 15 días hábiles"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notas</Label>
                  <Textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Notas adicionales"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editingQuotation ? "Actualizar Cotización" : "Crear Cotización"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="mb-4">
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filtrar por estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="draft">Borradores</SelectItem>
            <SelectItem value="sent">Enviadas</SelectItem>
            <SelectItem value="accepted">Aceptadas</SelectItem>
            <SelectItem value="rejected">Rechazadas</SelectItem>
            <SelectItem value="expired">Expiradas</SelectItem>
            <SelectItem value="converted">Convertidas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Cotizaciones</CardTitle>
          <CardDescription>
            Todas tus cotizaciones registradas
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : quotations && quotations.length > 0 ? (
            <ResponsiveTable>
                <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Número</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Válida hasta</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {quotations.map((quotation: any) => (
                  <TableRow key={quotation.id}>
                    <TableCell className="font-medium">{quotation.quotationNumber}</TableCell>
                    <TableCell>
                      {quotation.customerId
                        ? customers?.find((c: any) => c.id === quotation.customerId)?.name || "N/A"
                        : "Sin cliente"}
                    </TableCell>
                    <TableCell>
                      {new Date(quotation.quotationDate).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {new Date(quotation.validUntil).toLocaleDateString()}
                    </TableCell>
                    <TableCell>${parseFloat(quotation.total).toLocaleString()}</TableCell>
                    <TableCell>{getStatusBadge(quotation.status)}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewQuotation(quotation.id)}
                          title="Ver cotización"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDownloadPDF(quotation)}
                          title="Descargar PDF"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        {(quotation.status === "draft" || quotation.status === "sent") && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditQuotation(quotation.id)}
                            title="Editar cotización"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        )}
                        {quotation.status === "accepted" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleConvertToSale(quotation)}
                            title="Convertir a venta"
                          >
                            <ArrowRight className="h-4 w-4" />
                          </Button>
                        )}
                        {quotation.status === "draft" && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                updateStatusMutation.mutate({
                                  id: quotation.id,
                                  status: "sent",
                                });
                              }}
                              title="Marcar como enviada"
                            >
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                if (confirm("¿Eliminar esta cotización?")) {
                                  deleteMutation.mutate({ id: quotation.id });
                                }
                              }}
                              title="Eliminar cotización"
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
                        </ResponsiveTable>
            ) : (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="mx-auto h-12 w-12 mb-4 opacity-50" />
              <p>No hay cotizaciones registradas</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog para ver cotización */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Detalle de Cotización</DialogTitle>
          </DialogHeader>
          {viewingQuotation && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Número</Label>
                  <p className="font-semibold">{viewingQuotation.quotationNumber}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Estado</Label>
                  <div className="mt-1">{getStatusBadge(viewingQuotation.status)}</div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Fecha</Label>
                  <p>{new Date(viewingQuotation.quotationDate).toLocaleDateString()}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Válida hasta</Label>
                  <p>{new Date(viewingQuotation.validUntil).toLocaleDateString()}</p>
                </div>
              </div>
              {viewingQuotation.paymentTerms && (
                <div>
                  <Label className="text-muted-foreground">Términos de Pago</Label>
                  <p>{viewingQuotation.paymentTerms}</p>
                </div>
              )}
              {viewingQuotation.deliveryTerms && (
                <div>
                  <Label className="text-muted-foreground">Términos de Entrega</Label>
                  <p>{viewingQuotation.deliveryTerms}</p>
                </div>
              )}
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold mb-2">Resumen</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>${parseFloat(viewingQuotation.subtotal).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>IVA:</span>
                    <span>${parseFloat(viewingQuotation.tax).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg">
                    <span>Total:</span>
                    <span>${parseFloat(viewingQuotation.total).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog para convertir a venta */}
      <Dialog open={isConvertDialogOpen} onOpenChange={setIsConvertDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Convertir a Venta</DialogTitle>
            <DialogDescription>
              Convierte esta cotización en una venta confirmada
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="saleNumber">Número de Venta *</Label>
              <Input
                id="saleNumber"
                value={saleNumber}
                onChange={(e) => setSaleNumber(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="paymentMethod">Método de Pago *</Label>
              <Select value={paymentMethod} onValueChange={(value: any) => setPaymentMethod(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona método de pago" />
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
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsConvertDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={confirmConvertToSale} disabled={convertToSaleMutation.isPending}>
              {convertToSaleMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Convertir a Venta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
