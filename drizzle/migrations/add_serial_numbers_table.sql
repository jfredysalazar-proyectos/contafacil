-- Migración para agregar tabla de números de serie
CREATE TABLE IF NOT EXISTS `serial_numbers` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `userId` INT NOT NULL,
  `serialNumber` VARCHAR(255) NOT NULL,
  `productId` INT NOT NULL,
  `productName` TEXT NOT NULL,
  `saleId` INT NOT NULL,
  `saleNumber` VARCHAR(50) NOT NULL,
  `customerId` INT,
  `customerName` TEXT,
  `saleDate` TIMESTAMP NOT NULL,
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `serialNumbers_userId_idx` (`userId`),
  INDEX `serialNumbers_serialNumber_idx` (`serialNumber`),
  INDEX `serialNumbers_productId_idx` (`productId`),
  INDEX `serialNumbers_saleId_idx` (`saleId`),
  INDEX `serialNumbers_saleDate_idx` (`saleDate`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
