import jsPDF from "jspdf";

interface SaleData {
  saleNumber: string;
  saleDate: Date;
  customerName?: string;
  items: Array<{
    productName: string;
    quantity: number;
    unitPrice: string;
    subtotal: string;
  }>;
  subtotal: string;
  tax: string;
  total: string;
  paymentMethod: string;
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

export function generateReceiptPDF(sale: SaleData, user: UserData): string {
  const doc = new jsPDF();
  
  // Configuración
  const pageWidth = doc.internal.pageSize.getWidth();
  let yPos = 20;
  
  // Logo (si existe)
  if (user.logoUrl) {
    try {
      // Agregar logo en la esquina superior derecha
      doc.addImage(user.logoUrl, "PNG", pageWidth - 50, 10, 40, 40);
    } catch (error) {
      console.error("Error al agregar logo al PDF:", error);
    }
  }
  
  // Título
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("COMPROBANTE DE VENTA", pageWidth / 2, yPos, { align: "center" });
  yPos += 15;
  
  // Información del negocio
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text(user.businessName || user.name, 20, yPos);
  yPos += 7;
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  if (user.nit) {
    doc.text(`NIT: ${user.nit}`, 20, yPos);
    yPos += 5;
  }
  if (user.address) {
    doc.text(`Dirección: ${user.address}`, 20, yPos);
    yPos += 5;
  }
  if (user.phone) {
    doc.text(`Teléfono: ${user.phone}`, 20, yPos);
    yPos += 5;
  }
  if (user.email) {
    doc.text(`Email: ${user.email}`, 20, yPos);
    yPos += 5;
  }
  
  yPos += 10;
  
  // Información de la venta
  doc.setFont("helvetica", "bold");
  doc.text(`N° de Venta: ${sale.saleNumber}`, 20, yPos);
  yPos += 7;
  
  doc.setFont("helvetica", "normal");
  doc.text(`Fecha: ${new Date(sale.saleDate).toLocaleDateString("es-CO")}`, 20, yPos);
  yPos += 7;
  
  if (sale.customerName) {
    doc.text(`Cliente: ${sale.customerName}`, 20, yPos);
    yPos += 7;
  }
  
  doc.text(`Método de pago: ${sale.paymentMethod}`, 20, yPos);
  yPos += 15;
  
  // Tabla de productos
  doc.setFont("helvetica", "bold");
  doc.text("Producto", 20, yPos);
  doc.text("Cant.", 100, yPos);
  doc.text("Precio Unit.", 125, yPos);
  doc.text("Subtotal", 165, yPos);
  yPos += 7;
  
  // Línea separadora
  doc.line(20, yPos, 190, yPos);
  yPos += 7;
  
  // Items
  doc.setFont("helvetica", "normal");
  sale.items.forEach((item) => {
    if (yPos > 270) {
      doc.addPage();
      yPos = 20;
    }
    
    doc.text(item.productName, 20, yPos);
    doc.text(item.quantity.toString(), 100, yPos);
    doc.text(`$${Number(item.unitPrice).toLocaleString("es-CO")}`, 125, yPos);
    doc.text(`$${Number(item.subtotal).toLocaleString("es-CO")}`, 165, yPos);
    yPos += 7;
  });
  
  yPos += 5;
  doc.line(20, yPos, 190, yPos);
  yPos += 10;
  
  // Totales
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
  
  // Pie de página
  yPos = doc.internal.pageSize.getHeight() - 20;
  doc.setFontSize(8);
  doc.setFont("helvetica", "italic");
  doc.text("Gracias por su compra", pageWidth / 2, yPos, { align: "center" });
  yPos += 5;
  doc.text("Documento generado por ContaFácil", pageWidth / 2, yPos, { align: "center" });
  
  // Retornar PDF como base64
  return doc.output("datauristring").split(",")[1];
}

export function generateReportPDF(
  type: string,
  data: any,
  user: UserData,
  startDate?: Date,
  endDate?: Date
): string {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let yPos = 20;
  
  // Logo (si existe)
  if (user.logoUrl) {
    try {
      // Agregar logo en la esquina superior derecha
      doc.addImage(user.logoUrl, "PNG", pageWidth - 50, 10, 40, 40);
    } catch (error) {
      console.error("Error al agregar logo al PDF:", error);
    }
  }
  
  // Título
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
      yPos += 7;
    });
  } else if (type === "expenses" && Array.isArray(data)) {
    const total = data.reduce((sum, expense) => sum + Number(expense.amount), 0);
    
    doc.setFont("helvetica", "bold");
    doc.text(`Total de gastos: ${data.length}`, 20, yPos);
    yPos += 7;
    doc.text(`Monto total: $${total.toLocaleString("es-CO")}`, 20, yPos);
    yPos += 15;
    
    // Tabla
    doc.setFontSize(9);
    doc.text("Fecha", 20, yPos);
    doc.text("Descripción", 60, yPos);
    doc.text("Monto", 140, yPos);
    yPos += 5;
    doc.line(20, yPos, 190, yPos);
    yPos += 7;
    
    doc.setFont("helvetica", "normal");
    data.forEach((expense) => {
      if (yPos > 270) {
        doc.addPage();
        yPos = 20;
      }
      doc.text(new Date(expense.expenseDate).toLocaleDateString("es-CO"), 20, yPos);
      doc.text(expense.description.substring(0, 40), 60, yPos);
      doc.text(`$${Number(expense.amount).toLocaleString("es-CO")}`, 140, yPos);
      yPos += 7;
    });
  }
  
  // Pie de página
  yPos = doc.internal.pageSize.getHeight() - 15;
  doc.setFontSize(8);
  doc.setFont("helvetica", "italic");
  doc.text("Documento generado por ContaFácil", pageWidth / 2, yPos, { align: "center" });
  
  return doc.output("datauristring").split(",")[1];
}
