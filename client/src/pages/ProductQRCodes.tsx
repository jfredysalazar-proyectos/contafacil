import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Loader2, QrCode, Download, Printer, Search } from "lucide-react";
import jsPDF from "jspdf";

export default function ProductQRCodes() {
  const { user, loading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProducts, setSelectedProducts] = useState<number[]>([]);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      setLocation("/login");
    }
  }, [loading, isAuthenticated, setLocation]);

  const { data: products, isLoading } = trpc.products.list.useQuery();

  // Filtrar productos con QR según búsqueda
  const filteredProducts = useMemo(() => {
    if (!products) return [];
    
    // Solo productos que tienen QR
    const productsWithQR = products.filter((p: any) => p.qrCode);
    
    if (!searchTerm.trim()) return productsWithQR;
    
    const term = searchTerm.toLowerCase();
    return productsWithQR.filter((product: any) => {
      const name = (product.name || "").toLowerCase();
      const sku = (product.sku || "").toLowerCase();
      return name.includes(term) || sku.includes(term);
    });
  }, [products, searchTerm]);

  const handleSelectAll = () => {
    if (selectedProducts.length === filteredProducts.length) {
      setSelectedProducts([]);
    } else {
      setSelectedProducts(filteredProducts.map((p: any) => p.id));
    }
  };

  const handleSelectProduct = (productId: number) => {
    if (selectedProducts.includes(productId)) {
      setSelectedProducts(selectedProducts.filter(id => id !== productId));
    } else {
      setSelectedProducts([...selectedProducts, productId]);
    }
  };

  const handlePrint = () => {
    const productsToPrint = selectedProducts.length > 0
      ? filteredProducts.filter((p: any) => selectedProducts.includes(p.id))
      : filteredProducts;

    if (productsToPrint.length === 0) {
      toast.error("No hay productos seleccionados para imprimir");
      return;
    }

    // Crear ventana de impresión
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error("No se pudo abrir la ventana de impresión");
      return;
    }

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Códigos QR - ${user?.businessName || 'Productos'}</title>
          <style>
            @page {
              size: A4;
              margin: 15mm;
            }
            body {
              font-family: Arial, sans-serif;
              margin: 0;
              padding: 20px;
            }
            h1 {
              text-align: center;
              margin-bottom: 30px;
              font-size: 24px;
            }
            .qr-grid {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 20px;
              page-break-inside: avoid;
            }
            .qr-item {
              border: 1px solid #ddd;
              padding: 15px;
              text-align: center;
              page-break-inside: avoid;
              background: white;
            }
            .qr-item img {
              width: 150px;
              height: 150px;
              margin: 10px auto;
              display: block;
            }
            .qr-item .product-name {
              font-weight: bold;
              margin: 10px 0 5px;
              font-size: 14px;
            }
            .qr-item .product-sku {
              color: #666;
              font-size: 12px;
              margin-bottom: 5px;
            }
            .qr-item .product-price {
              color: #2563eb;
              font-weight: bold;
              font-size: 16px;
            }
            @media print {
              body {
                print-color-adjust: exact;
                -webkit-print-color-adjust: exact;
              }
            }
          </style>
        </head>
        <body>
          <h1>Códigos QR de Productos - ${user?.businessName || ''}</h1>
          <div class="qr-grid">
            ${productsToPrint.map((product: any) => `
              <div class="qr-item">
                <img src="${product.qrCode}" alt="QR ${product.name}" />
                <div class="product-name">${product.name}</div>
                ${product.sku ? `<div class="product-sku">SKU: ${product.sku}</div>` : ''}
                <div class="product-price">$${Number(product.price).toLocaleString('es-CO')}</div>
              </div>
            `).join('')}
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
    
    // Esperar a que carguen las imágenes antes de imprimir
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
      }, 500);
    };
  };

  const handleDownloadPDF = async () => {
    const productsToDownload = selectedProducts.length > 0
      ? filteredProducts.filter((p: any) => selectedProducts.includes(p.id))
      : filteredProducts;

    if (productsToDownload.length === 0) {
      toast.error("No hay productos seleccionados para descargar");
      return;
    }

    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      
      // Título
      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.text(`Códigos QR - ${user?.businessName || 'Productos'}`, pageWidth / 2, 20, { align: 'center' });
      
      // Configuración de grid: 3 columnas
      const cols = 3;
      const qrSize = 40;
      const cellWidth = (pageWidth - 40) / cols;
      const cellHeight = qrSize + 30;
      const marginX = 20;
      let currentY = 35;
      let currentCol = 0;

      for (let i = 0; i < productsToDownload.length; i++) {
        const product = productsToDownload[i];
        
        // Calcular posición
        const x = marginX + (currentCol * cellWidth);
        const y = currentY;
        
        // Verificar si necesitamos nueva página
        if (y + cellHeight > pageHeight - 20) {
          doc.addPage();
          currentY = 20;
          currentCol = 0;
          continue;
        }
        
        // Dibujar borde
        doc.setDrawColor(200);
        doc.rect(x, y, cellWidth - 5, cellHeight);
        
        // Agregar QR
        if (product.qrCode) {
          doc.addImage(product.qrCode, 'PNG', x + (cellWidth - qrSize) / 2 - 2.5, y + 5, qrSize, qrSize);
        }
        
        // Nombre del producto
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        const nameLines = doc.splitTextToSize(product.name, cellWidth - 10);
        doc.text(nameLines, x + cellWidth / 2 - 2.5, y + qrSize + 12, { align: 'center', maxWidth: cellWidth - 10 });
        
        // SKU
        if (product.sku) {
          doc.setFontSize(8);
          doc.setFont("helvetica", "normal");
          doc.setTextColor(100);
          doc.text(`SKU: ${product.sku}`, x + cellWidth / 2 - 2.5, y + qrSize + 18, { align: 'center' });
        }
        
        // Precio
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(37, 99, 235);
        doc.text(`$${Number(product.price).toLocaleString('es-CO')}`, x + cellWidth / 2 - 2.5, y + qrSize + 24, { align: 'center' });
        
        // Resetear color
        doc.setTextColor(0);
        
        // Avanzar posición
        currentCol++;
        if (currentCol >= cols) {
          currentCol = 0;
          currentY += cellHeight + 5;
        }
      }
      
      // Descargar PDF
      doc.save(`codigos-qr-productos-${new Date().getTime()}.pdf`);
      toast.success("PDF descargado exitosamente");
    } catch (error: any) {
      console.error("Error generando PDF:", error);
      toast.error(error.message || "Error al generar el PDF");
    }
  };

  if (loading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-accent/5">
      <div className="container py-8 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Códigos QR de Productos</h1>
            <p className="text-muted-foreground">
              Visualiza, imprime o descarga los códigos QR de tus productos
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={handlePrint} variant="outline">
              <Printer className="h-4 w-4 mr-2" />
              Imprimir
            </Button>
            <Button onClick={handleDownloadPDF}>
              <Download className="h-4 w-4 mr-2" />
              Descargar PDF
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Productos con Código QR</CardTitle>
            <CardDescription>
              {filteredProducts.length} productos con código QR generado
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Barra de búsqueda */}
              <div className="flex items-center gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nombre o SKU..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Button onClick={handleSelectAll} variant="outline" size="sm">
                  {selectedProducts.length === filteredProducts.length ? "Deseleccionar todos" : "Seleccionar todos"}
                </Button>
              </div>

              {/* Grid de QR */}
              {filteredProducts.length === 0 ? (
                <div className="text-center py-12">
                  <QrCode className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    {searchTerm ? "No se encontraron productos" : "No hay productos con código QR"}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {filteredProducts.map((product: any) => (
                    <Card
                      key={product.id}
                      className={`cursor-pointer transition-all ${
                        selectedProducts.includes(product.id)
                          ? "ring-2 ring-primary"
                          : "hover:shadow-md"
                      }`}
                      onClick={() => handleSelectProduct(product.id)}
                    >
                      <CardContent className="p-4 text-center">
                        {product.qrCode && (
                          <img
                            src={product.qrCode}
                            alt={`QR ${product.name}`}
                            className="w-32 h-32 mx-auto mb-3"
                          />
                        )}
                        <h3 className="font-semibold text-sm mb-1">{product.name}</h3>
                        {product.sku && (
                          <p className="text-xs text-muted-foreground mb-1">SKU: {product.sku}</p>
                        )}
                        <p className="text-primary font-bold">
                          ${Number(product.price).toLocaleString('es-CO')}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
