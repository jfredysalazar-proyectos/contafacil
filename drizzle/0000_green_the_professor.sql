CREATE TABLE `alertSettings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`lowStockEnabled` boolean NOT NULL DEFAULT true,
	`lowStockThreshold` int NOT NULL DEFAULT 10,
	`debtDueEnabled` boolean NOT NULL DEFAULT true,
	`debtDueDays` int NOT NULL DEFAULT 7,
	`largeSaleEnabled` boolean NOT NULL DEFAULT true,
	`largeSaleThreshold` decimal(15,2) NOT NULL DEFAULT '1000000',
	`notificationEmail` varchar(320),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `alertSettings_id` PRIMARY KEY(`id`),
	CONSTRAINT `alertSettings_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `customers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` text NOT NULL,
	`email` varchar(320),
	`phone` varchar(20),
	`address` text,
	`idNumber` varchar(50),
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `customers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `expenseCategories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `expenseCategories_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `expenses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`categoryId` int,
	`supplierId` int,
	`description` text NOT NULL,
	`amount` decimal(15,2) NOT NULL,
	`expenseDate` timestamp NOT NULL,
	`paymentMethod` enum('cash','card','transfer','credit') NOT NULL,
	`receiptNumber` varchar(100),
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `expenses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `inventory` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`productId` int NOT NULL,
	`variationId` int,
	`stock` int NOT NULL DEFAULT 0,
	`lastRestockDate` timestamp,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `inventory_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `inventoryMovements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`productId` int NOT NULL,
	`variationId` int,
	`supplierId` int,
	`saleId` int,
	`movementType` enum('in','out','adjustment') NOT NULL,
	`quantity` int NOT NULL,
	`unitCost` decimal(15,2),
	`totalCost` decimal(15,2),
	`reason` text,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `inventoryMovements_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `password_reset_tokens` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`token` varchar(255) NOT NULL,
	`expiresAt` timestamp NOT NULL,
	`used` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `password_reset_tokens_id` PRIMARY KEY(`id`),
	CONSTRAINT `password_reset_tokens_token_unique` UNIQUE(`token`)
);
--> statement-breakpoint
CREATE TABLE `payables` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`supplierId` int NOT NULL,
	`expenseId` int,
	`amount` decimal(15,2) NOT NULL,
	`paidAmount` decimal(15,2) NOT NULL DEFAULT '0',
	`remainingAmount` decimal(15,2) NOT NULL,
	`dueDate` timestamp,
	`status` enum('pending','partial','paid','overdue') NOT NULL DEFAULT 'pending',
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `payables_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `payments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`receivableId` int,
	`payableId` int,
	`amount` decimal(15,2) NOT NULL,
	`paymentDate` timestamp NOT NULL,
	`paymentMethod` enum('cash','card','transfer') NOT NULL,
	`reference` varchar(100),
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `payments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `productCategories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `productCategories_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `productVariations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`productId` int NOT NULL,
	`name` text NOT NULL,
	`sku` varchar(100),
	`barcode` varchar(100),
	`price` decimal(15,2),
	`stock` int NOT NULL DEFAULT 0,
	`attributes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `productVariations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `products` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`categoryId` int,
	`name` text NOT NULL,
	`description` text,
	`sku` varchar(100),
	`barcode` varchar(100),
	`price` decimal(15,2) NOT NULL,
	`cost` decimal(15,2),
	`hasVariations` boolean NOT NULL DEFAULT false,
	`stockAlert` int DEFAULT 10,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `products_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `quotationItems` (
	`id` int AUTO_INCREMENT NOT NULL,
	`quotationId` int NOT NULL,
	`productId` int NOT NULL,
	`variationId` int,
	`productName` text NOT NULL,
	`description` text,
	`quantity` int NOT NULL,
	`unitPrice` decimal(15,2) NOT NULL,
	`discount` decimal(15,2) NOT NULL DEFAULT '0',
	`subtotal` decimal(15,2) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `quotationItems_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `quotations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`customerId` int,
	`quotationNumber` varchar(50) NOT NULL,
	`quotationDate` timestamp NOT NULL,
	`validUntil` timestamp NOT NULL,
	`subtotal` decimal(15,2) NOT NULL,
	`tax` decimal(15,2) NOT NULL DEFAULT '0',
	`discount` decimal(15,2) NOT NULL DEFAULT '0',
	`total` decimal(15,2) NOT NULL,
	`status` enum('draft','sent','accepted','rejected','expired','converted') NOT NULL DEFAULT 'draft',
	`paymentTerms` text,
	`deliveryTerms` text,
	`notes` text,
	`convertedToSaleId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `quotations_id` PRIMARY KEY(`id`),
	CONSTRAINT `quotations_quotationNumber_unique` UNIQUE(`quotationNumber`)
);
--> statement-breakpoint
CREATE TABLE `receipts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`saleId` int NOT NULL,
	`receiptNumber` varchar(50) NOT NULL,
	`fileKey` text NOT NULL,
	`fileUrl` text NOT NULL,
	`generatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `receipts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `receivables` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`customerId` int NOT NULL,
	`saleId` int,
	`amount` decimal(15,2) NOT NULL,
	`paidAmount` decimal(15,2) NOT NULL DEFAULT '0',
	`remainingAmount` decimal(15,2) NOT NULL,
	`dueDate` timestamp,
	`status` enum('pending','partial','paid','overdue') NOT NULL DEFAULT 'pending',
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `receivables_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `reports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`reportType` enum('sales','expenses','inventory','debts','profitability') NOT NULL,
	`title` text NOT NULL,
	`startDate` timestamp,
	`endDate` timestamp,
	`fileKey` text NOT NULL,
	`fileUrl` text NOT NULL,
	`generatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `reports_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `saleItems` (
	`id` int AUTO_INCREMENT NOT NULL,
	`saleId` int NOT NULL,
	`productId` int NOT NULL,
	`variationId` int,
	`productName` text NOT NULL,
	`quantity` int NOT NULL,
	`unitPrice` decimal(15,2) NOT NULL,
	`subtotal` decimal(15,2) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `saleItems_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sales` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`customerId` int,
	`saleNumber` varchar(50) NOT NULL,
	`saleDate` timestamp NOT NULL,
	`subtotal` decimal(15,2) NOT NULL,
	`tax` decimal(15,2) NOT NULL DEFAULT '0',
	`discount` decimal(15,2) NOT NULL DEFAULT '0',
	`total` decimal(15,2) NOT NULL,
	`paymentMethod` enum('cash','card','transfer','credit') NOT NULL,
	`status` enum('completed','pending','cancelled') NOT NULL DEFAULT 'completed',
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `sales_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `suppliers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` text NOT NULL,
	`email` varchar(320),
	`phone` varchar(20),
	`address` text,
	`nit` varchar(20),
	`contactPerson` text,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `suppliers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`email` varchar(320) NOT NULL,
	`passwordHash` text NOT NULL,
	`name` text NOT NULL,
	`phone` varchar(20),
	`businessName` text,
	`logoUrl` text,
	`nit` varchar(20),
	`address` text,
	`role` enum('user','admin') NOT NULL DEFAULT 'user',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`lastSignedIn` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE INDEX `alertSettings_userId_idx` ON `alertSettings` (`userId`);--> statement-breakpoint
CREATE INDEX `customers_userId_idx` ON `customers` (`userId`);--> statement-breakpoint
CREATE INDEX `expenseCategories_userId_idx` ON `expenseCategories` (`userId`);--> statement-breakpoint
CREATE INDEX `expenses_userId_idx` ON `expenses` (`userId`);--> statement-breakpoint
CREATE INDEX `expenses_categoryId_idx` ON `expenses` (`categoryId`);--> statement-breakpoint
CREATE INDEX `expenses_expenseDate_idx` ON `expenses` (`expenseDate`);--> statement-breakpoint
CREATE INDEX `inventory_userId_idx` ON `inventory` (`userId`);--> statement-breakpoint
CREATE INDEX `inventory_productId_idx` ON `inventory` (`productId`);--> statement-breakpoint
CREATE INDEX `inventoryMovements_userId_idx` ON `inventoryMovements` (`userId`);--> statement-breakpoint
CREATE INDEX `inventoryMovements_productId_idx` ON `inventoryMovements` (`productId`);--> statement-breakpoint
CREATE INDEX `inventoryMovements_supplierId_idx` ON `inventoryMovements` (`supplierId`);--> statement-breakpoint
CREATE INDEX `inventoryMovements_saleId_idx` ON `inventoryMovements` (`saleId`);--> statement-breakpoint
CREATE INDEX `payables_userId_idx` ON `payables` (`userId`);--> statement-breakpoint
CREATE INDEX `payables_supplierId_idx` ON `payables` (`supplierId`);--> statement-breakpoint
CREATE INDEX `payables_dueDate_idx` ON `payables` (`dueDate`);--> statement-breakpoint
CREATE INDEX `payments_userId_idx` ON `payments` (`userId`);--> statement-breakpoint
CREATE INDEX `payments_receivableId_idx` ON `payments` (`receivableId`);--> statement-breakpoint
CREATE INDEX `payments_payableId_idx` ON `payments` (`payableId`);--> statement-breakpoint
CREATE INDEX `productCategories_userId_idx` ON `productCategories` (`userId`);--> statement-breakpoint
CREATE INDEX `productVariations_productId_idx` ON `productVariations` (`productId`);--> statement-breakpoint
CREATE INDEX `products_userId_idx` ON `products` (`userId`);--> statement-breakpoint
CREATE INDEX `products_categoryId_idx` ON `products` (`categoryId`);--> statement-breakpoint
CREATE INDEX `quotationItems_quotationId_idx` ON `quotationItems` (`quotationId`);--> statement-breakpoint
CREATE INDEX `quotationItems_productId_idx` ON `quotationItems` (`productId`);--> statement-breakpoint
CREATE INDEX `quotations_userId_idx` ON `quotations` (`userId`);--> statement-breakpoint
CREATE INDEX `quotations_customerId_idx` ON `quotations` (`customerId`);--> statement-breakpoint
CREATE INDEX `quotations_quotationDate_idx` ON `quotations` (`quotationDate`);--> statement-breakpoint
CREATE INDEX `quotations_status_idx` ON `quotations` (`status`);--> statement-breakpoint
CREATE INDEX `receipts_userId_idx` ON `receipts` (`userId`);--> statement-breakpoint
CREATE INDEX `receipts_saleId_idx` ON `receipts` (`saleId`);--> statement-breakpoint
CREATE INDEX `receivables_userId_idx` ON `receivables` (`userId`);--> statement-breakpoint
CREATE INDEX `receivables_customerId_idx` ON `receivables` (`customerId`);--> statement-breakpoint
CREATE INDEX `receivables_dueDate_idx` ON `receivables` (`dueDate`);--> statement-breakpoint
CREATE INDEX `reports_userId_idx` ON `reports` (`userId`);--> statement-breakpoint
CREATE INDEX `saleItems_saleId_idx` ON `saleItems` (`saleId`);--> statement-breakpoint
CREATE INDEX `sales_userId_idx` ON `sales` (`userId`);--> statement-breakpoint
CREATE INDEX `sales_customerId_idx` ON `sales` (`customerId`);--> statement-breakpoint
CREATE INDEX `sales_saleDate_idx` ON `sales` (`saleDate`);--> statement-breakpoint
CREATE INDEX `suppliers_userId_idx` ON `suppliers` (`userId`);