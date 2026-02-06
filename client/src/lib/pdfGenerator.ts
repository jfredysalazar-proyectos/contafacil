import jsPDF from "jspdf";
import { imageUrlToBase64 } from "./imageUtils";

interface SaleData {
  saleNumber: string;
  saleDate: Date;
  customerName?: string;
  customerIdNumber?: string;
  customerAddress?: string;
  customerPhone?: string;
  customerEmail?: string;
  items: Array<{
    productName: string;
    quantity: number;
    unitPrice: string;
    subtotal: string;
    serialNumbers?: string;
  }>;
  subtotal: string;
  tax?: string;
  total: string;
  paymentMethod?: string;
}

interface UserData {
  name: string;
  email?: string;
  businessName?: string;
  nit?: string;
  address?: string;
  phone?: string;
  logoUrl?: string;
}

export async function generateReceiptPDF(sale: SaleData, user: UserData): Promise<string> {
  const doc = new jsPDF();
  
  // Configuración
  const pageWidth = doc.internal.pageSize.getWidth();
  const leftColX = 20;
  const rightColX = pageWidth / 2 + 5;
  let yPos = 20;
  
  // Título (centrado, arriba)
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("COMPROBANTE DE VENTA", pageWidth / 2, yPos, { align: "center" });
  yPos += 15;
  
  // === COLUMNA IZQUIERDA ===
  let leftY = yPos;
  
  // Logo (si existe)
  if (user.logoUrl) {
    try {
      const logoBase64 = await imageUrlToBase64(user.logoUrl);
      doc.addImage(logoBase64, "PNG", leftColX, leftY, 30, 30);
      leftY += 35;
    } catch (error) {
      console.error("Error al agregar logo al PDF:", error);
    }
  }
  
  // Información del negocio
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text(user.businessName || user.name, leftColX, leftY);
  leftY += 7;
  
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  if (user.nit) {
    doc.text(`NIT: ${user.nit}`, leftColX, leftY);
    leftY += 5;
  }
  if (user.address) {
    const addressLines = doc.splitTextToSize(user.address, 80);
    doc.text(addressLines, leftColX, leftY);
    leftY += 5 * addressLines.length;
  }
  if (user.phone) {
    doc.text(`Tel: ${user.phone}`, leftColX, leftY);
    leftY += 5;
  }
  if (user.email) {
    doc.text(user.email, leftColX, leftY);
    leftY += 5;
  }
  
  // === COLUMNA DERECHA ===
  let rightY = yPos;
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(`N° ${sale.saleNumber}`, rightColX, rightY);
  rightY += 7;
  
  doc.setFont("helvetica", "normal");
  doc.text(`Fecha: ${new Date(sale.saleDate).toLocaleDateString("es-CO")}`, rightColX, rightY);
  rightY += 10;
  
  // Información del cliente
  if (sale.customerName) {
    doc.setFont("helvetica", "bold");
    doc.text("CLIENTE", rightColX, rightY);
    rightY += 6;
    
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(sale.customerName, rightColX, rightY);
    rightY += 5;
    
    if (sale.customerIdNumber) {
      doc.text(`CC/NIT: ${sale.customerIdNumber}`, rightColX, rightY);
      rightY += 5;
    }
    if (sale.customerAddress) {
      const addressLines = doc.splitTextToSize(sale.customerAddress, 80);
      doc.text(addressLines, rightColX, rightY);
      rightY += 5 * addressLines.length;
    }
    if (sale.customerPhone) {
      doc.text(`Tel: ${sale.customerPhone}`, rightColX, rightY);
      rightY += 5;
    }
    if (sale.customerEmail) {
      doc.text(sale.customerEmail, rightColX, rightY);
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
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Producto", 20, yPos);
  doc.text("Cant.", 100, yPos);
  doc.text("Precio Unit.", 125, yPos);
  doc.text("Subtotal", 165, yPos);
  yPos += 7;
  
  // Línea separadora
  doc.setLineWidth(0.3);
  doc.line(20, yPos, 190, yPos);
  yPos += 7;
  
  // Items
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  sale.items.forEach((item) => {
    if (yPos > 270) {
      doc.addPage();
      yPos = 20;
    }
    
    doc.text(item.productName, 20, yPos);
    doc.text(item.quantity.toString(), 100, yPos);
    doc.text(`$${Number(item.unitPrice).toLocaleString("es-CO")}`, 125, yPos);
    doc.text(`$${Number(item.subtotal).toLocaleString("es-CO")}`, 165, yPos);
    yPos += 6;
    
    // Mostrar números de serie si existen
    if (item.serialNumbers) {
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text(`SN/ ${item.serialNumbers}`, 25, yPos);
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      yPos += 5;
    }
  });
  
  yPos += 5;
  doc.setLineWidth(0.3);
  doc.line(20, yPos, 190, yPos);
  yPos += 10;
  
  // Totales
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Subtotal:", 125, yPos);
  doc.text(`$${Number(sale.subtotal).toLocaleString("es-CO")}`, 165, yPos);
  yPos += 7;
  
  doc.text("IVA (19%):", 125, yPos);
  doc.text(`$${Number(sale.tax).toLocaleString("es-CO")}`, 165, yPos);
  yPos += 7;
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("TOTAL:", 125, yPos);
  doc.text(`$${Number(sale.total).toLocaleString("es-CO")}`, 165, yPos);
  
  if (sale.paymentMethod) {
    yPos += 10;
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(`Método de pago: ${sale.paymentMethod}`, 20, yPos);
  }
  
  // Pie de página
  yPos = doc.internal.pageSize.getHeight() - 20;
  doc.setFontSize(8);
  doc.setFont("helvetica", "italic");
  doc.text("Gracias por su compra", pageWidth / 2, yPos, { align: "center" });
  yPos += 5;
  doc.text("Documento generado por ContaFácil", pageWidth / 2, yPos, { align: "center" });
  
  return doc.output("datauristring");
}

export async function generateReportPDF(
  type: string,
  data: any,
  user: UserData,
  startDate?: Date,
  endDate?: Date
): Promise<string> {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let yPos = 20;
  
  // Título (siempre arriba)
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  const titles: Record<string, string> = {
    sales: "REPORTE DE VENTAS",
    expenses: "REPORTE DE GASTOS",
    inventory: "REPORTE DE INVENTARIO",
    debts: "REPORTE DE DEUDAS",
  };
  doc.text(titles[type] || "REPORTE", pageWidth / 2, yPos, { align: "center" });
  yPos += 15;
  
  // Logo (debajo del título, a la izquierda)
  if (user.logoUrl) {
    try {
      const logoBase64 = await imageUrlToBase64(user.logoUrl);
      doc.addImage(logoBase64, "PNG", 20, yPos, 30, 30);
    } catch (error) {
      console.error("Error al agregar logo al PDF:", error);
    }
  }
  
  yPos += 35;
  
  // Información del negocio
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(user.businessName || user.name, 20, yPos);
  yPos += 7;
  
  doc.setFont("helvetica", "normal");
  if (startDate && endDate) {
    doc.text(
      `Período: ${new Date(startDate).toLocaleDateString("es-CO")} - ${new Date(endDate).toLocaleDateString("es-CO")}`,
      20,
      yPos
    );
    yPos += 7;
  }
  
  doc.text(`Generado: ${new Date().toLocaleDateString("es-CO")}`, 20, yPos);
  yPos += 15;
  
  // Contenido según tipo
  if (type === "sales" && Array.isArray(data)) {
    const total = data.reduce((sum, sale) => sum + Number(sale.total), 0);
    
    doc.setFont("helvetica", "bold");
    doc.text(`Total de ventas: ${data.length}`, 20, yPos);
    yPos += 7;
    doc.text(`Monto total: $${total.toLocaleString("es-CO")}`, 20, yPos);
    yPos += 15;
    
    // Tabla
    doc.setFontSize(9);
    doc.text("Fecha", 20, yPos);
    doc.text("N° Venta", 60, yPos);
    doc.text("Total", 140, yPos);
    yPos += 5;
    doc.line(20, yPos, 190, yPos);
    yPos += 7;
    
    doc.setFont("helvetica", "normal");
    data.forEach((sale) => {
      if (yPos > 270) {
        doc.addPage();
        yPos = 20;
      }
      doc.text(new Date(sale.saleDate).toLocaleDateString("es-CO"), 20, yPos);
      doc.text(sale.saleNumber, 60, yPos);
      doc.text(`$${Number(sale.total).toLocaleString("es-CO")}`, 140, yPos);
      yPos += 6;
    });
  }
  
  return doc.output("datauristring");
}

interface QuotationData {
  quotationNumber: string;
  quotationDate: Date;
  validUntil?: Date;
  customerName?: string;
  customerIdNumber?: string;
  customerAddress?: string;
  customerPhone?: string;
  customerEmail?: string;
  items: Array<{
    productName: string;
    quantity: number;
    unitPrice: string;
    subtotal: string;
    serialNumbers?: string;
  }>;
  subtotal: string;
  tax: string;
  total: string;
  paymentTerms?: string;
  deliveryTerms?: string;
  notes?: string;
  status?: string;
}

export async function createQuotationPDF(quotation: QuotationData, user: UserData): Promise<string> {
  const doc = new jsPDF();
  
  // Configuración
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
  if (user.logoUrl) {
    try {
      const logoBase64 = await imageUrlToBase64(user.logoUrl);
      doc.addImage(logoBase64, "PNG", leftColX, leftY, 30, 30);
      leftY += 35;
    } catch (error) {
      console.error("Error al agregar logo al PDF:", error);
    }
  }
  
  // Información del negocio
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text(user.businessName || user.name, leftColX, leftY);
  leftY += 7;
  
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  if (user.nit) {
    doc.text(`NIT: ${user.nit}`, leftColX, leftY);
    leftY += 5;
  }
  if (user.address) {
    const addressLines = doc.splitTextToSize(user.address, 80);
    doc.text(addressLines, leftColX, leftY);
    leftY += 5 * addressLines.length;
  }
  if (user.phone) {
    doc.text(`Tel: ${user.phone}`, leftColX, leftY);
    leftY += 5;
  }
  if (user.email) {
    doc.text(user.email, leftColX, leftY);
    leftY += 5;
  }
  
  // === COLUMNA DERECHA ===
  let rightY = yPos;
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(`N° ${quotation.quotationNumber}`, rightColX, rightY);
  rightY += 7;
  
  doc.setFont("helvetica", "normal");
  doc.text(`Fecha: ${new Date(quotation.quotationDate).toLocaleDateString("es-CO")}`, rightColX, rightY);
  rightY += 6;
  
  if (quotation.validUntil) {
    doc.text(`Válida hasta: ${new Date(quotation.validUntil).toLocaleDateString("es-CO")}`, rightColX, rightY);
    rightY += 10;
  } else {
    rightY += 4;
  }
  
  // Información del cliente
  if (quotation.customerName) {
    doc.setFont("helvetica", "bold");
    doc.text("CLIENTE", rightColX, rightY);
    rightY += 6;
    
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(quotation.customerName, rightColX, rightY);
    rightY += 5;
    
    if (quotation.customerIdNumber) {
      doc.text(`CC/NIT: ${quotation.customerIdNumber}`, rightColX, rightY);
      rightY += 5;
    }
    if (quotation.customerAddress) {
      const addressLines = doc.splitTextToSize(quotation.customerAddress, 80);
      doc.text(addressLines, rightColX, rightY);
      rightY += 5 * addressLines.length;
    }
    if (quotation.customerPhone) {
      doc.text(`Tel: ${quotation.customerPhone}`, rightColX, rightY);
      rightY += 5;
    }
    if (quotation.customerEmail) {
      doc.text(quotation.customerEmail, rightColX, rightY);
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
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Producto", 20, yPos);
  doc.text("Cant.", 100, yPos);
  doc.text("Precio Unit.", 125, yPos);
  doc.text("Subtotal", 165, yPos);
  yPos += 7;
  
  doc.setLineWidth(0.3);
  doc.line(20, yPos, 190, yPos);
  yPos += 7;
  
  // Items
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  quotation.items.forEach((item) => {
    if (yPos > 270) {
      doc.addPage();
      yPos = 20;
    }
    
    doc.text(item.productName, 20, yPos);
    doc.text(item.quantity.toString(), 100, yPos);
    doc.text(`$${Number(item.unitPrice).toLocaleString("es-CO")}`, 125, yPos);
    doc.text(`$${Number(item.subtotal).toLocaleString("es-CO")}`, 165, yPos);
    yPos += 6;
    
    // Mostrar números de serie si existen
    if (item.serialNumbers) {
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text(`SN/ ${item.serialNumbers}`, 25, yPos);
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      yPos += 5;
    }
  });
  
  yPos += 5;
  doc.setLineWidth(0.3);
  doc.line(20, yPos, 190, yPos);
  yPos += 10;
  
  // Totales
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Subtotal:", 125, yPos);
  doc.text(`$${Number(quotation.subtotal).toLocaleString("es-CO")}`, 165, yPos);
  yPos += 7;
  
  doc.text("IVA (19%):", 125, yPos);
  doc.text(`$${Number(quotation.tax).toLocaleString("es-CO")}`, 165, yPos);
  yPos += 7;
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("TOTAL:", 125, yPos);
  doc.text(`$${Number(quotation.total).toLocaleString("es-CO")}`, 165, yPos);
  yPos += 15;
  
  // Términos y condiciones
  if (quotation.paymentTerms || quotation.deliveryTerms || quotation.notes) {
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    
    if (quotation.paymentTerms) {
      doc.text("Términos de pago:", 20, yPos);
      yPos += 5;
      doc.setFont("helvetica", "normal");
      const paymentLines = doc.splitTextToSize(quotation.paymentTerms, 170);
      doc.text(paymentLines, 20, yPos);
      yPos += 5 * paymentLines.length + 5;
    }
    
    if (quotation.deliveryTerms) {
      doc.setFont("helvetica", "bold");
      doc.text("Términos de entrega:", 20, yPos);
      yPos += 5;
      doc.setFont("helvetica", "normal");
      const deliveryLines = doc.splitTextToSize(quotation.deliveryTerms, 170);
      doc.text(deliveryLines, 20, yPos);
      yPos += 5 * deliveryLines.length + 5;
    }
    
    if (quotation.notes) {
      doc.setFont("helvetica", "bold");
      doc.text("Notas:", 20, yPos);
      yPos += 5;
      doc.setFont("helvetica", "normal");
      const notesLines = doc.splitTextToSize(quotation.notes, 170);
      doc.text(notesLines, 20, yPos);
      yPos += 5 * notesLines.length;
    }
  }
  
  // Pie de página
  yPos = doc.internal.pageSize.getHeight() - 20;
  doc.setFontSize(8);
  doc.setFont("helvetica", "italic");
  doc.text("Esta cotización es válida por 30 días", pageWidth / 2, yPos, { align: "center" });
  yPos += 5;
  doc.text("Documento generado por ContaFácil", pageWidth / 2, yPos, { align: "center" });
  
  return doc.output("datauristring");
}
