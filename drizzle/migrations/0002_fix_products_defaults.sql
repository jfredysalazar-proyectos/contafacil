-- Agregar DEFAULT NULL a las columnas opcionales de products
ALTER TABLE `products` MODIFY COLUMN `categoryId` int DEFAULT NULL;
ALTER TABLE `products` MODIFY COLUMN `description` text DEFAULT NULL;
ALTER TABLE `products` MODIFY COLUMN `sku` varchar(100) DEFAULT NULL;
ALTER TABLE `products` MODIFY COLUMN `barcode` varchar(100) DEFAULT NULL;
ALTER TABLE `products` MODIFY COLUMN `cost` decimal(15,2) DEFAULT NULL;
ALTER TABLE `products` MODIFY COLUMN `imageUrl` text DEFAULT NULL;
ALTER TABLE `products` MODIFY COLUMN `qrCode` text DEFAULT NULL;
ALTER TABLE `products` MODIFY COLUMN `promotionalPrice` decimal(15,2) DEFAULT NULL;
