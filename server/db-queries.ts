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
  expenses,
  receivables,
  payables,
  payments,
  productCategories,
  expenseCategories,
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
} from "../drizzle/schema";

// ==================== PRODUCTOS ====================

export async function createProduct(data: InsertProduct) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(products).values(data);
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
  
  await db
    .update(products)
    .set(data)
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
  
  // Obtener todos los productos del usuario con su stock actual
  // Si no tienen registro en inventory, el stock es 0
  return await db
    .select({
      id: inventory.id,
      stock: sql<number>`COALESCE(${inventory.stock}, 0)`.as('stock'),
      lastRestockDate: inventory.lastRestockDate,
      productId: products.id,
      productName: products.name,
      productPrice: products.price,
      stockAlert: products.stockAlert,
      variationId: productVariations.id,
      variationName: productVariations.name,
    })
    .from(products)
    .leftJoin(inventory, and(
      eq(inventory.productId, products.id),
      eq(inventory.userId, userId)
    ))
    .leftJoin(productVariations, eq(inventory.variationId, productVariations.id))
    .where(eq(products.userId, userId));
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
  
  const result = await db.insert(customers).values(data);
  return result;
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
  
  // Insertar items de venta
  const itemsWithSaleId = items.map(item => ({ ...item, saleId }));
  await db.insert(saleItems).values(itemsWithSaleId);
  
  // Actualizar inventario
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
  
  return await db
    .select()
    .from(saleItems)
    .where(eq(saleItems.saleId, saleId));
}

export async function getSalesByUserId(userId: number, startDate?: Date, endDate?: Date) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const conditions = [eq(sales.userId, userId)];
  
  if (startDate && endDate) {
    conditions.push(gte(sales.saleDate, startDate));
    conditions.push(lte(sales.saleDate, endDate));
  }
  
  return await db
    .select()
    .from(sales)
    .where(and(...conditions))
    .orderBy(desc(sales.saleDate));
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
  
  return { ...sale[0], items };
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
    .select()
    .from(receivables)
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
    .select()
    .from(payables)
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
  
  // Insertar movimiento
  await db.execute(sql`
    INSERT INTO inventoryMovements (
      userId, productId, variationId, supplierId, saleId,
      movementType, quantity, unitCost, totalCost, reason, notes
    ) VALUES (
      ${data.userId}, ${data.productId}, ${data.variationId}, ${data.supplierId}, ${data.saleId},
      ${data.movementType}, ${data.quantity}, ${data.unitCost}, ${data.totalCost}, ${data.reason}, ${data.notes}
    )
  `);
  
  // Actualizar stock en la tabla inventory
  const currentInventory = await getInventoryByProductId(data.productId, data.userId);
  const currentStock = currentInventory?.stock || 0;
  
  let newStock = currentStock;
  if (data.movementType === "in") {
    newStock = currentStock + data.quantity;
  } else if (data.movementType === "out") {
    newStock = currentStock - data.quantity;
  } else if (data.movementType === "adjustment") {
    newStock = data.quantity; // Para ajustes, la cantidad es el nuevo stock total
  }
  
  await updateInventoryStock(data.productId, data.userId, newStock);
  
  return { success: true, newStock };
}

export async function getInventoryMovementsByProductId(productId: number, userId: number, limit: number = 50) {
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
    WHERE im.productId = ${productId} AND im.userId = ${userId}
    ORDER BY im.createdAt DESC
    LIMIT ${limit}
  `);
  
  return result as any[];
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
  
  return result as any[];
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
