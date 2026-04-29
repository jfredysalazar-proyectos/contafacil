/**
 * Endpoint REST para generar backup completo de la base de datos del usuario en Excel.
 * GET /api/backup/excel
 * Requiere cookie de sesión válida.
 */
import { Express, Request, Response } from "express";
import * as XLSX from "xlsx";
import * as dbQueries from "./db-queries";
import { getUserById } from "./db";
import { verifyToken, COOKIE_NAME } from "./auth";

export function registerBackupEndpoint(app: Express) {
  app.get("/api/backup/excel", async (req: Request, res: Response) => {
    try {
      // Autenticación: leer el token de la cookie de sesión
      const token =
        req.cookies?.[COOKIE_NAME] ||
        (req.headers.authorization?.startsWith("Bearer ")
          ? req.headers.authorization.slice(7)
          : null);

      if (!token) {
        return res.status(401).json({ error: "No autenticado" });
      }

      // Verificar el token y obtener el userId
      let userId: number;
      const payload = await verifyToken(token);
      if (!payload) {
        return res.status(401).json({ error: "Sesión inválida" });
      }
      userId = payload.userId;

      const user = await getUserById(userId);
      if (!user) {
        return res.status(401).json({ error: "Usuario no encontrado" });
      }

      // Recopilar todos los datos del usuario en paralelo
      const [
        products,
        customers,
        suppliers,
        sales,
        expenses,
        receivables,
        payables,
        quotations,
        inventory,
        serialNumbers,
        productCategories,
        expenseCategories,
      ] = await Promise.all([
        dbQueries.getProductsByUserId(userId).catch(() => []),
        dbQueries.getCustomersByUserId(userId).catch(() => []),
        dbQueries.getSuppliersByUserId(userId).catch(() => []),
        dbQueries.getSalesByUserId(userId).catch(() => []),
        dbQueries.getExpensesByUserId(userId).catch(() => []),
        dbQueries.getReceivablesByUserId(userId).catch(() => []),
        dbQueries.getPayablesByUserId(userId).catch(() => []),
        dbQueries.getQuotationsByUserId(userId).catch(() => []),
        dbQueries.getInventoryByUserId(userId).catch(() => []),
        dbQueries.getSerialNumbersByUserId(userId).catch(() => []),
        dbQueries.getProductCategoriesByUserId(userId).catch(() => []),
        dbQueries.getExpenseCategoriesByUserId(userId).catch(() => []),
      ]);

      // Obtener items de ventas (para la hoja de detalle de ventas)
      const salesWithItems: any[] = [];
      for (const sale of sales as any[]) {
        try {
          const items = await dbQueries.getSaleItemsBySaleId(sale.id, userId);
          for (const item of items as any[]) {
            salesWithItems.push({
              "N° Venta": sale.saleNumber || "",
              "Fecha": formatDate(sale.saleDate),
              "Cliente": sale.customerName || "",
              "Producto": item.productName || "",
              "Cantidad": item.quantity || 0,
              "Precio Unitario": formatNumber(item.unitPrice),
              "Subtotal Item": formatNumber(item.subtotal),
              "Descuento": formatNumber(item.discount),
              "Subtotal Venta": formatNumber(sale.subtotal),
              "IVA": formatNumber(sale.tax),
              "Total Venta": formatNumber(sale.total),
              "Método de Pago": sale.paymentMethod || "",
              "Estado": sale.status || "",
              "Notas": sale.notes || "",
            });
          }
        } catch {
          // Si no hay items, agregar la venta sin detalle
          salesWithItems.push({
            "N° Venta": sale.saleNumber || "",
            "Fecha": formatDate(sale.saleDate),
            "Cliente": sale.customerName || "",
            "Producto": "",
            "Cantidad": "",
            "Precio Unitario": "",
            "Subtotal Item": "",
            "Descuento": "",
            "Subtotal Venta": formatNumber(sale.subtotal),
            "IVA": formatNumber(sale.tax),
            "Total Venta": formatNumber(sale.total),
            "Método de Pago": sale.paymentMethod || "",
            "Estado": sale.status || "",
            "Notas": sale.notes || "",
          });
        }
      }

      // Crear el libro de Excel
      const wb = XLSX.utils.book_new();

      // Hoja 1: Resumen
      const resumenData = [
        ["BACKUP DE BASE DE DATOS - CONTAFÁCIL"],
        [""],
        ["Empresa:", (user as any).businessName || user.name],
        ["NIT/CC:", (user as any).nit || ""],
        ["Email:", user.email],
        ["Fecha de backup:", formatDate(new Date())],
        ["Hora de backup:", new Date().toLocaleTimeString("es-CO")],
        [""],
        ["RESUMEN DE DATOS"],
        ["Módulo", "Registros"],
        ["Productos", (products as any[]).length],
        ["Clientes", (customers as any[]).length],
        ["Proveedores", (suppliers as any[]).length],
        ["Ventas", (sales as any[]).length],
        ["Detalle de Ventas (items)", salesWithItems.length],
        ["Gastos", (expenses as any[]).length],
        ["Cuentas por Cobrar", (receivables as any[]).length],
        ["Cuentas por Pagar", (payables as any[]).length],
        ["Cotizaciones", (quotations as any[]).length],
        ["Inventario (movimientos)", (inventory as any[]).length],
        ["Números de Serie", (serialNumbers as any[]).length],
        ["Categorías de Productos", (productCategories as any[]).length],
        ["Categorías de Gastos", (expenseCategories as any[]).length],
      ];
      const wsResumen = XLSX.utils.aoa_to_sheet(resumenData);
      wsResumen["!cols"] = [{ wch: 30 }, { wch: 40 }];
      XLSX.utils.book_append_sheet(wb, wsResumen, "Resumen");

      // Hoja 2: Productos
      if ((products as any[]).length > 0) {
        const productsData = (products as any[]).map((p) => ({
          "ID": p.id,
          "Nombre": p.name || "",
          "SKU": p.sku || "",
          "Descripción": p.description || "",
          "Precio de Venta": formatNumber(p.price),
          "Costo": formatNumber(p.cost),
          "Precio Promocional": formatNumber(p.promotionalPrice),
          "Categoría": p.categoryName || p.category || "",
          "Stock": p.stock ?? "",
          "Stock Mínimo": p.minStock ?? "",
          "Es Servicio": p.isService ? "Sí" : "No",
          "Destacado": p.isFeatured ? "Sí" : "No",
          "Tipo de Venta": p.saleType || "",
          "Impuesto": p.taxType || "",
          "Código de Barras": p.barcode || "",
          "Activo": p.isActive !== false ? "Sí" : "No",
          "Fecha Creación": formatDate(p.createdAt),
        }));
        const wsProducts = XLSX.utils.json_to_sheet(productsData);
        wsProducts["!cols"] = autoColWidths(productsData);
        XLSX.utils.book_append_sheet(wb, wsProducts, "Productos");
      } else {
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([["Sin registros"]]), "Productos");
      }

      // Hoja 3: Clientes
      if ((customers as any[]).length > 0) {
        const customersData = (customers as any[]).map((c) => ({
          "ID": c.id,
          "Nombre": c.name || "",
          "CC/NIT": c.idNumber || "",
          "Email": c.email || "",
          "Teléfono": c.phone || "",
          "Dirección": c.address || "",
          "Ciudad": c.city || "",
          "Notas": c.notes || "",
          "Fecha Creación": formatDate(c.createdAt),
        }));
        const wsCustomers = XLSX.utils.json_to_sheet(customersData);
        wsCustomers["!cols"] = autoColWidths(customersData);
        XLSX.utils.book_append_sheet(wb, wsCustomers, "Clientes");
      } else {
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([["Sin registros"]]), "Clientes");
      }

      // Hoja 4: Proveedores
      if ((suppliers as any[]).length > 0) {
        const suppliersData = (suppliers as any[]).map((s) => ({
          "ID": s.id,
          "Nombre": s.name || "",
          "NIT": s.nit || "",
          "Email": s.email || "",
          "Teléfono": s.phone || "",
          "Dirección": s.address || "",
          "Contacto": s.contactName || "",
          "Notas": s.notes || "",
          "Fecha Creación": formatDate(s.createdAt),
        }));
        const wsSuppliers = XLSX.utils.json_to_sheet(suppliersData);
        wsSuppliers["!cols"] = autoColWidths(suppliersData);
        XLSX.utils.book_append_sheet(wb, wsSuppliers, "Proveedores");
      } else {
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([["Sin registros"]]), "Proveedores");
      }

      // Hoja 5: Ventas (detalle por item)
      if (salesWithItems.length > 0) {
        const wsSales = XLSX.utils.json_to_sheet(salesWithItems);
        wsSales["!cols"] = autoColWidths(salesWithItems);
        XLSX.utils.book_append_sheet(wb, wsSales, "Ventas");
      } else {
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([["Sin registros"]]), "Ventas");
      }

      // Hoja 6: Gastos
      if ((expenses as any[]).length > 0) {
        const expensesData = (expenses as any[]).map((e) => ({
          "ID": e.id,
          "Descripción": e.description || "",
          "Monto": formatNumber(e.amount),
          "Categoría": e.categoryName || e.category || "",
          "Proveedor": e.supplierName || "",
          "Fecha": formatDate(e.date || e.expenseDate),
          "Método de Pago": e.paymentMethod || "",
          "N° Factura": e.invoiceNumber || "",
          "Notas": e.notes || "",
          "Fecha Creación": formatDate(e.createdAt),
        }));
        const wsExpenses = XLSX.utils.json_to_sheet(expensesData);
        wsExpenses["!cols"] = autoColWidths(expensesData);
        XLSX.utils.book_append_sheet(wb, wsExpenses, "Gastos");
      } else {
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([["Sin registros"]]), "Gastos");
      }

      // Hoja 7: Cuentas por Cobrar
      if ((receivables as any[]).length > 0) {
        const receivablesData = (receivables as any[]).map((r) => ({
          "ID": r.id,
          "Cliente": r.customerName || r.debtorName || "",
          "Descripción": r.description || "",
          "Monto Total": formatNumber(r.amount || r.totalAmount),
          "Monto Pagado": formatNumber(r.paidAmount),
          "Saldo Pendiente": formatNumber((r.amount || r.totalAmount) - (r.paidAmount || 0)),
          "Fecha Vencimiento": formatDate(r.dueDate),
          "Estado": r.status || "",
          "Notas": r.notes || "",
          "Fecha Creación": formatDate(r.createdAt),
        }));
        const wsReceivables = XLSX.utils.json_to_sheet(receivablesData);
        wsReceivables["!cols"] = autoColWidths(receivablesData);
        XLSX.utils.book_append_sheet(wb, wsReceivables, "Cuentas por Cobrar");
      } else {
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([["Sin registros"]]), "Cuentas por Cobrar");
      }

      // Hoja 8: Cuentas por Pagar
      if ((payables as any[]).length > 0) {
        const payablesData = (payables as any[]).map((p) => ({
          "ID": p.id,
          "Proveedor": p.supplierName || p.creditorName || "",
          "Descripción": p.description || "",
          "Monto Total": formatNumber(p.amount || p.totalAmount),
          "Monto Pagado": formatNumber(p.paidAmount),
          "Saldo Pendiente": formatNumber((p.amount || p.totalAmount) - (p.paidAmount || 0)),
          "Fecha Vencimiento": formatDate(p.dueDate),
          "Estado": p.status || "",
          "Notas": p.notes || "",
          "Fecha Creación": formatDate(p.createdAt),
        }));
        const wsPayables = XLSX.utils.json_to_sheet(payablesData);
        wsPayables["!cols"] = autoColWidths(payablesData);
        XLSX.utils.book_append_sheet(wb, wsPayables, "Cuentas por Pagar");
      } else {
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([["Sin registros"]]), "Cuentas por Pagar");
      }

      // Hoja 9: Cotizaciones
      if ((quotations as any[]).length > 0) {
        const quotationsData = (quotations as any[]).map((q) => ({
          "ID": q.id,
          "N° Cotización": q.quotationNumber || "",
          "Cliente": q.customerName || "",
          "Subtotal": formatNumber(q.subtotal),
          "IVA": formatNumber(q.tax),
          "Total": formatNumber(q.total),
          "Estado": q.status || "",
          "Válida Hasta": formatDate(q.validUntil),
          "Notas": q.notes || "",
          "Fecha Creación": formatDate(q.createdAt),
        }));
        const wsQuotations = XLSX.utils.json_to_sheet(quotationsData);
        wsQuotations["!cols"] = autoColWidths(quotationsData);
        XLSX.utils.book_append_sheet(wb, wsQuotations, "Cotizaciones");
      } else {
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([["Sin registros"]]), "Cotizaciones");
      }

      // Hoja 10: Inventario
      if ((inventory as any[]).length > 0) {
        const inventoryData = (inventory as any[]).map((i) => ({
          "ID": i.id,
          "Producto": i.productName || "",
          "Tipo Movimiento": i.movementType || i.type || "",
          "Cantidad": i.quantity || 0,
          "Stock Anterior": i.previousStock ?? "",
          "Stock Nuevo": i.newStock ?? "",
          "Referencia": i.reference || "",
          "Notas": i.notes || "",
          "Fecha": formatDate(i.createdAt || i.date),
        }));
        const wsInventory = XLSX.utils.json_to_sheet(inventoryData);
        wsInventory["!cols"] = autoColWidths(inventoryData);
        XLSX.utils.book_append_sheet(wb, wsInventory, "Inventario");
      } else {
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([["Sin registros"]]), "Inventario");
      }

      // Hoja 11: Números de Serie
      if ((serialNumbers as any[]).length > 0) {
        const serialData = (serialNumbers as any[]).map((s) => ({
          "ID": s.id,
          "N° de Serie": s.serialNumber || "",
          "Producto": s.productName || "",
          "N° Venta": s.saleNumber || "",
          "Cliente": s.customerName || "",
          "Fecha Venta": formatDate(s.saleDate),
          "Garantía (días)": s.warrantyDays || 90,
          "Fecha Creación": formatDate(s.createdAt),
        }));
        const wsSerial = XLSX.utils.json_to_sheet(serialData);
        wsSerial["!cols"] = autoColWidths(serialData);
        XLSX.utils.book_append_sheet(wb, wsSerial, "Números de Serie");
      } else {
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([["Sin registros"]]), "Números de Serie");
      }

      // Hoja 12: Categorías
      const categoriasData: any[] = [];
      for (const c of productCategories as any[]) {
        categoriasData.push({ "Tipo": "Producto", "Nombre": c.name || "", "Descripción": c.description || "" });
      }
      for (const c of expenseCategories as any[]) {
        categoriasData.push({ "Tipo": "Gasto", "Nombre": c.name || "", "Descripción": c.description || "" });
      }
      if (categoriasData.length > 0) {
        const wsCategorias = XLSX.utils.json_to_sheet(categoriasData);
        wsCategorias["!cols"] = autoColWidths(categoriasData);
        XLSX.utils.book_append_sheet(wb, wsCategorias, "Categorías");
      } else {
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([["Sin registros"]]), "Categorías");
      }

      // Generar el buffer del archivo Excel
      const excelBuffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

      // Nombre del archivo con la fecha actual
      const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
      const filename = `ContaFacil_Backup_${today}.xlsx`;

      // Enviar el archivo como descarga
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      res.setHeader("Content-Length", excelBuffer.length);
      return res.send(excelBuffer);
    } catch (error: any) {
      console.error("[Backup] Error al generar backup Excel:", error);
      return res.status(500).json({ error: "Error al generar el backup: " + error.message });
    }
  });

  // ─── Reporte de Inventario Actual ────────────────────────────────────────────
  // GET /api/inventory/excel
  // Genera un Excel con el estado actual del inventario de productos físicos,
  // incluyendo stock, costo promedio ponderado y valoración total.
  app.get("/api/inventory/excel", async (req: Request, res: Response) => {
    try {
      // Autenticación
      const token =
        req.cookies?.[COOKIE_NAME] ||
        (req.headers.authorization?.startsWith("Bearer ")
          ? req.headers.authorization.slice(7)
          : null);
      if (!token) return res.status(401).json({ error: "No autenticado" });

      const payload = await verifyToken(token);
      if (!payload) return res.status(401).json({ error: "Sesión inválida" });

      const user = await getUserById(payload.userId);
      if (!user) return res.status(401).json({ error: "Usuario no encontrado" });

      const inventoryItems = await dbQueries.getInventoryByUserId(payload.userId);

      // Calcular totales
      let totalUnidades = 0;
      let totalValorInventario = 0;

      const rows = inventoryItems.map((item: any) => {
        const stock = item.stock ?? 0;
        const avgCost = parseFloat(item.averageCost ?? "0") || 0;
        const price = parseFloat(item.productPrice ?? "0") || 0;
        const valorCosto = stock * avgCost;
        const valorVenta = stock * price;
        const margen = avgCost > 0 ? ((price - avgCost) / avgCost) * 100 : 0;

        totalUnidades += stock;
        totalValorInventario += valorCosto;

        return {
          "Producto": item.productName || "",
          "SKU": item.sku || "",
          "Stock Actual": stock,
          "Costo Promedio (CPP)": avgCost > 0 ? avgCost : "",
          "Precio de Venta": price > 0 ? price : "",
          "Valor en Inventario (costo)": valorCosto > 0 ? valorCosto : 0,
          "Valor en Inventario (venta)": valorVenta > 0 ? valorVenta : 0,
          "Margen %": avgCost > 0 && price > 0 ? Math.round(margen * 100) / 100 : "",
          "Stock Mínimo": item.stockAlert ?? "",
          "Última Entrada": item.lastRestockDate ? formatDate(item.lastRestockDate) : "",
        };
      });

      // Fila de totales
      rows.push({
        "Producto": "TOTAL",
        "SKU": "",
        "Stock Actual": totalUnidades,
        "Costo Promedio (CPP)": "",
        "Precio de Venta": "",
        "Valor en Inventario (costo)": totalValorInventario,
        "Valor en Inventario (venta)": inventoryItems.reduce((acc: number, item: any) => {
          return acc + (item.stock ?? 0) * (parseFloat(item.productPrice ?? "0") || 0);
        }, 0),
        "Margen %": "",
        "Stock Mínimo": "",
        "Última Entrada": "",
      } as any);

      const wb = XLSX.utils.book_new();

      // Hoja principal: Inventario
      const ws = XLSX.utils.json_to_sheet(rows);
      ws["!cols"] = autoColWidths(rows);
      XLSX.utils.book_append_sheet(wb, ws, "Inventario Actual");

      // Hoja de resumen
      const businessName = (user as any).businessName || user.name || "Mi Negocio";
      const now = new Date();
      const resumen = [
        ["REPORTE DE INVENTARIO ACTUAL - CONTAFÁCIL"],
        [""],
        ["Empresa:", businessName],
        ["Fecha del reporte:", formatDate(now)],
        ["Hora:", now.toLocaleTimeString("es-CO")],
        [""],
        ["Método de valuación:", "Costo Promedio Ponderado (CPP)"],
        [""],
        ["RESUMEN"],
        ["Total productos físicos:", inventoryItems.length],
        ["Total unidades en stock:", totalUnidades],
        ["Valor total del inventario (a costo):", totalValorInventario],
      ];
      const wsResumen = XLSX.utils.aoa_to_sheet(resumen);
      wsResumen["!cols"] = [{ wch: 38 }, { wch: 30 }];
      XLSX.utils.book_append_sheet(wb, wsResumen, "Resumen");

      const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
      const today = new Date().toISOString().split("T")[0];
      const filename = `ContaFacil_Inventario_${today}.xlsx`;

      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      res.setHeader("Content-Length", buffer.length);
      return res.send(buffer);
    } catch (error: any) {
      console.error("[Inventario] Error al generar reporte Excel:", error);
      return res.status(500).json({ error: "Error al generar el reporte: " + error.message });
    }
  });
}

// Utilidades
function formatDate(date: any): string {
  if (!date) return "";
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return String(date);
    return d.toLocaleDateString("es-CO", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  } catch {
    return String(date);
  }
}

function formatNumber(value: any): number | string {
  if (value === null || value === undefined || value === "") return "";
  const n = Number(value);
  return isNaN(n) ? "" : n;
}

function autoColWidths(data: any[]): { wch: number }[] {
  if (!data || data.length === 0) return [];
  const keys = Object.keys(data[0]);
  return keys.map((key) => {
    const maxLen = Math.max(
      key.length,
      ...data.slice(0, 100).map((row) => String(row[key] ?? "").length)
    );
    return { wch: Math.min(Math.max(maxLen + 2, 10), 50) };
  });
}
