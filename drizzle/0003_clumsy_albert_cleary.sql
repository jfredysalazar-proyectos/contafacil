ALTER TABLE `customers` ADD CONSTRAINT `customers_email_userId_unique` UNIQUE(`email`,`userId`);--> statement-breakpoint
ALTER TABLE `customers` ADD CONSTRAINT `customers_phone_userId_unique` UNIQUE(`phone`,`userId`);--> statement-breakpoint
ALTER TABLE `customers` ADD CONSTRAINT `customers_idNumber_userId_unique` UNIQUE(`idNumber`,`userId`);