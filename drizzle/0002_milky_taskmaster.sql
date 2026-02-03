CREATE TABLE `businessUsers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`roleId` int NOT NULL,
	`email` varchar(320) NOT NULL,
	`passwordHash` text NOT NULL,
	`name` text NOT NULL,
	`phone` varchar(20),
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`lastSignedIn` timestamp,
	CONSTRAINT `businessUsers_id` PRIMARY KEY(`id`),
	CONSTRAINT `businessUsers_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE TABLE `permissions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`displayName` text NOT NULL,
	`module` varchar(50) NOT NULL,
	`description` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `permissions_id` PRIMARY KEY(`id`),
	CONSTRAINT `permissions_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `rolePermissions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`roleId` int NOT NULL,
	`permissionId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `rolePermissions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `roles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(50) NOT NULL,
	`displayName` text NOT NULL,
	`description` text,
	`isSystem` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `roles_id` PRIMARY KEY(`id`),
	CONSTRAINT `roles_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `userActivityLog` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`userType` varchar(20) NOT NULL,
	`action` varchar(100) NOT NULL,
	`module` varchar(50) NOT NULL,
	`details` text,
	`ipAddress` varchar(45),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `userActivityLog_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `products` ADD `imageUrl` text;--> statement-breakpoint
ALTER TABLE `products` ADD `stockControlEnabled` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `products` ADD `stock` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `products` ADD `sellBy` enum('unit','fraction') DEFAULT 'unit' NOT NULL;--> statement-breakpoint
ALTER TABLE `products` ADD `promotionalPrice` decimal(15,2);--> statement-breakpoint
ALTER TABLE `products` ADD `featured` boolean DEFAULT false NOT NULL;--> statement-breakpoint
CREATE INDEX `businessUsers_ownerId_idx` ON `businessUsers` (`ownerId`);--> statement-breakpoint
CREATE INDEX `businessUsers_roleId_idx` ON `businessUsers` (`roleId`);--> statement-breakpoint
CREATE INDEX `permissions_module_idx` ON `permissions` (`module`);--> statement-breakpoint
CREATE INDEX `rolePermissions_roleId_idx` ON `rolePermissions` (`roleId`);--> statement-breakpoint
CREATE INDEX `rolePermissions_permissionId_idx` ON `rolePermissions` (`permissionId`);--> statement-breakpoint
CREATE INDEX `rolePermissions_unique` ON `rolePermissions` (`roleId`,`permissionId`);--> statement-breakpoint
CREATE INDEX `userActivityLog_userId_idx` ON `userActivityLog` (`userId`);--> statement-breakpoint
CREATE INDEX `userActivityLog_module_idx` ON `userActivityLog` (`module`);--> statement-breakpoint
CREATE INDEX `userActivityLog_createdAt_idx` ON `userActivityLog` (`createdAt`);