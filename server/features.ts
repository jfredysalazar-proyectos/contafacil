import { z } from "zod";
import { protectedProcedure, router } from "./_core/trpc";
import * as dbQueries from "./db-queries";
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
        stockAlert: z.number().default(10),
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
        price: z.string().optional(),
        cost: z.string().optional(),
        stockAlert: z.number().optional(),
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
        reason: "Compra a proveedor",
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
        saleNumber: z.string(),
        saleDate: z.date(),
        items: z.array(
          z.object({
            productId: z.number(),
            variationId: z.number().optional(),
            productName: z.string(),
            quantity: z.number(),
            unitPrice: z.string(),
            subtotal: z.string(),
          })
        ),
        subtotal: z.string(),
        tax: z.string().default("0"),
        discount: z.string().default("0"),
        total: z.string(),
        paymentMethod: z.enum(["cash", "card", "transfer", "credit"]),
        status: z.enum(["completed", "pending", "cancelled"]).default("completed"),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { items, ...saleData } = input;
      
      const saleId = await dbQueries.createSale(
        {
          ...saleData,
          userId: ctx.user.id,
        },
        items
      );
      
      // Actualizar inventario automáticamente
      for (const item of items) {
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
      
      // Si es venta a crédito, crear deuda por cobrar
      if (input.paymentMethod === "credit" && input.customerId) {
        await dbQueries.createReceivable({
          userId: ctx.user.id,
          customerId: input.customerId,
          saleId,
          amount: input.total,
          paidAmount: "0",
          remainingAmount: input.total,
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
            productName: z.string(),
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
        await dbQueries.createPayable({
          userId: ctx.user.id,
          supplierId: input.supplierId,
          amount: input.amount,
          paidAmount: "0",
          remainingAmount: input.amount,
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
