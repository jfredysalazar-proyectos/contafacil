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
