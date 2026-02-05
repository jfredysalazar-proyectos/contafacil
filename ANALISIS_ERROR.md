# Análisis del Error al Crear Producto

## Error Reportado

```
Failed query: insert into `products` (`id`, `userId`, `categoryId`, `name`, `description`, `sku`, `barcode`, `price`, `cost`, `hasVariations`, `imageUrl`, `qrCode`, `stockControlEnabled`, `stock`, `stockAlert`, `sellBy`, `promotionalPrice`, `featured`, `createdAt`, `updatedAt`) values (default, ?, default, ?, ?, ?, default, ?, ?, ?, ?, ?, ?, ?, ?, ?, default, ?, default, default)
```

## Diagnóstico

### Problema Principal

El error ocurre porque el query SQL está intentando insertar valores con `default` para columnas que **no tienen valores por defecto definidos en la base de datos**.

### Columnas Problemáticas

Analizando el esquema original (`0000_green_the_professor.sql`):

```sql
CREATE TABLE `products` (
  `id` int AUTO_INCREMENT NOT NULL,
  `userId` int NOT NULL,
  `categoryId` int,                    -- NO tiene DEFAULT
  `name` text NOT NULL,
  `description` text,                  -- NO tiene DEFAULT
  `sku` varchar(100),                  -- NO tiene DEFAULT
  `barcode` varchar(100),              -- NO tiene DEFAULT
  `price` decimal(15,2) NOT NULL,
  `cost` decimal(15,2),                -- NO tiene DEFAULT
  `hasVariations` boolean NOT NULL DEFAULT false,
  `stockAlert` int DEFAULT 10,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `products_id` PRIMARY KEY(`id`)
);
```

Luego en la migración `0002_milky_taskmaster.sql` se agregaron:

```sql
ALTER TABLE `products` ADD `imageUrl` text;                              -- NO tiene DEFAULT
ALTER TABLE `products` ADD `stockControlEnabled` boolean DEFAULT false NOT NULL;
ALTER TABLE `products` ADD `stock` int DEFAULT 0 NOT NULL;
ALTER TABLE `products` ADD `sellBy` enum('unit','fraction') DEFAULT 'unit' NOT NULL;
ALTER TABLE `products` ADD `promotionalPrice` decimal(15,2);            -- NO tiene DEFAULT
ALTER TABLE `products` ADD `featured` boolean DEFAULT false NOT NULL;
```

Y finalmente en `migrations/0001_add_qrcode_to_products.sql`:

```sql
ALTER TABLE `products` ADD COLUMN `qrCode` text;                        -- NO tiene DEFAULT
```

### Columnas sin DEFAULT que se intentan insertar con `default`

1. `categoryId` - int (nullable)
2. `description` - text (nullable)
3. `sku` - varchar(100) (nullable)
4. `barcode` - varchar(100) (nullable)
5. `cost` - decimal(15,2) (nullable)
6. `imageUrl` - text (nullable)
7. `qrCode` - text (nullable)
8. `promotionalPrice` - decimal(15,2) (nullable)

## Causa Raíz

El problema está en el archivo `drizzle/schema.ts`. Las columnas opcionales (nullable) están definidas sin un valor `.default()`, pero Drizzle ORM está generando queries con `default` para estas columnas.

## Solución

Hay dos enfoques:

### Opción 1: Agregar `.default(null)` a las columnas opcionales en el schema

Modificar `drizzle/schema.ts` para que las columnas opcionales tengan explícitamente `.default(null)`:

```typescript
categoryId: int("categoryId").default(null),
description: text("description").default(null),
sku: varchar("sku", { length: 100 }).default(null),
barcode: varchar("barcode", { length: 100 }).default(null),
cost: decimal("cost", { precision: 15, scale: 2 }).default(null),
imageUrl: text("imageUrl").default(null),
qrCode: text("qrCode").default(null),
promotionalPrice: decimal("promotionalPrice", { precision: 15, scale: 2 }).default(null),
```

### Opción 2: Modificar la función createProduct para no enviar valores undefined

En lugar de enviar `undefined` para campos opcionales, enviar explícitamente `null`.

## Recomendación

**Opción 1** es la mejor solución porque:
1. Hace que el schema sea más explícito
2. Evita problemas futuros con otras queries
3. Es consistente con el comportamiento esperado de MySQL
