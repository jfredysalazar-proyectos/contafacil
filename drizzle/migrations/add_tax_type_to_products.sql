-- Agregar columna taxType a la tabla products
ALTER TABLE products 
ADD COLUMN taxType ENUM('excluded', 'exempt', 'iva_5', 'iva_19') NOT NULL DEFAULT 'iva_19'
AFTER sellBy;
