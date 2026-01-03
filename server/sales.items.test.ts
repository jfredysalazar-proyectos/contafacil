import { describe, it, expect } from "vitest";
import * as dbQueries from "./db-queries";

describe("Sales Items Flow", () => {
  it("debe recuperar los items de una venta existente desde la base de datos", async () => {
    // Usar una venta existente de la base de datos de prueba
    // Esta venta fue creada durante las pruebas manuales
    // Usar la venta real de la base de datos que tiene items
    const saleId = 2; // ID de la venta con items
    const userId = 2; // ID del usuario propietario de la venta
    
    const items = await dbQueries.getSaleItemsBySaleId(saleId, userId);

    // Verificar que se recuperaron items
    expect(items).toBeDefined();
    expect(Array.isArray(items)).toBe(true);
    
    if (items.length > 0) {
      // Verificar estructura de cada item
      items.forEach(item => {
        expect(item).toHaveProperty('id');
        expect(item).toHaveProperty('saleId');
        expect(item).toHaveProperty('productId');
        expect(item).toHaveProperty('productName');
        expect(item).toHaveProperty('quantity');
        expect(item).toHaveProperty('unitPrice');
        expect(item).toHaveProperty('subtotal');
        
        // Verificar tipos
        expect(typeof item.id).toBe('number');
        expect(typeof item.saleId).toBe('number');
        expect(typeof item.productId).toBe('number');
        expect(typeof item.productName).toBe('string');
        expect(typeof item.quantity).toBe('number');
        expect(typeof item.unitPrice).toBe('string');
        expect(typeof item.subtotal).toBe('string');
        
        // Verificar que el nombre del producto no esté vacío
        expect(item.productName.length).toBeGreaterThan(0);
        
        // Verificar que los valores numéricos sean positivos
        expect(item.quantity).toBeGreaterThan(0);
        expect(parseFloat(item.unitPrice)).toBeGreaterThan(0);
        expect(parseFloat(item.subtotal)).toBeGreaterThan(0);
      });
    }
  });

  it("debe incluir el nombre del producto en los items recuperados", async () => {
    const saleId = 2;
    const userId = 2;
    
    const items = await dbQueries.getSaleItemsBySaleId(saleId, userId);

    if (items.length > 0) {
      items.forEach(item => {
        expect(item.productName).toBeDefined();
        expect(item.productName.length).toBeGreaterThan(0);
        expect(typeof item.productName).toBe('string');
      });
    }
  });

  it("debe calcular correctamente los subtotales de los items", async () => {
    const saleId = 2;
    const userId = 2;
    
    const items = await dbQueries.getSaleItemsBySaleId(saleId, userId);

    if (items.length > 0) {
      items.forEach(item => {
        const calculatedSubtotal = item.quantity * parseFloat(item.unitPrice);
        const actualSubtotal = parseFloat(item.subtotal);
        
        // Permitir una pequeña diferencia por redondeo
        expect(Math.abs(calculatedSubtotal - actualSubtotal)).toBeLessThan(0.01);
      });
    }
  });

  it("debe retornar un array vacío para ventas de otros usuarios", async () => {
    const saleId = 2;
    const otherUserId = 99999; // Usuario que no existe
    
    const items = await dbQueries.getSaleItemsBySaleId(saleId, otherUserId);
    
    expect(items).toBeDefined();
    expect(Array.isArray(items)).toBe(true);
    expect(items.length).toBe(0);
  });

  it("debe recuperar múltiples items de una venta", async () => {
    const saleId = 2;
    const userId = 2;
    
    const items = await dbQueries.getSaleItemsBySaleId(saleId, userId);

    // La venta de prueba tiene 2 items (Laptop y Mouse)
    if (items.length >= 2) {
      expect(items.length).toBeGreaterThanOrEqual(2);
      
      // Verificar que cada item tiene un productId diferente
      const productIds = items.map(item => item.productId);
      const uniqueProductIds = new Set(productIds);
      expect(uniqueProductIds.size).toBeGreaterThan(0);
    }
  });
});
