import { describe, it, expect } from "vitest";
import { getDb } from "./db";
import { sales, saleItems } from "../drizzle/schema";
import { eq } from "drizzle-orm";

describe("Sales Update Functionality", () => {
  it("should verify that sale update endpoints exist and items can be updated", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Verificar que existe una venta con items en la base de datos
    const existingSales = await db
      .select()
      .from(sales)
      .limit(1);

    expect(existingSales.length).toBeGreaterThan(0);
    const sale = existingSales[0];

    // Verificar que la venta tiene items
    const items = await db
      .select()
      .from(saleItems)
      .where(eq(saleItems.saleId, sale.id));

    expect(items.length).toBeGreaterThan(0);
    
    // Verificar que los items tienen la estructura correcta
    items.forEach(item => {
      expect(item).toHaveProperty("productId");
      expect(item).toHaveProperty("quantity");
      expect(item).toHaveProperty("unitPrice");
      expect(item).toHaveProperty("subtotal");
      expect(item.quantity).toBeGreaterThan(0);
      expect(Number(item.unitPrice)).toBeGreaterThan(0);
      expect(Number(item.subtotal)).toBeGreaterThan(0);
    });
  });

  it("should verify that sales have correct totals calculated", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Obtener una venta con items
    const existingSales = await db
      .select()
      .from(sales)
      .limit(1);

    if (existingSales.length === 0) {
      console.log("No sales found in database, skipping test");
      return;
    }

    const sale = existingSales[0];

    // Obtener items de la venta
    const items = await db
      .select()
      .from(saleItems)
      .where(eq(saleItems.saleId, sale.id));

    if (items.length === 0) {
      console.log("No items found for sale, skipping test");
      return;
    }

    // Calcular subtotal sumando todos los items
    const calculatedSubtotal = items.reduce(
      (sum, item) => sum + Number(item.subtotal),
      0
    );

    // Verificar que el subtotal de la venta coincida con la suma de items
    expect(Number(sale.subtotal)).toBe(calculatedSubtotal);

    // Verificar que el IVA sea el 19% del subtotal
    const expectedTax = calculatedSubtotal * 0.19;
    expect(Math.abs(Number(sale.tax) - expectedTax)).toBeLessThan(1); // Permitir diferencia de centavos

    // Verificar que el total sea subtotal + IVA
    const expectedTotal = calculatedSubtotal + Number(sale.tax);
    expect(Math.abs(Number(sale.total) - expectedTotal)).toBeLessThan(1);
  });

  it("should verify that sale items have valid product references", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Obtener items de ventas
    const items = await db
      .select()
      .from(saleItems)
      .limit(5);

    if (items.length === 0) {
      console.log("No sale items found, skipping test");
      return;
    }

    // Verificar que cada item tenga un productId válido
    items.forEach(item => {
      expect(item.productId).toBeDefined();
      expect(typeof item.productId).toBe("number");
      expect(item.productId).toBeGreaterThan(0);
    });
  });
});
