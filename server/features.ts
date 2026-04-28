import { z } from "zod";
import { protectedProcedure, router } from "./_core/trpc";
import * as dbQueries from "./db-queries";
import { getDb } from "./db";
import { users } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

// ==================== PRODUCTOS ====================

export const productsRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return await dbQueries.getProductsByUserId(ctx.user.id);
  }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        categoryId: z.number().optional(),
        sku: z.string().optional(),
        barcode: z.string().optional(),
        price: z.string(),
        cost: z.string().optional(),
        hasVariations: z.boolean().default(false),
        imageUrl: z.string().optional(),
        stockControlEnabled: z.boolean().default(false),
        stock: z.number().default(0),
        stockAlert: z.number().default(10),
        sellBy: z.enum(["unit", "fraction"]).default("unit"),
        taxType: z.enum(["excluded", "exempt", "iva_5", "iva_19"]).default("iva_19"),
        promotionalPrice: z.string().optional(),
        featured: z.boolean().default(false),
        isService: z.boolean().default(false),
      })
    )
    .mutation(async ({ input, ctx }) => {
      return await dbQueries.createProduct({
        ...input,
        userId: ctx.user.id,
      });
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(1).optional(),
        description: z.string().optional(),
        categoryId: z.number().optional(),
        sku: z.string().optional(),
        barcode: z.string().optional(),
        price: z.string().optional(),
        cost: z.string().optional(),
        imageUrl: z.string().optional(),
        stockControlEnabled: z.boolean().optional(),
        stock: z.number().optional(),
        stockAlert: z.number().optional(),
        sellBy: z.enum(["unit", "fraction"]).optional(),
        taxType: z.enum(["excluded", "exempt", "iva_5", "iva_19"]).optional(),
        promotionalPrice: z.string().optional(),
        featured: z.boolean().optional(),
        isService: z.boolean().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { id, ...data } = input;
      await dbQueries.updateProduct(id, ctx.user.id, data);
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      await dbQueries.deleteProduct(input.id, ctx.user.id);
      return { success: true };
    }),
});

// ==================== INVENTARIO ====================

export const inventoryRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return await dbQueries.getInventoryByUserId(ctx.user.id);
  }),

  lowStock: protectedProcedure.query(async ({ ctx }) => {
    return await dbQueries.getLowStockProducts(ctx.user.id);
  }),

  addStock: protectedProcedure
    .input(
      z.object({
        productId: z.number(),
        quantity: z.number().positive(),
        supplierId: z.number().optional(),
        unitCost: z.number().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const totalCost = input.unitCost ? input.unitCost * input.quantity : undefined;
      
      return await dbQueries.addInventoryMovement({
        userId: ctx.user.id,
        productId: input.productId,
        supplierId: input.supplierId,
        movementType: "in",
        quantity: input.quantity,
        unitCost: input.unitCost,
        totalCost,
        notes: input.notes,
      });
    }),

  reduceStock: protectedProcedure
    .input(
      z.object({
        productId: z.number(),
        quantity: z.number().positive(),
        reason: z.string().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      return await dbQueries.addInventoryMovement({
        userId: ctx.user.id,
        productId: input.productId,
        movementType: "out",
        quantity: input.quantity,
        reason: input.reason || "Ajuste manual",
        notes: input.notes,
      });
    }),

  adjustStock: protectedProcedure
    .input(
      z.object({
        productId: z.number(),
        newStock: z.number().nonnegative(),
        reason: z.string().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      return await dbQueries.addInventoryMovement({
        userId: ctx.user.id,
        productId: input.productId,
        movementType: "adjustment",
        quantity: input.newStock,
        reason: input.reason || "Ajuste de inventario",
        notes: input.notes,
      });
    }),

  getMovements: protectedProcedure
    .input(
      z.object({
        productId: z.number().optional(),
        limit: z.number().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      if (input.productId) {
        return await dbQueries.getInventoryMovementsByProductId(
          input.productId,
          ctx.user.id,
          input.limit
        );
      }
      return await dbQueries.getInventoryMovementsByUserId(ctx.user.id, input.limit);
    }),
});

// ==================== CLIENTES ====================

export const customersRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return await dbQueries.getCustomersByUserId(ctx.user.id);
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      return await dbQueries.getCustomerById(input.id, ctx.user.id);
    }),

  getByIdNumber: protectedProcedure
    .input(z.object({ idNumber: z.string().min(1) }))
    .query(async ({ input, ctx }) => {
      return await dbQueries.getCustomerByIdNumber(input.idNumber, ctx.user.id);
    }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        email: z.string().email().optional(),
        phone: z.string().optional(),
        address: z.string().optional(),
        idNumber: z.string().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      return await dbQueries.createCustomer({
        ...input,
        userId: ctx.user.id,
      });
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(1).optional(),
        email: z.string().email().optional(),
        phone: z.string().optional(),
        address: z.string().optional(),
        idNumber: z.string().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { id, ...data } = input;
      await dbQueries.updateCustomer(id, ctx.user.id, data);
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      await dbQueries.deleteCustomer(input.id, ctx.user.id);
      return { success: true };
    }),
});

// ==================== PROVEEDORES ====================

export const suppliersRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return await dbQueries.getSuppliersByUserId(ctx.user.id);
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      return await dbQueries.getSupplierById(input.id, ctx.user.id);
    }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        email: z.string().email().optional(),
        phone: z.string().optional(),
        address: z.string().optional(),
        nit: z.string().optional(),
        contactPerson: z.string().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      return await dbQueries.createSupplier({
        ...input,
        userId: ctx.user.id,
      });
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(1).optional(),
        email: z.string().email().optional(),
        phone: z.string().optional(),
        address: z.string().optional(),
        nit: z.string().optional(),
        contactPerson: z.string().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { id, ...data } = input;
      await dbQueries.updateSupplier(id, ctx.user.id, data);
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      await dbQueries.deleteSupplier(input.id, ctx.user.id);
      return { success: true };
    }),
});

// ==================== VENTAS ====================

export const salesRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      }).optional()
    )
    .query(async ({ input, ctx }) => {
      return await dbQueries.getSalesByUserId(
        ctx.user.id,
        input?.startDate,
        input?.endDate
      );
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      return await dbQueries.getSaleById(input.id, ctx.user.id);
    }),

  getItems: protectedProcedure
    .input(z.object({ saleId: z.number() }))
    .query(async ({ input, ctx }) => {
      return await dbQueries.getSaleItemsBySaleId(input.saleId, ctx.user.id);
    }),

  create: protectedProcedure
    .input(
      z.object({
        customerId: z.number().optional(),
        saleNumber: z.string().optional(), // Ahora opcional, se genera automáticamente
        saleDate: z.date().optional(), // Ahora opcional, usa fecha actual
        items: z.array(
          z.object({
            productId: z.number(),
            variationId: z.number().optional(),
            productName: z.string().optional(),
            quantity: z.number(),
            unitPrice: z.string(),
            subtotal: z.string(),
            hasSerial: z.boolean().optional(),
            serialNumbers: z.string().optional(),
            warrantyDays: z.number().optional().default(90), // Días de garantía
          })
        ),
        subtotal: z.string(),
        tax: z.string().default("0"),
        discount: z.string().default("0"),
        total: z.string(),
        paymentMethod: z.enum(["cash", "card", "transfer", "credit"]),
        creditDays: z.number().optional(),
        status: z.enum(["completed", "pending", "cancelled"]).default("completed"),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { items, ...saleData } = input;
      
      // Obtener configuración del usuario para numeración
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      
      const [userConfig] = await db
        .select({
          salesPrefix: users.salesPrefix,
          salesNextNumber: users.salesNextNumber,
        })
        .from(users)
        .where(eq(users.id, ctx.user.id))
        .limit(1);
      
      // Generar número de venta si no se proporciona
      if (!saleData.saleNumber) {
        const prefix = userConfig?.salesPrefix || "VTA-";
        const nextNumber = userConfig?.salesNextNumber || 1;
        saleData.saleNumber = `${prefix}${String(nextNumber).padStart(4, '0')}`;
        
        // Incrementar el número para la próxima venta
        await db
          .update(users)
          .set({ salesNextNumber: nextNumber + 1 })
          .where(eq(users.id, ctx.user.id));
      }
      
      // Usar fecha actual si no se proporciona
      if (!saleData.saleDate) {
        saleData.saleDate = new Date();
      }
      
      // Completar productName si no viene del frontend
      const itemsWithNames = await Promise.all(items.map(async (item) => {
        if (!item.productName) {
          const product = await dbQueries.getProductById(item.productId, ctx.user.id);
          return { ...item, productName: product?.name || "Producto desconocido" };
        }
        return item;
      }));
      
      // Validar stock disponible antes de crear la venta
      for (const item of itemsWithNames) {
        // Los servicios no tienen inventario físico, se omite la validación de stock
        const product = await dbQueries.getProductById(item.productId, ctx.user.id);
        if (product?.isService) continue;

        const inventory = await dbQueries.getInventoryByProductId(item.productId, ctx.user.id);
        const currentStock = inventory?.stock || 0;

        if (currentStock < item.quantity) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Stock insuficiente para ${item.productName}. Stock disponible: ${currentStock}, cantidad solicitada: ${item.quantity}`,
          });
        }
      }
      
      const saleId = await dbQueries.createSale(
        {
          ...saleData,
          userId: ctx.user.id,
        },
        itemsWithNames
      );
      
      // Actualizar inventario automáticamente (solo para productos físicos, no servicios)
      for (const item of items) {
        const productForInventory = await dbQueries.getProductById(item.productId, ctx.user.id);
        if (productForInventory?.isService) continue;

        await dbQueries.addInventoryMovement({
          userId: ctx.user.id,
          productId: item.productId,
          variationId: item.variationId,
          saleId,
          movementType: "out",
          quantity: item.quantity,
          reason: "Venta registrada",
          notes: `Venta ${input.saleNumber}`,
        });
      }
      
      // Guardar números de serie
      for (const item of items) {
        if (item.hasSerial && item.serialNumbers) {
          const serials = item.serialNumbers.split(',').map(s => s.trim()).filter(s => s);
          
          // Validar que la cantidad de seriales coincida con la cantidad de productos
          if (serials.length !== item.quantity) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: `Debe ingresar ${item.quantity} números de serie para ${item.productName}. Ingresados: ${serials.length}`,
            });
          }
          
          // Obtener nombre del cliente si existe
          let customerName: string | undefined;
          if (input.customerId) {
            const customer = await dbQueries.getCustomerById(input.customerId, ctx.user.id);
            customerName = customer?.name;
          }
          
          // Guardar cada serial
          console.log('📦 ANTES de guardar seriales - item:', {
            productId: item.productId,
            productName: item.productName,
            hasSerial: item.hasSerial,
            serialNumbers: item.serialNumbers,
            serials,
            quantity: item.quantity,
          });
          
          console.log('📦 Datos de la venta:', {
            saleId,
            saleNumber: input.saleNumber,
            customerId: input.customerId,
            customerName,
            saleDate: input.saleDate,
            saleDateType: typeof input.saleDate,
            userId: ctx.user.id,
          });
          
          for (const serial of serials) {
            console.log('🔹 Intentando guardar serial:', serial);
            
            const dataToInsert = {
              userId: ctx.user.id,
              serialNumber: serial,
              productId: item.productId,
              productName: item.productName,
              saleId,
              saleNumber: input.saleNumber,
              customerId: input.customerId,
              customerName,
              saleDate: input.saleDate,
              warrantyDays: item.warrantyDays || 90, // Días de garantía
            };
            
            console.log('🔹 Datos a insertar:', dataToInsert);
            
            try {
              await dbQueries.createSerialNumber(dataToInsert);
              console.log('✅ Serial guardado exitosamente:', serial);
            } catch (error: any) {
              console.error('❌ ERROR al guardar serial:', serial);
              console.error('  Error completo:', error);
              console.error('  Mensaje:', error.message);
              console.error('  Stack:', error.stack);
              throw error;
            }
          }
          
          console.log('✅ Todos los seriales guardados para', item.productName);
        }
      }
      
      // Si es venta a crédito, crear deuda por cobrar
      if (input.paymentMethod === "credit" && input.customerId) {
        // Calcular fecha de vencimiento: saleDate + creditDays
        let dueDate: Date | undefined = undefined;
        if (input.creditDays && input.creditDays > 0) {
          dueDate = new Date(input.saleDate);
          dueDate.setDate(dueDate.getDate() + input.creditDays);
        }

        await dbQueries.createReceivable({
          userId: ctx.user.id,
          customerId: input.customerId,
          saleId,
          amount: input.total,
          paidAmount: "0",
          remainingAmount: input.total,
          dueDate,
          status: "pending",
        });
      }
      
      return { success: true, saleId };
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        customerId: z.number().optional(),
        items: z.array(
          z.object({
            productId: z.number(),
            variationId: z.number().optional(),
            productName: z.string().optional(),
            quantity: z.number(),
            unitPrice: z.string(),
            subtotal: z.string(),
          })
        ),
        subtotal: z.string(),
        tax: z.string(),
        discount: z.string().optional(),
        total: z.string(),
        paymentMethod: z.enum(["cash", "card", "transfer", "credit"]),
        status: z.enum(["completed", "pending", "cancelled"]).optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { id, items, ...saleData } = input;
      
      // Obtener items actuales de la venta
      const currentItems = await dbQueries.getSaleItemsBySaleId(id, ctx.user.id);
      
      // Validar stock disponible considerando los items actuales
      for (const newItem of items) {
        // Los servicios no tienen inventario físico, se omite la validación de stock
        const product = await dbQueries.getProductById(newItem.productId, ctx.user.id);
        if (product?.isService) continue;

        const inventory = await dbQueries.getInventoryByProductId(newItem.productId, ctx.user.id);
        const currentStock = inventory?.stock || 0;

        // Encontrar si este producto ya estaba en la venta
        const oldItem = currentItems.find((item: any) => item.productId === newItem.productId);
        const oldQuantity = oldItem?.quantity || 0;

        // Stock disponible = stock actual + cantidad que se va a devolver - cantidad nueva
        const availableStock = currentStock + oldQuantity;

        if (availableStock < newItem.quantity) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Stock insuficiente para ${newItem.productName}. Stock disponible: ${availableStock}, cantidad solicitada: ${newItem.quantity}`,
          });
        }
      }
      
      // Actualizar la venta
      await dbQueries.updateSale(id, ctx.user.id, saleData);
      
      // Actualizar los items (eliminar los antiguos y crear los nuevos)
      await dbQueries.updateSaleItems(id, ctx.user.id, items);
      
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      await dbQueries.deleteSale(input.id, ctx.user.id);
      return { success: true };
    }),
});

// ==================== GASTOS ====================

export const expensesRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      }).optional()
    )
    .query(async ({ input, ctx }) => {
      return await dbQueries.getExpensesByUserId(
        ctx.user.id,
        input?.startDate,
        input?.endDate
      );
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      return await dbQueries.getExpenseById(input.id, ctx.user.id);
    }),

  create: protectedProcedure
    .input(
      z.object({
        categoryId: z.number().optional(),
        supplierId: z.number().optional(),
        description: z.string().min(1),
        amount: z.string(),
        expenseDate: z.date(),
        paymentMethod: z.enum(["cash", "card", "transfer", "credit"]),
        creditDays: z.number().optional(),
        receiptNumber: z.string().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const result = await dbQueries.createExpense({
        ...input,
        userId: ctx.user.id,
      });
      
      // Si es gasto a crédito, crear deuda por pagar
      if (input.paymentMethod === "credit" && input.supplierId) {
        // Calcular fecha de vencimiento: expenseDate + creditDays
        let dueDate: Date | undefined = undefined;
        if (input.creditDays && input.creditDays > 0) {
          dueDate = new Date(input.expenseDate);
          dueDate.setDate(dueDate.getDate() + input.creditDays);
        }
        
        await dbQueries.createPayable({
          userId: ctx.user.id,
          supplierId: input.supplierId,
          amount: input.amount,
          paidAmount: "0",
          remainingAmount: input.amount,
          dueDate,
          status: "pending",
        });
      }
      
      return { success: true };
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        categoryId: z.number().optional(),
        supplierId: z.number().optional(),
        description: z.string().min(1).optional(),
        amount: z.string().optional(),
        expenseDate: z.date().optional(),
        paymentMethod: z.enum(["cash", "card", "transfer", "credit"]).optional(),
        receiptNumber: z.string().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { id, ...data } = input;
      await dbQueries.updateExpense(id, ctx.user.id, data);
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      await dbQueries.deleteExpense(input.id, ctx.user.id);
      return { success: true };
    }),
});

// ==================== DEUDAS ====================

export const debtsRouter = router({
  receivables: protectedProcedure.query(async ({ ctx }) => {
    return await dbQueries.getReceivablesByUserId(ctx.user.id);
  }),

  payables: protectedProcedure.query(async ({ ctx }) => {
    return await dbQueries.getPayablesByUserId(ctx.user.id);
  }),

  addPayment: protectedProcedure
    .input(
      z.object({
        receivableId: z.number().optional(),
        payableId: z.number().optional(),
        amount: z.string(),
        paymentDate: z.date(),
        paymentMethod: z.enum(["cash", "card", "transfer"]),
        reference: z.string().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (!input.receivableId && !input.payableId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Debe especificar receivableId o payableId",
        });
      }
      
      await dbQueries.createPayment({
        ...input,
        userId: ctx.user.id,
      });
      
      return { success: true };
    }),
});

// ==================== ESTADÍSTICAS ====================

export const statsRouter = router({
  sales: protectedProcedure
    .input(
      z.object({
        startDate: z.date(),
        endDate: z.date(),
      })
    )
    .query(async ({ input, ctx }) => {
      return await dbQueries.getSalesStatistics(
        ctx.user.id,
        input.startDate,
        input.endDate
      );
    }),

  topProducts: protectedProcedure
    .input(z.object({ limit: z.number().default(10) }))
    .query(async ({ input, ctx }) => {
      return await dbQueries.getTopSellingProducts(ctx.user.id, input.limit);
    }),

  expensesByCategory: protectedProcedure
    .input(
      z.object({
        startDate: z.date(),
        endDate: z.date(),
      })
    )
    .query(async ({ input, ctx }) => {
      return await dbQueries.getExpensesByCategory(
        ctx.user.id,
        input.startDate,
        input.endDate
      );
    }),

  expensesBySupplier: protectedProcedure
    .input(
      z.object({
        startDate: z.date(),
        endDate: z.date(),
      })
    )
    .query(async ({ input, ctx }) => {
      return await dbQueries.getExpensesBySupplier(
        ctx.user.id,
        input.startDate,
        input.endDate
      );
    }),
});

// ==================== CATEGORÍAS ====================

export const categoriesRouter = router({
  products: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return await dbQueries.getProductCategoriesByUserId(ctx.user.id);
    }),
    
    create: protectedProcedure
      .input(
        z.object({
          name: z.string().min(1),
          description: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        return await dbQueries.createProductCategory({
          ...input,
          userId: ctx.user.id,
        });
      }),
  }),

  expenses: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return await dbQueries.getExpenseCategoriesByUserId(ctx.user.id);
    }),
    
    create: protectedProcedure
      .input(
        z.object({
          name: z.string().min(1),
          description: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        return await dbQueries.createExpenseCategory({
          ...input,
          userId: ctx.user.id,
        });
      }),
  }),
});

// ==================== COTIZACIONES ====================

export const quotationsRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        status: z.enum(["draft", "sent", "accepted", "rejected", "expired", "converted"]).optional(),
      }).optional()
    )
    .query(async ({ input, ctx }) => {
      return await dbQueries.getQuotationsByUserId(ctx.user.id, input?.status);
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      return await dbQueries.getQuotationById(input.id, ctx.user.id);
    }),

  getItems: protectedProcedure
    .input(z.object({ quotationId: z.number() }))
    .query(async ({ input, ctx }) => {
      return await dbQueries.getQuotationItemsByQuotationId(input.quotationId, ctx.user.id);
    }),

  create: protectedProcedure
    .input(
      z.object({
        customerId: z.number().optional(),
        quotationNumber: z.string().optional(), // Ahora opcional, se genera automáticamente
        quotationDate: z.date().optional(), // Ahora opcional, usa fecha actual
        validUntil: z.date(),
        items: z.array(
          z.object({
            productId: z.number(),
            variationId: z.number().nullable().optional(),
            productName: z.string(),
            description: z.string().optional(),
            quantity: z.number(),
            unitPrice: z.string(),
            discount: z.string().default("0"),
            subtotal: z.string(),
          })
        ),
        subtotal: z.string(),
        tax: z.string().default("0"),
        discount: z.string().default("0"),
        total: z.string(),
        status: z.enum(["draft", "sent", "accepted", "rejected", "expired", "converted"]).default("draft"),
        paymentTerms: z.string().optional(),
        deliveryTerms: z.string().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { items, ...quotationData } = input;
      
      // Obtener configuración del usuario para numeración
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      
      const [userConfig] = await db
        .select({
          quotationsPrefix: users.quotationsPrefix,
          quotationsNextNumber: users.quotationsNextNumber,
        })
        .from(users)
        .where(eq(users.id, ctx.user.id))
        .limit(1);
      
      // Generar número de cotización si no se proporciona
      if (!quotationData.quotationNumber) {
        const prefix = userConfig?.quotationsPrefix || "COT-";
        const nextNumber = userConfig?.quotationsNextNumber || 1;
        quotationData.quotationNumber = `${prefix}${String(nextNumber).padStart(4, '0')}`;
        
        // Incrementar el número para la próxima cotización
        await db
          .update(users)
          .set({ quotationsNextNumber: nextNumber + 1 })
          .where(eq(users.id, ctx.user.id));
      }
      
      // Usar fecha actual si no se proporciona
      if (!quotationData.quotationDate) {
        quotationData.quotationDate = new Date();
      }
      
      const quotationId = await dbQueries.createQuotation(
        {
          ...quotationData,
          userId: ctx.user.id,
        },
        items
      );
      
      return { success: true, quotationId };
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        customerId: z.number().optional(),
        validUntil: z.date().optional(),
        items: z.array(
          z.object({
            productId: z.number(),
            variationId: z.number().nullable().optional(),
            productName: z.string(),
            description: z.string().optional(),
            quantity: z.number(),
            unitPrice: z.string(),
            discount: z.string().default("0"),
            subtotal: z.string(),
          })
        ).optional(),
        subtotal: z.string().optional(),
        tax: z.string().optional(),
        discount: z.string().optional(),
        total: z.string().optional(),
        status: z.enum(["draft", "sent", "accepted", "rejected", "expired", "converted"]).optional(),
        paymentTerms: z.string().optional(),
        deliveryTerms: z.string().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { id, items, ...updateData } = input;
      
      // Actualizar cotización
      await dbQueries.updateQuotation(id, ctx.user.id, updateData);
      
      // Si se proporcionan items, actualizarlos
      if (items) {
        await dbQueries.updateQuotationItems(id, ctx.user.id, items);
      }
      
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      await dbQueries.deleteQuotation(input.id, ctx.user.id);
      return { success: true };
    }),

  convertToSale: protectedProcedure
    .input(
      z.object({
        quotationId: z.number(),
        saleNumber: z.string(),
        saleDate: z.date(),
        paymentMethod: z.enum(["cash", "card", "transfer", "credit"]),
        status: z.enum(["completed", "pending", "cancelled"]).default("completed"),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { quotationId, ...saleData } = input;
      
      try {
        const saleId = await dbQueries.convertQuotationToSale(
          quotationId,
          ctx.user.id,
          saleData
        );
        
        return { success: true, saleId };
      } catch (error) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: error instanceof Error ? error.message : "Error al convertir cotización a venta",
        });
      }
    }),
});

// ==================== NÚMEROS DE SERIE ====================

export const serialNumbersRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return await dbQueries.getSerialNumbersByUserId(ctx.user.id);
  }),

  search: protectedProcedure
    .input(z.object({ serialNumber: z.string() }))
    .query(async ({ input, ctx }) => {
      return await dbQueries.searchSerialNumber(ctx.user.id, input.serialNumber);
    }),

  getBySaleId: protectedProcedure
    .input(z.object({ saleId: z.number() }))
    .query(async ({ input, ctx }) => {
      return await dbQueries.getSerialNumbersBySaleId(input.saleId, ctx.user.id);
    }),
});

// ==================== CAJA ====================

export const cashRegisterRouter = router({
  // Obtener el estado actual de la caja (si hay una abierta)
  getCurrent: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return null;
    const { cashRegisters } = await import("../drizzle/schema");
    const { and, eq } = await import("drizzle-orm");
    const [current] = await db
      .select()
      .from(cashRegisters)
      .where(and(eq(cashRegisters.userId, ctx.user.id), eq(cashRegisters.status, "open")))
      .limit(1);
    return current || null;
  }),

  // Listar historial de cierres de caja
  list: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    const { cashRegisters } = await import("../drizzle/schema");
    const { eq, desc } = await import("drizzle-orm");
    return await db
      .select()
      .from(cashRegisters)
      .where(eq(cashRegisters.userId, ctx.user.id))
      .orderBy(desc(cashRegisters.openedAt))
      .limit(30);
  }),

  // Abrir caja
  open: protectedProcedure
    .input(z.object({
      openingBalance: z.string().default("0"),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB no disponible" });
      const { cashRegisters } = await import("../drizzle/schema");
      const { and, eq } = await import("drizzle-orm");
      // Verificar si ya hay una caja abierta
      const [existing] = await db
        .select()
        .from(cashRegisters)
        .where(and(eq(cashRegisters.userId, ctx.user.id), eq(cashRegisters.status, "open")))
        .limit(1);
      if (existing) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Ya hay una caja abierta" });
      }
      await db.insert(cashRegisters).values({
        userId: ctx.user.id,
        openedAt: new Date(),
        openingBalance: input.openingBalance,
        status: "open",
        notes: input.notes || null,
      });
      return { success: true };
    }),

  // Cerrar caja con resumen calculado desde las ventas del día
  close: protectedProcedure
    .input(z.object({
      cashRegisterId: z.number(),
      closingBalance: z.string(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB no disponible" });
      const { cashRegisters, sales } = await import("../drizzle/schema");
      const { and, eq, gte, lte, sum, count } = await import("drizzle-orm");

      // Obtener la caja
      const [register] = await db
        .select()
        .from(cashRegisters)
        .where(and(eq(cashRegisters.id, input.cashRegisterId), eq(cashRegisters.userId, ctx.user.id)))
        .limit(1);
      if (!register) throw new TRPCError({ code: "NOT_FOUND", message: "Caja no encontrada" });
      if (register.status === "closed") throw new TRPCError({ code: "BAD_REQUEST", message: "La caja ya está cerrada" });

      // Calcular totales de ventas desde la apertura hasta ahora
      const openedAt = register.openedAt;
      const closedAt = new Date();

      const salesData = await db
        .select({
          paymentMethod: sales.paymentMethod,
          total: sum(sales.total),
          cnt: count(sales.id),
        })
        .from(sales)
        .where(
          and(
            eq(sales.userId, ctx.user.id),
            eq(sales.status, "completed"),
            gte(sales.saleDate, openedAt),
            lte(sales.saleDate, closedAt)
          )
        )
        .groupBy(sales.paymentMethod);

      let totalCash = 0, totalCard = 0, totalTransfer = 0, totalCredit = 0, totalSales = 0, salesCount = 0;
      for (const row of salesData) {
        const amount = parseFloat(row.total || "0");
        const cnt = Number(row.cnt || 0);
        salesCount += cnt;
        totalSales += amount;
        if (row.paymentMethod === "cash") totalCash += amount;
        else if (row.paymentMethod === "card") totalCard += amount;
        else if (row.paymentMethod === "transfer") totalTransfer += amount;
        else if (row.paymentMethod === "credit") totalCredit += amount;
      }

      await db.update(cashRegisters)
        .set({
          closedAt,
          closingBalance: input.closingBalance,
          totalCash: String(totalCash),
          totalCard: String(totalCard),
          totalTransfer: String(totalTransfer),
          totalCredit: String(totalCredit),
          totalSales: String(totalSales),
          salesCount,
          status: "closed",
          notes: input.notes || register.notes || null,
        })
        .where(eq(cashRegisters.id, input.cashRegisterId));

      return { success: true, totalSales, salesCount, totalCash, totalCard, totalTransfer, totalCredit };
    }),

  // Obtener resumen en tiempo real de la caja abierta
  getSummary: protectedProcedure
    .input(z.object({ cashRegisterId: z.number() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) return null;
      const { cashRegisters, sales } = await import("../drizzle/schema");
      const { and, eq, gte, sum, count } = await import("drizzle-orm");

      const [register] = await db
        .select()
        .from(cashRegisters)
        .where(and(eq(cashRegisters.id, input.cashRegisterId), eq(cashRegisters.userId, ctx.user.id)))
        .limit(1);
      if (!register) return null;

      const salesData = await db
        .select({
          paymentMethod: sales.paymentMethod,
          total: sum(sales.total),
          cnt: count(sales.id),
        })
        .from(sales)
        .where(
          and(
            eq(sales.userId, ctx.user.id),
            eq(sales.status, "completed"),
            gte(sales.saleDate, register.openedAt)
          )
        )
        .groupBy(sales.paymentMethod);

      let totalCash = 0, totalCard = 0, totalTransfer = 0, totalCredit = 0, totalSales = 0, salesCount = 0;
      for (const row of salesData) {
        const amount = parseFloat(row.total || "0");
        const cnt = Number(row.cnt || 0);
        salesCount += cnt;
        totalSales += amount;
        if (row.paymentMethod === "cash") totalCash += amount;
        else if (row.paymentMethod === "card") totalCard += amount;
        else if (row.paymentMethod === "transfer") totalTransfer += amount;
        else if (row.paymentMethod === "credit") totalCredit += amount;
      }

      return { register, totalCash, totalCard, totalTransfer, totalCredit, totalSales, salesCount };
    }),
});
