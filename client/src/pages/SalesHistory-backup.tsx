import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Loader2, FileText, Download, Eye, ArrowLeft, Edit } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { generateReceiptPDF } from "@/lib/pdfGenerator";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function SalesHistory() {
  const { user, loading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [showPdfModal, setShowPdfModal] = useState(false);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      setLocation("/login");
    }
  }, [loading, isAuthenticated, setLocation]);

  const utils = trpc.useUtils();
  const { data: sales, isLoading } = trpc.sales.list.useQuery();
  const { data: customers } = trpc.customers.list.useQuery();

  const handleViewPDF = async (sale: any) => {
    if (!user) return;
    
    try {
      const items = await utils.sales.getItems.fetch({ saleId: sale.id });
      
      const pdfDataUrl = await generateReceiptPDF(
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
      
      setPdfUrl(pdfDataUrl);
      setShowPdfModal(true);
      toast.success('Comprobante PDF generado');
    } catch (error) {
      console.error("Error al generar PDF:", error);
      toast.error("Error al generar comprobante PDF");
    }
  };

  const handleDownloadPDF = async (sale: any) => {
    if (!user) return;
    
    try {
      const items = await utils.sales.getItems.fetch({ saleId: sale.id });
      
      const pdfDataUrl = await generateReceiptPDF(
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

  if (loading || isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation("/sales")}
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Volver al POS
            </Button>
          </div>
          <h1 className="text-3xl font-bold">Historial de Ventas</h1>
          <p className="text-gray-500 mt-1">Consulta y gestiona todas tus ventas registradas</p>
        </div>
      </div>

      {/* Sales Table */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Ventas Registradas</CardTitle>
          <CardDescription>
            {sales?.length || 0} ventas registradas en total
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!sales || sales.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 mx-auto text-gray-400 mb-3" />
              <p className="text-gray-500">No hay ventas registradas</p>
              <p className="text-sm text-gray-400 mt-1">
                Las ventas que registres aparecerán aquí
              </p>
              <Button
                className="mt-4"
                onClick={() => setLocation("/sales")}
              >
                Ir al Punto de Venta
              </Button>
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
                    <TableHead className="text-right">Subtotal</TableHead>
                    <TableHead className="text-right">IVA</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sales.map((sale: any) => {
                    const customer = customers?.find(c => c.id === sale.customerId);
                    
                    return (
                      <TableRow key={sale.id}>
                        <TableCell className="font-medium">
                          {sale.saleNumber || `#${sale.id}`}
                        </TableCell>
                        <TableCell>
                          {format(new Date(sale.saleDate), "dd/MM/yyyy HH:mm", { locale: es })}
                        </TableCell>
                        <TableCell>
                          {customer?.name || "Cliente general"}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {sale.paymentMethod === "cash" && "Efectivo"}
                            {sale.paymentMethod === "card" && "Tarjeta"}
                            {sale.paymentMethod === "transfer" && "Transferencia"}
                            {sale.paymentMethod === "credit" && "Crédito"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          ${Number(sale.subtotal).toLocaleString("es-CO")}
                        </TableCell>
                        <TableCell className="text-right">
                          ${Number(sale.tax).toLocaleString("es-CO")}
                        </TableCell>
                        <TableCell className="text-right font-bold">
                          ${Number(sale.total).toLocaleString("es-CO")}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
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

      {/* PDF Viewer Modal */}
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
    </div>
  );
}
