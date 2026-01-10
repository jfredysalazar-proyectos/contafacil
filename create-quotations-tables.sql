-- Script SQL para crear las tablas de cotizaciones en MySQL
-- Ejecutar este script en el panel de Aiven

-- Crear tabla quotations
CREATE TABLE IF NOT EXISTS quotations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  userId INT NOT NULL,
  customerId INT,
  quotationNumber VARCHAR(50) NOT NULL UNIQUE,
  quotationDate TIMESTAMP NOT NULL,
  validUntil TIMESTAMP NOT NULL,
  subtotal DECIMAL(15, 2) NOT NULL,
  tax DECIMAL(15, 2) NOT NULL DEFAULT 0,
  discount DECIMAL(15, 2) NOT NULL DEFAULT 0,
  total DECIMAL(15, 2) NOT NULL,
  status ENUM('draft', 'sent', 'accepted', 'rejected', 'expired', 'converted') NOT NULL DEFAULT 'draft',
  paymentTerms TEXT,
  deliveryTerms TEXT,
  notes TEXT,
  convertedToSaleId INT,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX quotations_userId_idx (userId),
  INDEX quotations_customerId_idx (customerId),
  INDEX quotations_quotationDate_idx (quotationDate),
  INDEX quotations_status_idx (status)
);

-- Crear tabla quotationItems
CREATE TABLE IF NOT EXISTS quotationItems (
  id INT AUTO_INCREMENT PRIMARY KEY,
  quotationId INT NOT NULL,
  productId INT NOT NULL,
  variationId INT,
  productName TEXT NOT NULL,
  description TEXT,
  quantity INT NOT NULL,
  unitPrice DECIMAL(15, 2) NOT NULL,
  discount DECIMAL(15, 2) NOT NULL DEFAULT 0,
  subtotal DECIMAL(15, 2) NOT NULL,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX quotationItems_quotationId_idx (quotationId),
  INDEX quotationItems_productId_idx (productId)
);

-- Verificar que las tablas fueron creadas
SHOW TABLES LIKE 'quotation%';
