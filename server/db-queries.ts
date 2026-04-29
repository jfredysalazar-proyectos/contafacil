import { eq, and, desc, gte, lte, sql, or, like } from "drizzle-orm";
import { getDb } from "./db";
import {
  products,
  productVariations,
  inventory,
  customers,
  suppliers,
  sales,
  saleItems,
  saleReturns,
  saleReturnItems,
  expenses,
  receivables,
  payables,
  payments,
  productCategories,
  expenseCategories,
  quotations,
  quotationItems,
  serialNumbers,
  type InsertProduct,
  type InsertProductVariation,
  type InsertInventory,
  type InsertCustomer,
  type InsertSupplier,
  type InsertSale,
  type InsertSaleItem,
  type InsertExpense,
  type InsertReceivable,
  type InsertPayable,
  type InsertPayment,
  type InsertProductCategory,
  type InsertExpenseCategory,
  type InsertQuotation,
  type InsertQuotationItem,
} from "../drizzle/schema";

// ==================== PRODUCTOS ====================

export async function createProduct(data: InsertProduct) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Función auxiliar para convertir strings vacías y undefined a null
  const toNull = (value: any) => {
    if (value === '' || value === undefined || value === null) {
      return null;
    }
    return value;
  };
  
  // Convertir todos los campos opcionales antes del INSERT
  const categoryId = toNull(data.categoryId);
  const description = toNull(data.description);
  const sku = toNull(data.sku);
  const barcode = toNull(data.barcode);
  const cost = toNull(data.cost);
  const imageUrl = toNull(data.imageUrl);
  const promotionalPrice = toNull(data.promotionalPrice);
  
  console.log('DEBUG createProduct:', {
    categoryId,
    barcode,
    description,
    sku,
    cost,
    promotionalPrice
  });
  
  // Generar QR code si hay SKU o después de insertar con el ID
  let qrCode: string | null = null;
  
  // Si hay SKU, generar QR antes de insertar
  if (sku) {
    const { generateProductQRCode } = await import('./qr-generator');
    qrCode = await generateProductQRCode(sku, 0, data.name);
  }
  
  // Usar SQL raw para tener control total del INSERT y evitar que Drizzle incluya 'id'
  const { sql } = await import('drizzle-orm');
  
  let result;
  try {
    console.log('DEBUG: Ejecutando INSERT...');
    result = await db.execute(sql`
      INSERT INTO products (
        userId, categoryId, name, description, sku, barcode, price, cost,
        hasVariations, imageUrl, qrCode, stockControlEnabled, stock, stockAlert,
        sellBy, promotionalPrice, featured, isService
      ) VALUES (
        ${data.userId},
        ${categoryId},
        ${data.name},
        ${description},
        ${sku},
        ${barcode},
        ${data.price},
        ${cost},
        ${data.hasVariations},
        ${imageUrl},
        ${qrCode},
        ${data.stockControlEnabled},
        ${data.stock},
        ${data.stockAlert},
        ${data.sellBy},
        ${promotionalPrice},
        ${data.featured},
        ${data.isService ?? false}
      )
    `);
    console.log('DEBUG: INSERT exitoso, insertId:', result.insertId);
  } catch (error) {
    console.error('ERROR en INSERT:', error);
    console.error('ERROR details:', JSON.stringify(error, null, 2));
    throw error;
  }
  
  // Si no había SKU, generar QR con el ID del producto
  if (!qrCode && result.insertId) {
    const { generateProductQRCode } = await import('./qr-generator');
    const productId = Number(result.insertId);
    qrCode = await generateProductQRCode(null, productId, data.name);
    
    // Actualizar el producto con el QR
    await db
      .update(products)
      .set({ qrCode })
      .where(eq(products.id, productId));
  }
  
  return result;
}

export async function getProductsByUserId(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db
    .select()
    .from(products)
    .where(eq(products.userId, userId))
    .orderBy(desc(products.createdAt));
}

export async function getProductById(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db
    .select()
    .from(products)
    .where(and(eq(products.id, id), eq(products.userId, userId)))
    .limit(1);
  
  return result[0];
}

export async function updateProduct(id: number, userId: number, data: Partial<InsertProduct>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Si se actualiza el SKU o el nombre, regenerar QR
  let updateData = { ...data };
  if (data.sku !== undefined || data.name !== undefined) {
    const product = await getProductById(id, userId);
    if (product) {
      const { generateProductQRCode } = await import('./qr-generator');
      const newSku = data.sku !== undefined ? data.sku : product.sku;
      const newName = data.name !== undefined ? data.name : product.name;
      const qrCode = await generateProductQRCode(newSku, id, newName);
      updateData = { ...updateData, qrCode };
    }
  }
  
  await db
    .update(products)
    .set(updateData)
    .where(and(eq(products.id, id), eq(products.userId, userId)));
}

export async function deleteProduct(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db
    .delete(products)
    .where(and(eq(products.id, id), eq(products.userId, userId)));
}

// ==================== VARIACIONES DE PRODUCTOS ====================

export async function createProductVariation(data: InsertProductVariation) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(productVariations).values(data);
  return result;
}

export async function getProductVariationsByProductId(productId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db
    .select()
    .from(productVariations)
    .where(eq(productVariations.productId, productId));
}

// ==================== INVENTARIO ====================

export async function createOrUpdateInventory(data: InsertInventory) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const existing = await db
    .select()
    .from(inventory)
    .where(
      and(
        eq(inventory.userId, data.userId),
        eq(inventory.productId, data.productId),
        data.variationId ? eq(inventory.variationId, data.variationId) : sql`${inventory.variationId} IS NULL`
      )
    )
    .limit(1);
  
  if (existing.length > 0) {
    await db
      .update(inventory)
      .set({ stock: data.stock, updatedAt: new Date() })
      .where(eq(inventory.id, existing[0].id));
  } else {
    await db.insert(inventory).values(data);
  }
}

export async function getInventoryByUserId(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Obtener solo productos físicos (no servicios) con su stock y costo promedio
  const result = await db
    .select({
      id: inventory.id,
      stock: inventory.stock,
      averageCost: inventory.averageCost,
      lastRestockDate: inventory.lastRestockDate,
      productId: products.id,
      productName: products.name,
      productPrice: products.price,
      productCost: products.cost,
      stockAlert: products.stockAlert,
      sku: products.sku,
      isService: products.isService,
      variationId: productVariations.id,
      variationName: productVariations.name,
    })
    .from(products)
    .leftJoin(inventory, and(
      eq(inventory.productId, products.id),
      eq(inventory.userId, userId)
    ))
    .leftJoin(productVariations, eq(inventory.variationId, productVariations.id))
    .where(and(
      eq(products.userId, userId),
      eq(products.isService, false)   // Solo productos físicos
    ));

  return result.map(item => ({
    ...item,
    stock: item.stock ?? 0,
    averageCost: item.averageCost ? parseFloat(item.averageCost as string) : 0,
  }));
}

export async function getLowStockItems(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db
    .select({
      productId: products.id,
      productName: products.name,
      stock: inventory.stock,
      stockAlert: products.stockAlert,
    })
    .from(inventory)
    .leftJoin(products, eq(inventory.productId, products.id))
    .where(
      and(
        eq(inventory.userId, userId),
        sql`${inventory.stock} <= ${products.stockAlert}`
      )
    );
}

// ==================== CLIENTES ====================

export async function createCustomer(data: InsertCustomer) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Validar que no exista otro cliente con el mismo email, phone o idNumber
  if (data.email) {
    const existingByEmail = await db
      .select()
      .from(customers)
      .where(and(eq(customers.email, data.email), eq(customers.userId, data.userId)))
      .limit(1);
    if (existingByEmail.length > 0) {
      throw new Error("Ya existe un cliente con este email");
    }
  }
  
  if (data.phone) {
    const existingByPhone = await db
      .select()
      .from(customers)
      .where(and(eq(customers.phone, data.phone), eq(customers.userId, data.userId)))
      .limit(1);
    if (existingByPhone.length > 0) {
      throw new Error("Ya existe un cliente con este teléfono");
    }
  }
  
  if (data.idNumber) {
    const existingByIdNumber = await db
      .select()
      .from(customers)
      .where(and(eq(customers.idNumber, data.idNumber), eq(customers.userId, data.userId)))
      .limit(1);
    if (existingByIdNumber.length > 0) {
      throw new Error("Ya existe un cliente con esta cédula/NIT");
    }
  }
  
  const result = await db.insert(customers).values(data);
  const insertId = result.insertId;
  
  // Devolver el cliente creado con su ID
  const newCustomer = await db
    .select()
    .from(customers)
    .where(eq(customers.id, insertId))
    .limit(1);
  
  return newCustomer[0];
}

export async function getCustomersByUserId(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db
    .select()
    .from(customers)
    .where(eq(customers.userId, userId))
    .orderBy(desc(customers.createdAt));
}

export async function getCustomerById(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db
    .select()
    .from(customers)
    .where(and(eq(customers.id, id), eq(customers.userId, userId)))
    .limit(1);
  
  return result[0];
}

export async function getCustomerByIdNumber(idNumber: string, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db
    .select()
    .from(customers)
    .where(and(eq(customers.idNumber, idNumber), eq(customers.userId, userId)))
    .limit(1);
  
  return result[0] || null;
}

export async function updateCustomer(id: number, userId: number, data: Partial<InsertCustomer>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db
    .update(customers)
    .set(data)
    .where(and(eq(customers.id, id), eq(customers.userId, userId)));
}

export async function deleteCustomer(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db
    .delete(customers)
    .where(and(eq(customers.id, id), eq(customers.userId, userId)));
}

// ==================== PROVEEDORES ====================

export async function createSupplier(data: InsertSupplier) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(suppliers).values(data);
  return result;
}

export async function getSuppliersByUserId(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db
    .select()
    .from(suppliers)
    .where(eq(suppliers.userId, userId))
    .orderBy(desc(suppliers.createdAt));
}

export async function getSupplierById(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db
    .select()
    .from(suppliers)
    .where(and(eq(suppliers.id, id), eq(suppliers.userId, userId)))
    .limit(1);
  
  return result[0];
}

export async function updateSupplier(id: number, userId: number, data: Partial<InsertSupplier>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db
    .update(suppliers)
    .set(data)
    .where(and(eq(suppliers.id, id), eq(suppliers.userId, userId)));
}

export async function deleteSupplier(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db
    .delete(suppliers)
    .where(and(eq(suppliers.id, id), eq(suppliers.userId, userId)));
}

// ==================== VENTAS ====================

export async function createSale(saleData: InsertSale, items: Omit<InsertSaleItem, 'saleId'>[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Insertar venta
  const saleResult = await db.insert(sales).values(saleData);
  const saleId = Number(saleResult[0].insertId);

  // Capturar el CPP actual de cada producto para COGS y guardar en saleItems.unitCost
  const itemsWithCost = await Promise.all(
    items.map(async (item) => {
      const invRecord = await db
        .select({ averageCost: inventory.averageCost })
        .from(inventory)
        .where(eq(inventory.productId, item.productId))
        .limit(1);
      const unitCostValue = invRecord[0]?.averageCost
        ? parseFloat(invRecord[0].averageCost as string)
        : 0;
      return { ...item, saleId, unitCost: String(unitCostValue) };
    })
  );
  await db.insert(saleItems).values(itemsWithCost);

  // Actualizar inventario (stock)
  for (const item of items) {
    const inventoryRecord = await db
      .select()
      .from(inventory)
      .where(
        and(
          eq(inventory.productId, item.productId),
          item.variationId
            ? eq(inventory.variationId, item.variationId)
            : sql`${inventory.variationId} IS NULL`
        )
      )
      .limit(1);

    if (inventoryRecord.length > 0) {
      const newStock = inventoryRecord[0].stock - item.quantity;
      await db
        .update(inventory)
        .set({ stock: newStock })
        .where(eq(inventory.id, inventoryRecord[0].id));
    }
  }

  return saleId;
}

export async function getSaleItemsBySaleId(saleId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Verificar que la venta pertenece al usuario
  const sale = await db
    .select()
    .from(sales)
    .where(and(eq(sales.id, saleId), eq(sales.userId, userId)))
    .limit(1);
  
  if (sale.length === 0) {
    throw new Error("Sale not found or unauthorized");
  }
  
  const items = await db
    .select()
    .from(saleItems)
    .where(eq(saleItems.saleId, saleId));
  
  // Obtener seriales para cada item
  const serials = await getSerialNumbersBySaleId(saleId, userId);
  
  // Agrupar seriales por productId
  const serialsByProduct = serials.reduce((acc: any, serial: any) => {
    if (!acc[serial.productId]) {
      acc[serial.productId] = [];
    }
    acc[serial.productId].push(serial.serialNumber);
    return acc;
  }, {});
  
  // Agregar seriales a los items
  const itemsWithSerials = items.map((item: any) => ({
    ...item,
    serialNumbers: serialsByProduct[item.productId]?.join(', ') || undefined,
  }));
  
  return itemsWithSerials;
}

export async function getSalesByUserId(userId: number, startDate?: Date, endDate?: Date) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const conditions = [eq(sales.userId, userId)];

  if (startDate && endDate) {
    conditions.push(gte(sales.saleDate, startDate));
    conditions.push(lte(sales.saleDate, endDate));
  }

  const rows = await db
    .select({
      id: sales.id,
      userId: sales.userId,
      customerId: sales.customerId,
      customerName: customers.name,
      saleNumber: sales.saleNumber,
      saleDate: sales.saleDate,
      subtotal: sales.subtotal,
      tax: sales.tax,
      discount: sales.discount,
      total: sales.total,
      paymentMethod: sales.paymentMethod,
      status: sales.status,
      notes: sales.notes,
      createdAt: sales.createdAt,
      updatedAt: sales.updatedAt,
    })
    .from(sales)
    .leftJoin(customers, eq(sales.customerId, customers.id))
    .where(and(...conditions))
    .orderBy(desc(sales.saleDate));

  return rows;
}

export async function getSaleById(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const sale = await db
    .select()
    .from(sales)
    .where(and(eq(sales.id, id), eq(sales.userId, userId)))
    .limit(1);
  
  if (sale.length === 0) return null;
  
  const items = await db
    .select()
    .from(saleItems)
    .where(eq(saleItems.saleId, id));
  
  // Obtener seriales para cada item
  const serials = await getSerialNumbersBySaleId(id, userId);
  
  // Agrupar seriales por productId
  const serialsByProduct = serials.reduce((acc: any, serial: any) => {
    if (!acc[serial.productId]) {
      acc[serial.productId] = [];
    }
    acc[serial.productId].push(serial.serialNumber);
    return acc;
  }, {});
  
  // Agregar seriales a los items
  const itemsWithSerials = items.map((item: any) => ({
    ...item,
    serialNumbers: serialsByProduct[item.productId]?.join(', ') || undefined,
  }));
  
  return { ...sale[0], items: itemsWithSerials };
}

export async function updateSale(
  id: number,
  userId: number,
  data: Partial<Omit<InsertSale, 'userId'>>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Verificar que la venta pertenece al usuario
  const sale = await db
    .select()
    .from(sales)
    .where(and(eq(sales.id, id), eq(sales.userId, userId)))
    .limit(1);
  
  if (sale.length === 0) {
    throw new Error("Sale not found or unauthorized");
  }
  
  await db
    .update(sales)
    .set(data)
    .where(eq(sales.id, id));
}

export async function updateSaleItems(
  saleId: number,
  userId: number,
  items: Omit<InsertSaleItem, 'saleId'>[]
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Verificar que la venta pertenece al usuario
  const sale = await db
    .select()
    .from(sales)
    .where(and(eq(sales.id, saleId), eq(sales.userId, userId)))
    .limit(1);
  
  if (sale.length === 0) {
    throw new Error("Sale not found or unauthorized");
  }
  
  // Obtener items antiguos para restaurar inventario
  const oldItems = await db
    .select()
    .from(saleItems)
    .where(eq(saleItems.saleId, saleId));
  
  // Restaurar inventario de items antiguos (registrar como entrada)
  for (const item of oldItems) {
    await addInventoryMovement({
      userId,
      productId: item.productId,
      variationId: item.variationId || undefined,
      saleId,
      movementType: "in",
      quantity: item.quantity,
      reason: "Edición de venta - devolución",
      notes: `Venta #${saleId} editada`,
    });
  }
  
  // Eliminar items antiguos
  await db.delete(saleItems).where(eq(saleItems.saleId, saleId));
  
  // Insertar nuevos items
  const itemsWithSaleId = items.map(item => ({ ...item, saleId }));
  await db.insert(saleItems).values(itemsWithSaleId);
  
  // Actualizar inventario con nuevos items (registrar como salida)
  for (const item of items) {
    await addInventoryMovement({
      userId,
      productId: item.productId,
      variationId: item.variationId || undefined,
      saleId,
      movementType: "out",
      quantity: item.quantity,
      reason: "Edición de venta - nueva salida",
      notes: `Venta #${saleId} editada`,
    });
  }
}

export async function deleteSale(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Verificar que la venta pertenece al usuario
  const sale = await db
    .select()
    .from(sales)
    .where(and(eq(sales.id, id), eq(sales.userId, userId)))
    .limit(1);
  
  if (sale.length === 0) {
    throw new Error("Sale not found or unauthorized");
  }
  
  // Obtener items para restaurar inventario
  const items = await db
    .select()
    .from(saleItems)
    .where(eq(saleItems.saleId, id));
  
  // Restaurar inventario
  for (const item of items) {
    const inventoryRecord = await db
      .select()
      .from(inventory)
      .where(
        and(
          eq(inventory.productId, item.productId),
          item.variationId 
            ? eq(inventory.variationId, item.variationId)
            : sql`${inventory.variationId} IS NULL`
        )
      )
      .limit(1);
    
    if (inventoryRecord.length > 0) {
      const newStock = inventoryRecord[0].stock + item.quantity;
      await db
        .update(inventory)
        .set({ stock: newStock })
        .where(eq(inventory.id, inventoryRecord[0].id));
    }
  }
  
  // Eliminar items
  await db.delete(saleItems).where(eq(saleItems.saleId, id));
  
  // Eliminar venta
  await db.delete(sales).where(eq(sales.id, id));
}

// ==================== GASTOS ====================

export async function createExpense(data: InsertExpense) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(expenses).values(data);
  return result;
}

export async function getExpensesByUserId(userId: number, startDate?: Date, endDate?: Date) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const conditions = [eq(expenses.userId, userId)];
  
  if (startDate && endDate) {
    conditions.push(gte(expenses.expenseDate, startDate));
    conditions.push(lte(expenses.expenseDate, endDate));
  }
  
  return await db
    .select()
    .from(expenses)
    .where(and(...conditions))
    .orderBy(desc(expenses.expenseDate));
}

export async function getExpenseById(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db
    .select()
    .from(expenses)
    .where(and(eq(expenses.id, id), eq(expenses.userId, userId)))
    .limit(1);
  
  return result[0];
}

export async function updateExpense(id: number, userId: number, data: Partial<InsertExpense>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db
    .update(expenses)
    .set(data)
    .where(and(eq(expenses.id, id), eq(expenses.userId, userId)));
}

export async function deleteExpense(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db
    .delete(expenses)
    .where(and(eq(expenses.id, id), eq(expenses.userId, userId)));
}

// ==================== DEUDAS POR COBRAR ====================

export async function createReceivable(data: InsertReceivable) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(receivables).values(data);
  return result;
}

export async function getReceivablesByUserId(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db
    .select({
      id: receivables.id,
      userId: receivables.userId,
      customerId: receivables.customerId,
      customerName: customers.name,
      saleId: receivables.saleId,
      saleNumber: sales.saleNumber,
      amount: receivables.amount,
      paidAmount: receivables.paidAmount,
      remainingAmount: receivables.remainingAmount,
      dueDate: receivables.dueDate,
      status: receivables.status,
      notes: receivables.notes,
      createdAt: receivables.createdAt,
      updatedAt: receivables.updatedAt,
    })
    .from(receivables)
    .leftJoin(customers, eq(receivables.customerId, customers.id))
    .leftJoin(sales, eq(receivables.saleId, sales.id))
    .where(eq(receivables.userId, userId))
    .orderBy(desc(receivables.createdAt));
}

// ==================== DEUDAS POR PAGAR ====================

export async function createPayable(data: InsertPayable) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(payables).values(data);
  return result;
}

export async function getPayablesByUserId(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db
    .select({
      id: payables.id,
      userId: payables.userId,
      supplierId: payables.supplierId,
      supplierName: suppliers.name,
      expenseId: payables.expenseId,
      amount: payables.amount,
      paidAmount: payables.paidAmount,
      remainingAmount: payables.remainingAmount,
      dueDate: payables.dueDate,
      status: payables.status,
      notes: payables.notes,
      createdAt: payables.createdAt,
      updatedAt: payables.updatedAt,
    })
    .from(payables)
    .leftJoin(suppliers, eq(payables.supplierId, suppliers.id))
    .where(eq(payables.userId, userId))
    .orderBy(desc(payables.createdAt));
}

// ==================== PAGOS ====================

export async function createPayment(data: InsertPayment) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(payments).values(data);
  
  // Actualizar deuda correspondiente
  if (data.receivableId) {
    const receivable = await db
      .select()
      .from(receivables)
      .where(eq(receivables.id, data.receivableId))
      .limit(1);
    
    if (receivable.length > 0) {
      const newPaidAmount = Number(receivable[0].paidAmount) + Number(data.amount);
      const newRemainingAmount = Number(receivable[0].amount) - newPaidAmount;
      const newStatus = newRemainingAmount <= 0 ? "paid" : newRemainingAmount < Number(receivable[0].amount) ? "partial" : "pending";
      
      await db
        .update(receivables)
        .set({
          paidAmount: newPaidAmount.toString(),
          remainingAmount: newRemainingAmount.toString(),
          status: newStatus,
        })
        .where(eq(receivables.id, data.receivableId));
    }
  }
  
  if (data.payableId) {
    const payable = await db
      .select()
      .from(payables)
      .where(eq(payables.id, data.payableId))
      .limit(1);
    
    if (payable.length > 0) {
      const newPaidAmount = Number(payable[0].paidAmount) + Number(data.amount);
      const newRemainingAmount = Number(payable[0].amount) - newPaidAmount;
      const newStatus = newRemainingAmount <= 0 ? "paid" : newRemainingAmount < Number(payable[0].amount) ? "partial" : "pending";
      
      await db
        .update(payables)
        .set({
          paidAmount: newPaidAmount.toString(),
          remainingAmount: newRemainingAmount.toString(),
          status: newStatus,
        })
        .where(eq(payables.id, data.payableId));
    }
  }
  
  return result;
}

// ==================== CATEGORÍAS ====================

export async function createProductCategory(data: InsertProductCategory) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(productCategories).values(data);
  return result;
}

export async function getProductCategoriesByUserId(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db
    .select()
    .from(productCategories)
    .where(eq(productCategories.userId, userId));
}

export async function createExpenseCategory(data: InsertExpenseCategory) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(expenseCategories).values(data);
  return result;
}

export async function getExpenseCategoriesByUserId(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db
    .select()
    .from(expenseCategories)
    .where(eq(expenseCategories.userId, userId));
}

// ==================== ESTADÍSTICAS ====================

export async function getSalesStatistics(userId: number, startDate: Date, endDate: Date) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const salesData = await db
    .select()
    .from(sales)
    .where(
      and(
        eq(sales.userId, userId),
        gte(sales.saleDate, startDate),
        lte(sales.saleDate, endDate)
      )
    );
  
  const totalSales = salesData.reduce((sum, sale) => sum + Number(sale.total), 0);
  const salesCount = salesData.length;
  
  return {
    totalSales,
    salesCount,
    averageSale: salesCount > 0 ? totalSales / salesCount : 0,
  };
}

export async function getTopSellingProducts(userId: number, limit: number = 10) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db
    .select({
      productId: saleItems.productId,
      productName: saleItems.productName,
      totalQuantity: sql<number>`SUM(${saleItems.quantity})`,
      totalRevenue: sql<number>`SUM(${saleItems.subtotal})`,
    })
    .from(saleItems)
    .innerJoin(sales, eq(saleItems.saleId, sales.id))
    .where(eq(sales.userId, userId))
    .groupBy(saleItems.productId, saleItems.productName)
    .orderBy(desc(sql`SUM(${saleItems.quantity})`))
    .limit(limit);
  
  return result;
}

export async function getExpensesByCategory(userId: number, startDate: Date, endDate: Date) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db
    .select({
      categoryId: expenses.categoryId,
      categoryName: expenseCategories.name,
      totalAmount: sql<number>`SUM(${expenses.amount})`,
      count: sql<number>`COUNT(*)`,
    })
    .from(expenses)
    .leftJoin(expenseCategories, eq(expenses.categoryId, expenseCategories.id))
    .where(
      and(
        eq(expenses.userId, userId),
        gte(expenses.expenseDate, startDate),
        lte(expenses.expenseDate, endDate)
      )
    )
    .groupBy(expenses.categoryId, expenseCategories.name);
  
  return result;
}

export async function getExpensesBySupplier(userId: number, startDate: Date, endDate: Date) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db
    .select({
      supplierId: expenses.supplierId,
      supplierName: suppliers.name,
      totalAmount: sql<number>`SUM(${expenses.amount})`,
      count: sql<number>`COUNT(*)`,
    })
    .from(expenses)
    .leftJoin(suppliers, eq(expenses.supplierId, suppliers.id))
    .where(
      and(
        eq(expenses.userId, userId),
        gte(expenses.expenseDate, startDate),
        lte(expenses.expenseDate, endDate)
      )
    )
    .groupBy(expenses.supplierId, suppliers.name)
    .orderBy(sql`SUM(${expenses.amount}) DESC`);
  
  return result;
}

// ==================== MOVIMIENTOS DE INVENTARIO ====================

export async function getInventoryByProductId(productId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db
    .select()
    .from(inventory)
    .where(and(
      eq(inventory.productId, productId),
      eq(inventory.userId, userId)
    ))
    .limit(1);
  
  return result[0];
}

export async function updateInventoryStock(productId: number, userId: number, newStock: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Verificar si existe un registro de inventario para este producto
  const existing = await getInventoryByProductId(productId, userId);
  
  if (existing) {
    // Actualizar stock existente
    await db
      .update(inventory)
      .set({ 
        stock: newStock,
        lastRestockDate: new Date(),
      })
      .where(and(
        eq(inventory.productId, productId),
        eq(inventory.userId, userId)
      ));
  } else {
    // Crear nuevo registro de inventario
    await db.insert(inventory).values({
      userId,
      productId,
      stock: newStock,
      lastRestockDate: new Date(),
    });
  }
}

export async function addInventoryMovement(data: {
  userId: number;
  productId: number;
  variationId?: number;
  supplierId?: number;
  saleId?: number;
  movementType: "in" | "out" | "adjustment";
  quantity: number;
  unitCost?: number;
  totalCost?: number;
  reason?: string;
  notes?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Obtener estado actual del inventario
  const currentInventory = await getInventoryByProductId(data.productId, data.userId);
  const currentStock = currentInventory?.stock || 0;
  const currentAvgCost = parseFloat((currentInventory as any)?.averageCost ?? "0") || 0;

  // Calcular nuevo stock
  let newStock = currentStock;
  if (data.movementType === "in") {
    newStock = currentStock + data.quantity;
  } else if (data.movementType === "out") {
    newStock = Math.max(0, currentStock - data.quantity);
  } else if (data.movementType === "adjustment") {
    newStock = data.quantity;
  }

  // ─── Costo Promedio Ponderado (CPP) ───────────────────────────────────────
  // Solo se recalcula en entradas con costo unitario informado y para productos
  // físicos (los servicios nunca llegan aquí con movementType "in" desde ventas).
  // Fórmula: CPP_nuevo = (stock_actual × CPP_actual + cantidad_nueva × costo_nuevo)
  //                      ÷ (stock_actual + cantidad_nueva)
  let newAvgCost = currentAvgCost;
  if (data.movementType === "in" && data.unitCost && data.unitCost > 0) {
    const totalValueBefore = currentStock * currentAvgCost;
    const totalValueNew = data.quantity * data.unitCost;
    const totalUnits = currentStock + data.quantity;
    newAvgCost = totalUnits > 0 ? (totalValueBefore + totalValueNew) / totalUnits : data.unitCost;
  }
  // ──────────────────────────────────────────────────────────────────────────

  // Calcular totalCost si no viene informado
  const totalCost = data.totalCost ?? (data.unitCost ? data.unitCost * data.quantity : undefined);

  // Insertar movimiento
  await db.execute(sql`
    INSERT INTO inventoryMovements (
      userId, productId, variationId, supplierId, saleId,
      movementType, quantity, unitCost, totalCost, stockAfter, reason, notes
    ) VALUES (
      ${data.userId}, ${data.productId}, ${data.variationId ?? null}, ${data.supplierId ?? null}, ${data.saleId ?? null},
      ${data.movementType}, ${data.quantity}, ${data.unitCost ?? null}, ${totalCost ?? null}, ${newStock}, ${data.reason ?? null}, ${data.notes ?? null}
    )
  `);

  // Actualizar stock y costo promedio en la tabla inventory
  const existing = await getInventoryByProductId(data.productId, data.userId);
  if (existing) {
    await db.execute(sql`
      UPDATE inventory
      SET stock = ${newStock},
          averageCost = ${newAvgCost},
          lastRestockDate = ${data.movementType === "in" ? new Date() : (existing as any).lastRestockDate}
      WHERE productId = ${data.productId} AND userId = ${data.userId}
    `);
  } else {
    await db.execute(sql`
      INSERT INTO inventory (userId, productId, stock, averageCost, lastRestockDate)
      VALUES (${data.userId}, ${data.productId}, ${newStock}, ${newAvgCost}, ${new Date()})
    `);
  }

  // Sincronizar stock en la tabla products
  await db.execute(sql`
    UPDATE products
    SET stock = ${newStock},
        cost = CASE WHEN ${newAvgCost} > 0 THEN ${newAvgCost} ELSE cost END
    WHERE id = ${data.productId} AND userId = ${data.userId}
  `);

  return { success: true, newStock, newAvgCost };
}

export async function getInventoryMovementsByProductId(productId: number, userId: number, limit: number = 50) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.execute(sql`
    SELECT 
      im.id,
      im.userId,
      im.productId,
      im.variationId,
      im.supplierId,
      im.saleId,
      im.movementType,
      im.quantity,
      im.unitCost,
      im.totalCost,
      im.stockAfter,
      im.reason,
      im.notes,
      im.createdAt,
      p.name AS productName,
      s.name AS supplierName
    FROM inventoryMovements im
    LEFT JOIN products p ON im.productId = p.id
    LEFT JOIN suppliers s ON im.supplierId = s.id
    WHERE im.productId = ${productId} AND im.userId = ${userId}
    ORDER BY im.createdAt DESC
    LIMIT ${limit}
  `);
  
  // db.execute() con MySQL2 devuelve [rows, fields]. Extraer solo las filas.
  const rows = Array.isArray((result as any)[0]) ? (result as any)[0] : result;
  return rows as any[];
}

export async function getInventoryMovementsByUserId(userId: number, limit: number = 100) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.execute(sql`
    SELECT 
      im.*,
      p.name as productName,
      s.name as supplierName
    FROM inventoryMovements im
    LEFT JOIN products p ON im.productId = p.id
    LEFT JOIN suppliers s ON im.supplierId = s.id
    WHERE im.userId = ${userId}
    ORDER BY im.createdAt DESC
    LIMIT ${limit}
  `);
  
  // db.execute() con MySQL2 devuelve [rows, fields]. Extraer solo las filas.
  const rows2 = Array.isArray((result as any)[0]) ? (result as any)[0] : result;
  return rows2 as any[];
}

export async function getLowStockProducts(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db
    .select({
      id: products.id,
      name: products.name,
      sku: products.sku,
      stock: inventory.stock,
      stockAlert: products.stockAlert,
    })
    .from(products)
    .innerJoin(inventory, and(
      eq(inventory.productId, products.id),
      eq(inventory.userId, userId)
    ))
    .where(and(
      eq(products.userId, userId),
      sql`${inventory.stock} <= ${products.stockAlert}`
    ))
    .orderBy(inventory.stock);
  
  return result;
}

// ==================== COTIZACIONES ====================

export async function createQuotation(
  data: InsertQuotation,
  items: Omit<InsertQuotationItem, 'quotationId'>[]
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Insertar cotización
  const quotationResult = await db.insert(quotations).values(data);
  const quotationId = Number(quotationResult[0].insertId);
  
  // Insertar items de cotización
  const itemsWithQuotationId = items.map(item => ({ ...item, quotationId }));
  await db.insert(quotationItems).values(itemsWithQuotationId);
  
  return quotationId;
}

export async function getQuotationsByUserId(userId: number, status?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const conditions = [eq(quotations.userId, userId)];
  
  if (status) {
    conditions.push(eq(quotations.status, status as any));
  }
  
  return await db
    .select()
    .from(quotations)
    .where(and(...conditions))
    .orderBy(desc(quotations.quotationDate));
}

export async function getQuotationById(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const quotation = await db
    .select()
    .from(quotations)
    .where(and(eq(quotations.id, id), eq(quotations.userId, userId)))
    .limit(1);
  
  if (quotation.length === 0) return null;
  
  const items = await db
    .select()
    .from(quotationItems)
    .where(eq(quotationItems.quotationId, id));
  
  return { ...quotation[0], items };
}

export async function updateQuotation(
  id: number,
  userId: number,
  data: Partial<Omit<InsertQuotation, 'userId'>>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Verificar que la cotización pertenece al usuario
  const quotation = await db
    .select()
    .from(quotations)
    .where(and(eq(quotations.id, id), eq(quotations.userId, userId)))
    .limit(1);
  
  if (quotation.length === 0) {
    throw new Error("Quotation not found or unauthorized");
  }
  
  await db
    .update(quotations)
    .set(data)
    .where(eq(quotations.id, id));
}

export async function deleteQuotation(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Verificar que la cotización pertenece al usuario
  const quotation = await db
    .select()
    .from(quotations)
    .where(and(eq(quotations.id, id), eq(quotations.userId, userId)))
    .limit(1);
  
  if (quotation.length === 0) {
    throw new Error("Quotation not found or unauthorized");
  }
  
  // Eliminar items primero
  await db
    .delete(quotationItems)
    .where(eq(quotationItems.quotationId, id));
  
  // Eliminar cotización
  await db
    .delete(quotations)
    .where(eq(quotations.id, id));
}

export async function getQuotationItemsByQuotationId(quotationId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Verificar que la cotización pertenece al usuario
  const quotation = await db
    .select()
    .from(quotations)
    .where(and(eq(quotations.id, quotationId), eq(quotations.userId, userId)))
    .limit(1);
  
  if (quotation.length === 0) {
    throw new Error("Quotation not found or unauthorized");
  }
  
  return await db
    .select()
    .from(quotationItems)
    .where(eq(quotationItems.quotationId, quotationId));
}

export async function updateQuotationItems(
  quotationId: number,
  userId: number,
  items: Omit<InsertQuotationItem, 'quotationId'>[]
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Verificar que la cotización pertenece al usuario
  const quotation = await db
    .select()
    .from(quotations)
    .where(and(eq(quotations.id, quotationId), eq(quotations.userId, userId)))
    .limit(1);
  
  if (quotation.length === 0) {
    throw new Error("Quotation not found or unauthorized");
  }
  
  // Eliminar items antiguos
  await db
    .delete(quotationItems)
    .where(eq(quotationItems.quotationId, quotationId));
  
  // Insertar nuevos items
  const itemsWithQuotationId = items.map(item => ({ ...item, quotationId }));
  await db.insert(quotationItems).values(itemsWithQuotationId);
}

export async function convertQuotationToSale(
  quotationId: number,
  userId: number,
  saleData: {
    saleNumber: string;
    saleDate: Date;
    paymentMethod: 'cash' | 'card' | 'transfer' | 'credit';
    status?: 'completed' | 'pending' | 'cancelled';
    notes?: string;
  }
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Obtener cotización con items
  const quotation = await getQuotationById(quotationId, userId);
  if (!quotation) {
    throw new Error("Quotation not found");
  }
  
  if (quotation.status === 'converted') {
    throw new Error("Quotation already converted to sale");
  }
  
  // Crear venta
  const saleId = await createSale(
    {
      userId,
      customerId: quotation.customerId || undefined,
      saleNumber: saleData.saleNumber,
      saleDate: saleData.saleDate,
      subtotal: quotation.subtotal,
      tax: quotation.tax,
      discount: quotation.discount,
      total: quotation.total,
      paymentMethod: saleData.paymentMethod,
      status: saleData.status || 'completed',
      notes: saleData.notes || quotation.notes || undefined,
    },
    quotation.items.map(item => ({
      productId: item.productId,
      variationId: item.variationId || undefined,
      productName: item.productName,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      subtotal: item.subtotal,
    }))
  );
  
  // Actualizar cotización como convertida
  await updateQuotation(quotationId, userId, {
    status: 'converted',
    convertedToSaleId: saleId,
  });
  
  return saleId;
}

// ==================== NÚMEROS DE SERIE ====================

export async function createSerialNumber(data: {
  userId: number;
  serialNumber: string;
  productId: number;
  productName: string;
  saleId: number;
  saleNumber: string;
  customerId?: number;
  customerName?: string;
  saleDate: Date;
  warrantyDays?: number; // Días de garantía
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Validar campos requeridos
  if (!data.userId) throw new Error("userId is required");
  if (!data.serialNumber) throw new Error("serialNumber is required");
  if (!data.productId) throw new Error("productId is required");
  if (!data.productName) throw new Error("productName is required");
  if (!data.saleId) throw new Error("saleId is required");
  if (!data.saleNumber) throw new Error("saleNumber is required");
  if (!data.saleDate) throw new Error("saleDate is required");
  
  // Convertir saleDate a Date si no lo es
  let saleDateObj: Date;
  if (data.saleDate instanceof Date) {
    saleDateObj = data.saleDate;
  } else {
    saleDateObj = new Date(data.saleDate);
  }
  
  // Validar que sea una fecha válida
  if (!saleDateObj || isNaN(saleDateObj.getTime())) {
    throw new Error(`Invalid saleDate: ${data.saleDate}`);
  }
  
  // DEBUG: Log de todos los valores antes del INSERT
  console.log('🔍 DEBUG createSerialNumber - Datos recibidos:', {
    userId: data.userId,
    serialNumber: data.serialNumber,
    productId: data.productId,
    productName: data.productName,
    saleId: data.saleId,
    saleNumber: data.saleNumber,
    customerId: data.customerId,
    customerName: data.customerName,
    saleDate: data.saleDate,
    warrantyDays: data.warrantyDays, // ✅ NUEVO
    saleDateObj,
    saleDateObjType: typeof saleDateObj,
    isValidDate: !isNaN(saleDateObj.getTime()),
  });
  
  // Usar Drizzle ORM en lugar de db.execute para manejar correctamente los valores null
  // timestamp() en Drizzle requiere un objeto Date, NO un string
  try {
    const [result] = await db.insert(serialNumbers).values({
      userId: data.userId,
      serialNumber: data.serialNumber,
      productId: data.productId,
      productName: data.productName,
      saleId: data.saleId,
      saleNumber: data.saleNumber,
      customerId: data.customerId || null,
      customerName: data.customerName || null,
      saleDate: saleDateObj,
      warrantyDays: data.warrantyDays || 90, // Días de garantía (por defecto 90)
      createdAt: new Date(), // Especificar explícitamente para evitar error de 'default'
    });
    
    console.log('✅ Serial number insertado exitosamente con Drizzle ORM');
    return (result as any).insertId;
  } catch (error: any) {
    console.error('❌ ERROR al insertar serial number con Drizzle:');
    console.error('  Mensaje:', error.message);
    console.error('  Error completo:', error);
    throw error;
  }
}

export async function getSerialNumbersByUserId(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  try {
    const rows = await db
      .select()
      .from(serialNumbers)
      .where(eq(serialNumbers.userId, userId))
      .orderBy(desc(serialNumbers.saleDate));
    return rows;
  } catch (error: any) {
    if (
      error?.message?.includes("serial_numbers") ||
      error?.code === "ER_NO_SUCH_TABLE" ||
      error?.errno === 1146
    ) {
      console.warn("[getSerialNumbersByUserId] Tabla serial_numbers no disponible:", error.message);
      return [];
    }
    throw error;
  }
}

export async function searchSerialNumber(userId: number, serialNumber: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  try {
    const rows = await db
      .select()
      .from(serialNumbers)
      .where(
        and(
          eq(serialNumbers.userId, userId),
          like(serialNumbers.serialNumber, `%${serialNumber}%`)
        )
      )
      .orderBy(desc(serialNumbers.saleDate));
    return rows as any[];
  } catch (error: any) {
    if (
      error?.message?.includes("serial_numbers") ||
      error?.code === "ER_NO_SUCH_TABLE" ||
      error?.errno === 1146
    ) {
      console.warn("[searchSerialNumber] Tabla serial_numbers no disponible:", error.message);
      return [];
    }
    throw error;
  }
}

export async function getSerialNumbersBySaleId(saleId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  try {
    const rows = await db
      .select()
      .from(serialNumbers)
      .where(
        and(
          eq(serialNumbers.userId, userId),
          eq(serialNumbers.saleId, saleId)
        )
      );
    return rows;
  } catch (error: any) {
    // Si la tabla no existe (tabla pendiente de migración), devolver array vacío
    // para no interrumpir la generación de PDF ni la carga de items de venta
    if (
      error?.message?.includes("serial_numbers") ||
      error?.code === "ER_NO_SUCH_TABLE" ||
      error?.errno === 1146
    ) {
      console.warn("[getSerialNumbersBySaleId] Tabla serial_numbers no disponible, devolviendo vacío:", error.message);
      return [];
    }
    throw error;
  }
}

// ==================== DEVOLUCIONES DE VENTAS ====================

export async function createSaleReturn(data: {
  userId: number;
  saleId: number;
  returnNumber: string;
  returnDate: Date;
  reason?: string;
  notes?: string;
  items: Array<{
    saleItemId: number;
    productId: number;
    productName: string;
    quantity: number;
    unitPrice: number;
    unitCost: number;
    subtotal: number;
    restockInventory: boolean;
  }>;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Verificar que la venta pertenece al usuario
  const sale = await db
    .select()
    .from(sales)
    .where(and(eq(sales.id, data.saleId), eq(sales.userId, data.userId)))
    .limit(1);
  if (sale.length === 0) throw new Error("Venta no encontrada o sin autorización");

  // Calcular total de reembolso
  const totalRefund = data.items.reduce((acc, item) => acc + item.subtotal, 0);

  // Insertar la devolución
  const returnResult = await db.execute(sql`
    INSERT INTO saleReturns (userId, saleId, returnNumber, returnDate, reason, notes, totalRefund, status)
    VALUES (
      ${data.userId}, ${data.saleId}, ${data.returnNumber}, ${data.returnDate},
      ${data.reason ?? null}, ${data.notes ?? null}, ${totalRefund}, 'completed'
    )
  `);
  const returnId = Number((returnResult as any)[0].insertId);

  // Insertar items de devolución y reintegrar stock si aplica
  for (const item of data.items) {
    await db.execute(sql`
      INSERT INTO saleReturnItems (returnId, saleItemId, productId, productName, quantity, unitPrice, unitCost, subtotal, restockInventory)
      VALUES (
        ${returnId}, ${item.saleItemId}, ${item.productId}, ${item.productName},
        ${item.quantity}, ${item.unitPrice}, ${item.unitCost}, ${item.subtotal}, ${item.restockInventory}
      )
    `);

    // Reintegrar stock al inventario si el producto es físico y se marcó para restock
    if (item.restockInventory) {
      // El CPP no cambia en devoluciones de clientes: el producto regresa al mismo costo
      // con el que salió, por lo que el CPP promedio se mantiene igual.
      await addInventoryMovement({
        userId: data.userId,
        productId: item.productId,
        movementType: "in",
        quantity: item.quantity,
        unitCost: item.unitCost > 0 ? item.unitCost : undefined,
        reason: "Devolución de cliente",
        notes: `Devolución ${data.returnNumber} - Venta #${data.saleId}`,
      });
    }
  }

  return { success: true, returnId, totalRefund };
}

export async function getSaleReturnsByUserId(userId: number, limit = 100) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.execute(sql`
    SELECT
      sr.*,
      s.saleNumber,
      c.name AS customerName
    FROM saleReturns sr
    LEFT JOIN sales s ON sr.saleId = s.id
    LEFT JOIN customers c ON s.customerId = c.id
    WHERE sr.userId = ${userId}
    ORDER BY sr.returnDate DESC
    LIMIT ${limit}
  `);
  const returnRows = Array.isArray((result as any)[0]) ? (result as any)[0] : result;
  return returnRows as any[];
}

export async function getSaleReturnsBySaleId(saleId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.execute(sql`
    SELECT sr.*, sri.*,
      sr.id AS returnId, sr.returnNumber, sr.returnDate, sr.totalRefund, sr.reason, sr.notes
    FROM saleReturns sr
    JOIN saleReturnItems sri ON sri.returnId = sr.id
    WHERE sr.saleId = ${saleId} AND sr.userId = ${userId}
    ORDER BY sr.returnDate DESC
  `);
  const returnItemRows = Array.isArray((result as any)[0]) ? (result as any)[0] : result;
  return returnItemRows as any[];
}

// ==================== ROTACIÓN DE INVENTARIO ====================

export async function getInventoryRotationReport(userId: number, startDate?: Date, endDate?: Date) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const start = startDate ?? new Date(new Date().getFullYear(), 0, 1); // Inicio del año
  const end = endDate ?? new Date();

  // Días del período
  const periodDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));

  // Ventas por producto en el período
  const salesRaw = await db.execute(sql`
    SELECT
      si.productId,
      p.name AS productName,
      p.sku,
      p.isService,
      SUM(si.quantity) AS totalSold,
      SUM(si.subtotal) AS totalRevenue,
      SUM(si.quantity * si.unitCost) AS totalCOGS,
      COUNT(DISTINCT si.saleId) AS numberOfSales,
      MAX(s.saleDate) AS lastSaleDate
    FROM saleItems si
    JOIN sales s ON si.saleId = s.id
    JOIN products p ON si.productId = p.id
    WHERE s.userId = ${userId}
      AND s.saleDate >= ${start}
      AND s.saleDate <= ${end}
      AND s.status != 'cancelled'
      AND p.isService = FALSE
    GROUP BY si.productId, p.name, p.sku, p.isService
    ORDER BY totalSold DESC
  `);
  const salesData: any[] = Array.isArray((salesRaw as any)[0]) ? (salesRaw as any)[0] : salesRaw as any[];

  // Stock actual e inventario
  const inventoryRaw = await db.execute(sql`
    SELECT
      p.id AS productId,
      p.name AS productName,
      p.sku,
      COALESCE(i.stock, 0) AS currentStock,
      COALESCE(i.averageCost, 0) AS averageCost,
      i.lastRestockDate
    FROM products p
    LEFT JOIN inventory i ON i.productId = p.id AND i.userId = ${userId}
    WHERE p.userId = ${userId} AND p.isService = FALSE
  `);
  const inventoryData: any[] = Array.isArray((inventoryRaw as any)[0]) ? (inventoryRaw as any)[0] : inventoryRaw as any[];

  // Combinar datos
  const inventoryMap = new Map<number, any>();
  for (const inv of inventoryData) {
    inventoryMap.set(Number(inv.productId), inv);
  }

  const salesMap = new Map<number, any>();
  for (const s of salesData) {
    salesMap.set(Number(s.productId), s);
  }

  // Todos los productos físicos
  const allProducts = inventoryData.map((inv: any) => {
    const productId = Number(inv.productId);
    const sale = salesMap.get(productId);
    const currentStock = Number(inv.currentStock) || 0;
    const avgCost = parseFloat(inv.averageCost) || 0;
    const totalSold = sale ? Number(sale.totalSold) : 0;
    const totalRevenue = sale ? parseFloat(sale.totalRevenue) : 0;
    const totalCOGS = sale ? parseFloat(sale.totalCOGS) : 0;
    const grossProfit = totalRevenue - totalCOGS;

    // Rotación = unidades vendidas / stock promedio
    // Stock promedio estimado = (stock actual + stock actual + unidades vendidas) / 2
    const avgStock = (currentStock + totalSold) / 2;
    const rotationRate = avgStock > 0 ? totalSold / avgStock : 0;

    // Días de inventario = días del período / rotación (cuántos días tarda en agotarse)
    const daysOfInventory = rotationRate > 0 ? periodDays / rotationRate : null;

    // Última venta
    const lastSaleDate = sale?.lastSaleDate ?? null;
    const daysSinceLastSale = lastSaleDate
      ? Math.round((end.getTime() - new Date(lastSaleDate).getTime()) / (1000 * 60 * 60 * 24))
      : null;

    // Clasificación
    let classification: string;
    if (totalSold === 0) {
      classification = "Sin movimiento";
    } else if (rotationRate >= 2) {
      classification = "Alta rotación";
    } else if (rotationRate >= 0.5) {
      classification = "Rotación media";
    } else {
      classification = "Baja rotación";
    }

    return {
      productId,
      productName: inv.productName,
      sku: inv.sku || "",
      currentStock,
      averageCost: avgCost,
      inventoryValue: currentStock * avgCost,
      totalSold,
      totalRevenue,
      totalCOGS,
      grossProfit,
      grossMarginPct: totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0,
      numberOfSales: sale ? Number(sale.numberOfSales) : 0,
      rotationRate,
      daysOfInventory,
      lastSaleDate,
      daysSinceLastSale,
      classification,
    };
  });

  return { products: allProducts, periodDays, startDate: start, endDate: end };
}

// ==================== REPORTE COGS / UTILIDAD BRUTA ====================

export async function getCOGSReport(userId: number, startDate?: Date, endDate?: Date) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const start = startDate ?? new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const end = endDate ?? new Date();

  // Ventas con COGS por ítem
  const rowsRaw = await db.execute(sql`
    SELECT
      s.id AS saleId,
      s.saleNumber,
      s.saleDate,
      c.name AS customerName,
      si.productId,
      si.productName,
      p.sku,
      p.isService,
      si.quantity,
      si.unitPrice,
      si.unitCost,
      si.subtotal AS revenue,
      (si.quantity * si.unitCost) AS cogs,
      (si.subtotal - si.quantity * si.unitCost) AS grossProfit,
      CASE
        WHEN si.subtotal > 0
        THEN ((si.subtotal - si.quantity * si.unitCost) / si.subtotal) * 100
        ELSE 0
      END AS grossMarginPct
    FROM saleItems si
    JOIN sales s ON si.saleId = s.id
    LEFT JOIN customers c ON s.customerId = c.id
    LEFT JOIN products p ON si.productId = p.id
    WHERE s.userId = ${userId}
      AND s.saleDate >= ${start}
      AND s.saleDate <= ${end}
      AND s.status != 'cancelled'
    ORDER BY s.saleDate DESC, s.id DESC
  `);
  const rows: any[] = Array.isArray((rowsRaw as any)[0]) ? (rowsRaw as any)[0] : rowsRaw as any[];

  // Totales agregados
  const totals = rows.reduce(
    (acc: any, row: any) => ({
      totalRevenue: acc.totalRevenue + parseFloat(row.revenue || 0),
      totalCOGS: acc.totalCOGS + parseFloat(row.cogs || 0),
      totalGrossProfit: acc.totalGrossProfit + parseFloat(row.grossProfit || 0),
    }),
    { totalRevenue: 0, totalCOGS: 0, totalGrossProfit: 0 }
  );

  const grossMarginPct =
    totals.totalRevenue > 0 ? (totals.totalGrossProfit / totals.totalRevenue) * 100 : 0;

  return { rows, totals: { ...totals, grossMarginPct }, startDate: start, endDate: end };
}
