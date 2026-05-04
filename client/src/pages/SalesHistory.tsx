import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Loader2, FileText, Download, Eye, ArrowLeft, CalendarDays, X, RotateCcw, AlertTriangle, Ban } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { generateReceiptPDF } from "@/lib/pdfGenerator";
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, subDays } from "date-fns";
import { es } from "date-fns/locale";

// Atajos de rango de fechas
const DATE_SHORTCUTS = [
  { label: "Hoy", getValue: () => ({ from: startOfDay(new Date()), to: endOfDay(new Date()) }) },
  { label: "Ayer", getValue: () => ({ from: startOfDay(subDays(new Date(), 1)), to: endOfDay(subDays(new Date(), 1)) }) },
  { label: "Esta semana", getValue: () => ({ from: startOfWeek(new Date(), { weekStartsOn: 1 }), to: endOfWeek(new Date(), { weekStartsOn: 1 }) }) },
  { label: "Este mes", getValue: () => ({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) }) },
  { label: "Este año", getValue: () => ({ from: startOfYear(new Date()), to: endOfYear(new Date()) }) },
];

export default function SalesHistory() {
  const { user, loading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [showPdfModal, setShowPdfModal] = useState(false);

  // Estado del filtro de fechas
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [activeShortcut, setActiveShortcut] = useState<string | null>(null);

  // Estado del modal de devoluciones
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [returnSale, setReturnSale] = useState<any>(null);
  const [returnSaleItems, setReturnSaleItems] = useState<any[]>([]);
  const [returnSelections, setReturnSelections] = useState<Record<number, { selected: boolean; quantity: number; restock: boolean }>>({});
  const [returnReason, setReturnReason] = useState("");
  const [returnNotes, setReturnNotes] = useState("");
  const [isLoadingReturnItems, setIsLoadingReturnItems] = useState(false);

  // Estado del modal de anulación
  const [showVoidModal, setShowVoidModal] = useState(false);
  const [voidSale, setVoidSale] = useState<any>(null);
  const [voidReason, setVoidReason] = useState("");

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      setLocation("/login");
    }
  }, [loading, isAuthenticated, setLocation]);

  const utils = trpc.useUtils();

  // Construir parámetros de fecha para la query.
  const queryParams = useMemo(() => {
    const params: { startDate?: Date; endDate?: Date } = {};
    if (dateFrom) {
      const [y, m, d] = dateFrom.split("-").map(Number);
      params.startDate = startOfDay(new Date(y, m - 1, d));
    }
    if (dateTo) {
      const [y, m, d] = dateTo.split("-").map(Number);
      params.endDate = endOfDay(new Date(y, m - 1, d));
    }
    return params;
  }, [dateFrom, dateTo]);

  const { data: sales, isLoading } = trpc.sales.list.useQuery(
    Object.keys(queryParams).length > 0 ? queryParams : undefined
  );
  const { data: customers } = trpc.customers.list.useQuery();

  const createReturnMutation = trpc.saleReturns.create.useMutation({
    onSuccess: (data) => {
      toast.success(`Devolución registrada. Reembolso: $${Number(data.totalRefund).toLocaleString("es-CO")}`);
      setShowReturnModal(false);
      setReturnSale(null);
      setReturnSaleItems([]);
      setReturnSelections({});
      setReturnReason("");
      setReturnNotes("");
      utils.inventory.list.invalidate();
    },
    onError: (error) => {
      toast.error("Error al registrar devolución: " + error.message);
    },
  });

  // Mutación para anular venta
  const voidSaleMutation = trpc.sales.void.useMutation({
    onSuccess: () => {
      toast.success(`Venta ${voidSale?.saleNumber || `#${voidSale?.id}`} anulada correctamente. El inventario ha sido restaurado.`);
      setShowVoidModal(false);
      setVoidSale(null);
      setVoidReason("");
      utils.sales.list.invalidate();
      utils.inventory.list.invalidate();
      utils.inventory.lowStock?.invalidate?.();
    },
    onError: (error) => {
      toast.error("Error al anular la venta: " + error.message);
    },
  });

  // Aplicar atajo de fecha
  const applyShortcut = (shortcut: typeof DATE_SHORTCUTS[0]) => {
    const { from, to } = shortcut.getValue();
    setDateFrom(format(from, "yyyy-MM-dd"));
    setDateTo(format(to, "yyyy-MM-dd"));
    setActiveShortcut(shortcut.label);
  };

  // Limpiar filtros
  const clearFilters = () => {
    setDateFrom("");
    setDateTo("");
    setActiveShortcut(null);
  };

  const handleDateFromChange = (val: string) => {
    setDateFrom(val);
    setActiveShortcut(null);
  };
  const handleDateToChange = (val: string) => {
    setDateTo(val);
    setActiveShortcut(null);
  };

  const hasFilter = dateFrom !== "" || dateTo !== "";

  // Totales del período filtrado (excluye ventas anuladas)
  const periodTotals = useMemo(() => {
    if (!sales) return { count: 0, subtotal: 0, tax: 0, total: 0 };
    return (sales as any[])
      .filter((sale: any) => sale.status !== "cancelled")
      .reduce(
        (acc: any, sale: any) => ({
          count: acc.count + 1,
          subtotal: acc.subtotal + Number(sale.subtotal),
          tax: acc.tax + Number(sale.tax),
          total: acc.total + Number(sale.total),
        }),
        { count: 0, subtotal: 0, tax: 0, total: 0 }
      );
  }, [sales]);

  // Abrir modal de devolución
  const handleOpenReturn = async (sale: any) => {
    setReturnSale(sale);
    setReturnReason("");
    setReturnNotes("");
    setReturnSelections({});
    setIsLoadingReturnItems(true);
    setShowReturnModal(true);
    try {
      const items = await utils.sales.getItems.fetch({ saleId: sale.id });
      // Solo productos físicos (no servicios) pueden devolverse al inventario
      setReturnSaleItems(items);
      const initialSelections: Record<number, { selected: boolean; quantity: number; restock: boolean }> = {};
      items.forEach((item: any) => {
        initialSelections[item.id] = {
          selected: false,
          quantity: item.quantity,
          restock: !item.isService,
        };
      });
      setReturnSelections(initialSelections);
    } catch (e) {
      toast.error("Error al cargar los ítems de la venta");
    } finally {
      setIsLoadingReturnItems(false);
    }
  };

  // Confirmar devolución
  const handleConfirmReturn = () => {
    if (!returnSale) return;
    const selectedItems = returnSaleItems
      .filter((item: any) => returnSelections[item.id]?.selected)
      .map((item: any) => {
        const sel = returnSelections[item.id];
        const qty = Math.min(Math.max(1, sel.quantity), item.quantity);
        const unitPrice = parseFloat(item.unitPrice) || 0;
        return {
          saleItemId: item.id,
          productId: item.productId,
          productName: item.productName,
          quantity: qty,
          unitPrice,
          unitCost: parseFloat(item.unitCost || "0") || 0,
          subtotal: unitPrice * qty,
          restockInventory: sel.restock,
        };
      });

    if (selectedItems.length === 0) {
      toast.error("Selecciona al menos un producto para devolver");
      return;
    }

    createReturnMutation.mutate({
      saleId: returnSale.id,
      reason: returnReason || undefined,
      notes: returnNotes || undefined,
      items: selectedItems,
    });
  };

  const totalRefundPreview = useMemo(() => {
    return returnSaleItems
      .filter((item: any) => returnSelections[item.id]?.selected)
      .reduce((acc: number, item: any) => {
        const sel = returnSelections[item.id];
        const qty = Math.min(Math.max(1, sel.quantity), item.quantity);
        return acc + parseFloat(item.unitPrice || "0") * qty;
      }, 0);
  }, [returnSaleItems, returnSelections]);

  // Abrir modal de anulación
  const handleOpenVoid = (sale: any) => {
    setVoidSale(sale);
    setVoidReason("");
    setShowVoidModal(true);
  };

  // Confirmar anulación
  const handleConfirmVoid = () => {
    if (!voidSale) return;
    voidSaleMutation.mutate({
      id: voidSale.id,
      reason: voidReason || undefined,
    });
  };

  const handleViewPDF = async (sale: any) => {
    if (!user) return;
    try {
      const items = await utils.sales.getItems.fetch({ saleId: sale.id });
      const customer = sale.customerId ? customers?.find((c: any) => c.id === sale.customerId) : undefined;
      const pdfDataUrl = await generateReceiptPDF(
        {
          saleNumber: sale.saleNumber || "N/A",
          saleDate: new Date(sale.saleDate),
          customerName: sale.customerName || customer?.name,
          customerIdNumber: customer?.idNumber || undefined,
          customerAddress: customer?.address || undefined,
          customerPhone: customer?.phone || undefined,
          customerEmail: customer?.email || undefined,
          items: items.map((item: any) => ({
            productName: item.productName,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            subtotal: item.subtotal,
            serialNumbers: item.serialNumbers,
          })),
          subtotal: sale.subtotal,
          tax: sale.tax,
          total: sale.total,
          voided: sale.status === "cancelled",
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
      setPdfUrl(pdfDataUrl);
      setShowPdfModal(true);
      toast.success("Comprobante PDF generado");
    } catch (error: any) {
      console.error("Error al generar PDF:", error);
      toast.error("Error al generar comprobante PDF");
    }
  };

  const handleDownloadPDF = async (sale: any) => {
    if (!user) return;
    try {
      const items = await utils.sales.getItems.fetch({ saleId: sale.id });
      const customer = sale.customerId ? customers?.find((c: any) => c.id === sale.customerId) : undefined;
      const pdfDataUrl = await generateReceiptPDF(
        {
          saleNumber: sale.saleNumber || "N/A",
          saleDate: new Date(sale.saleDate),
          customerName: sale.customerName || customer?.name,
          customerIdNumber: customer?.idNumber || undefined,
          customerAddress: customer?.address || undefined,
          customerPhone: customer?.phone || undefined,
          customerEmail: customer?.email || undefined,
          items: items.map((item: any) => ({
            productName: item.productName,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            subtotal: item.subtotal,
            serialNumbers: item.serialNumbers,
          })),
          subtotal: sale.subtotal,
          tax: sale.tax,
          total: sale.total,
          voided: sale.status === "cancelled",
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
      // Descargar el PDF
      const link = document.createElement("a");
      link.href = pdfDataUrl;
      link.download = `comprobante-${sale.saleNumber || sale.id}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("Comprobante descargado");
    } catch (error: any) {
      console.error("Error al descargar PDF:", error);
      toast.error("Error al descargar comprobante PDF");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Encabezado */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => setLocation("/sales")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Historial de Ventas</h1>
          <p className="text-sm text-gray-500">Consulta y gestiona todas tus ventas registradas</p>
        </div>
      </div>

      {/* Filtros de fecha */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <CalendarDays className="h-4 w-4" />
            Filtrar por fecha
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2 mb-3">
            {DATE_SHORTCUTS.map((shortcut) => (
              <Button
                key={shortcut.label}
                variant={activeShortcut === shortcut.label ? "default" : "outline"}
                size="sm"
                onClick={() => applyShortcut(shortcut)}
              >
                {shortcut.label}
              </Button>
            ))}
            {hasFilter && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="text-red-500 hover:text-red-600">
                <X className="h-4 w-4 mr-1" />
                Limpiar
              </Button>
            )}
          </div>
          <div className="flex flex-wrap gap-4">
            <div className="space-y-1">
              <Label className="text-xs text-gray-600">Desde</Label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => handleDateFromChange(e.target.value)}
                className="w-40 h-8 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-gray-600">Hasta</Label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => handleDateToChange(e.target.value)}
                className="w-40 h-8 text-sm"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Totales del período */}
      {hasFilter && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="pt-4 pb-4">
              <p className="text-sm text-blue-600 font-medium">Ventas activas</p>
              <p className="text-2xl font-bold text-blue-800">{periodTotals.count}</p>
            </CardContent>
          </Card>
          <Card className="bg-gray-50 border-gray-200">
            <CardContent className="pt-4 pb-4">
              <p className="text-sm text-gray-600 font-medium">Subtotal</p>
              <p className="text-2xl font-bold text-gray-800">
                ${periodTotals.subtotal.toLocaleString("es-CO")}
              </p>
            </CardContent>
          </Card>
          <Card className="bg-yellow-50 border-yellow-200">
            <CardContent className="pt-4 pb-4">
              <p className="text-sm text-yellow-600 font-medium">IVA</p>
              <p className="text-2xl font-bold text-yellow-800">
                ${periodTotals.tax.toLocaleString("es-CO")}
              </p>
            </CardContent>
          </Card>
          <Card className="bg-green-50 border-green-200">
            <CardContent className="pt-4 pb-4">
              <p className="text-sm text-green-600 font-medium">Total del período</p>
              <p className="text-2xl font-bold text-green-800">
                ${periodTotals.total.toLocaleString("es-CO")}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabla de ventas */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Ventas Registradas</CardTitle>
          <CardDescription>
            {isLoading
              ? "Cargando ventas..."
              : hasFilter
              ? `${periodTotals.count} venta${periodTotals.count !== 1 ? "s" : ""} activa${periodTotals.count !== 1 ? "s" : ""} en el período seleccionado`
              : `${sales?.length || 0} ventas registradas en total`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            </div>
          ) : !sales || sales.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 mx-auto text-gray-400 mb-3" />
              <p className="text-gray-500">
                {hasFilter ? "No hay ventas en el período seleccionado" : "No hay ventas registradas"}
              </p>
              {hasFilter ? (
                <Button variant="outline" className="mt-4" onClick={clearFilters}>
                  Ver todas las ventas
                </Button>
              ) : (
                <>
                  <p className="text-sm text-gray-400 mt-1">Las ventas que registres aparecerán aquí</p>
                  <Button className="mt-4" onClick={() => setLocation("/sales")}>
                    Ir al Punto de Venta
                  </Button>
                </>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>N° Venta</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Método de Pago</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Subtotal</TableHead>
                    <TableHead className="text-right">IVA</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(sales as any[]).map((sale: any) => {
                    const customerName =
                      sale.customerName ||
                      customers?.find((c: any) => c.id === sale.customerId)?.name ||
                      "Cliente general";
                    const isCancelled = sale.status === "cancelled";

                    return (
                      <TableRow
                        key={sale.id}
                        className={isCancelled ? "opacity-60 bg-red-50" : ""}
                      >
                        <TableCell className="font-medium">
                          <span className={isCancelled ? "line-through text-gray-400" : ""}>
                            {sale.saleNumber || `#${sale.id}`}
                          </span>
                        </TableCell>
                        <TableCell>
                          {format(new Date(sale.saleDate), "dd/MM/yyyy HH:mm", { locale: es })}
                        </TableCell>
                        <TableCell>{customerName}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {sale.paymentMethod === "cash" && "Efectivo"}
                            {sale.paymentMethod === "card" && "Tarjeta"}
                            {sale.paymentMethod === "transfer" && "Transferencia"}
                            {sale.paymentMethod === "credit" && "Crédito"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {isCancelled ? (
                            <Badge variant="destructive" className="text-xs">
                              Anulada
                            </Badge>
                          ) : sale.status === "pending" ? (
                            <Badge variant="outline" className="text-xs text-yellow-700 border-yellow-400 bg-yellow-50">
                              Pendiente
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs text-green-700 border-green-400 bg-green-50">
                              Completada
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className={`text-right ${isCancelled ? "line-through text-gray-400" : ""}`}>
                          ${Number(sale.subtotal).toLocaleString("es-CO")}
                        </TableCell>
                        <TableCell className={`text-right ${isCancelled ? "line-through text-gray-400" : ""}`}>
                          ${Number(sale.tax).toLocaleString("es-CO")}
                        </TableCell>
                        <TableCell className={`text-right font-bold ${isCancelled ? "line-through text-gray-400" : ""}`}>
                          ${Number(sale.total).toLocaleString("es-CO")}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewPDF(sale)}
                              title="Ver comprobante"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDownloadPDF(sale)}
                              title="Descargar comprobante"
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                            {!isCancelled && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleOpenReturn(sale)}
                                  title="Registrar devolución parcial"
                                  className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                                >
                                  <RotateCcw className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleOpenVoid(sale)}
                                  title="Anular venta completa"
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                >
                                  <Ban className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal visor PDF */}
      <Dialog open={showPdfModal} onOpenChange={setShowPdfModal}>
        <DialogContent className="max-w-4xl h-[90vh]">
          <DialogHeader>
            <DialogTitle>Comprobante de Venta</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-hidden">
            {pdfUrl && (
              <iframe
                src={pdfUrl}
                className="w-full h-full border-0"
                title="Comprobante PDF"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de devolución parcial */}
      <Dialog open={showReturnModal} onOpenChange={(open) => { if (!open) { setShowReturnModal(false); setReturnSale(null); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RotateCcw className="h-5 w-5 text-orange-600" />
              Registrar Devolución
            </DialogTitle>
            <DialogDescription>
              {returnSale && (
                <span>Venta <strong>{returnSale.saleNumber || `#${returnSale.id}`}</strong> — Selecciona los productos a devolver</span>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Aviso */}
            <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
              <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>El stock de los productos físicos marcados con "Reintegrar al inventario" se devolverá automáticamente. El CPP no cambia en devoluciones de clientes.</span>
            </div>

            {/* Ítems de la venta */}
            {isLoadingReturnItems ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
              </div>
            ) : (
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Productos de la venta</Label>
                {returnSaleItems.map((item: any) => {
                  const sel = returnSelections[item.id];
                  if (!sel) return null;
                  return (
                    <div key={item.id} className={`border rounded-lg p-3 space-y-2 transition-colors ${sel.selected ? "border-orange-300 bg-orange-50" : "border-gray-200"}`}>
                      <div className="flex items-center gap-3">
                        <Checkbox
                          id={`item-${item.id}`}
                          checked={sel.selected}
                          onCheckedChange={(checked) =>
                            setReturnSelections((prev) => ({
                              ...prev,
                              [item.id]: { ...prev[item.id], selected: !!checked },
                            }))
                          }
                        />
                        <div className="flex-1">
                          <label htmlFor={`item-${item.id}`} className="font-medium cursor-pointer">
                            {item.productName}
                          </label>
                          <p className="text-xs text-gray-500">
                            Vendido: {item.quantity} × ${Number(item.unitPrice).toLocaleString("es-CO")} = ${Number(item.subtotal).toLocaleString("es-CO")}
                          </p>
                        </div>
                      </div>
                      {sel.selected && (
                        <div className="ml-7 flex flex-wrap gap-4 items-center">
                          <div className="space-y-1">
                            <Label className="text-xs text-gray-600">Cantidad a devolver</Label>
                            <Input
                              type="number"
                              min={1}
                              max={item.quantity}
                              value={sel.quantity}
                              onChange={(e) =>
                                setReturnSelections((prev) => ({
                                  ...prev,
                                  [item.id]: { ...prev[item.id], quantity: parseInt(e.target.value) || 1 },
                                }))
                              }
                              className="w-24 h-8 text-sm"
                            />
                          </div>
                          {!item.isService && (
                            <div className="flex items-center gap-2">
                              <Checkbox
                                id={`restock-${item.id}`}
                                checked={sel.restock}
                                onCheckedChange={(checked) =>
                                  setReturnSelections((prev) => ({
                                    ...prev,
                                    [item.id]: { ...prev[item.id], restock: !!checked },
                                  }))
                                }
                              />
                              <label htmlFor={`restock-${item.id}`} className="text-xs text-gray-700 cursor-pointer">
                                Reintegrar al inventario
                              </label>
                            </div>
                          )}
                          <p className="text-sm font-semibold text-orange-700">
                            Subtotal: ${(parseFloat(item.unitPrice) * Math.min(Math.max(1, sel.quantity), item.quantity)).toLocaleString("es-CO")}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Motivo y notas */}
            <div className="space-y-1">
              <Label htmlFor="returnReason" className="text-sm">Motivo de la devolución</Label>
              <Input
                id="returnReason"
                placeholder="Ej: Producto defectuoso, no era lo que pedía..."
                value={returnReason}
                onChange={(e) => setReturnReason(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="returnNotes" className="text-sm">Notas adicionales (opcional)</Label>
              <Textarea
                id="returnNotes"
                placeholder="Observaciones internas..."
                value={returnNotes}
                onChange={(e) => setReturnNotes(e.target.value)}
                rows={2}
              />
            </div>

            {/* Total de reembolso */}
            {totalRefundPreview > 0 && (
              <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                <span className="text-sm font-medium text-green-800">Total a reembolsar:</span>
                <span className="text-lg font-bold text-green-700">
                  ${totalRefundPreview.toLocaleString("es-CO")}
                </span>
              </div>
            )}

            {/* Botones */}
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => { setShowReturnModal(false); setReturnSale(null); }}>
                Cancelar
              </Button>
              <Button
                onClick={handleConfirmReturn}
                disabled={createReturnMutation.isPending || isLoadingReturnItems}
                className="bg-orange-600 hover:bg-orange-700 text-white"
              >
                {createReturnMutation.isPending ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Procesando...</>
                ) : (
                  <><RotateCcw className="h-4 w-4 mr-2" /> Confirmar Devolución</>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de anulación de venta completa */}
      <Dialog open={showVoidModal} onOpenChange={(open) => { if (!open) { setShowVoidModal(false); setVoidSale(null); setVoidReason(""); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-700">
              <Ban className="h-5 w-5" />
              Anular Venta Completa
            </DialogTitle>
            <DialogDescription>
              {voidSale && (
                <span>
                  Vas a anular la venta <strong>{voidSale.saleNumber || `#${voidSale.id}`}</strong> por un total de{" "}
                  <strong>${Number(voidSale.total).toLocaleString("es-CO")}</strong>.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Advertencia */}
            <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-red-800 space-y-1">
                <p className="font-semibold">Esta acción no se puede deshacer.</p>
                <p>Al anular la venta:</p>
                <ul className="list-disc ml-4 space-y-0.5">
                  <li>La venta quedará marcada como <strong>Anulada</strong>.</li>
                  <li>Todos los productos físicos serán <strong>devueltos al inventario</strong> automáticamente.</li>
                  <li>Los totales de ventas del período se recalcularán excluyendo esta venta.</li>
                </ul>
              </div>
            </div>

            {/* Motivo */}
            <div className="space-y-1">
              <Label htmlFor="voidReason" className="text-sm font-medium">
                Motivo de anulación <span className="text-gray-400 font-normal">(opcional)</span>
              </Label>
              <Input
                id="voidReason"
                placeholder="Ej: Error en la facturación, pedido cancelado por el cliente..."
                value={voidReason}
                onChange={(e) => setVoidReason(e.target.value)}
              />
            </div>

            {/* Botones */}
            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => { setShowVoidModal(false); setVoidSale(null); setVoidReason(""); }}
                disabled={voidSaleMutation.isPending}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleConfirmVoid}
                disabled={voidSaleMutation.isPending}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {voidSaleMutation.isPending ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Anulando...</>
                ) : (
                  <><Ban className="h-4 w-4 mr-2" /> Confirmar Anulación</>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
