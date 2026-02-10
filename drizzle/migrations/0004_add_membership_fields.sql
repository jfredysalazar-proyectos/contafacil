-- Agregar campos de membresía a la tabla users
ALTER TABLE `users` ADD COLUMN `membershipStatus` ENUM('trial', 'active', 'expired') NOT NULL DEFAULT 'trial';
ALTER TABLE `users` ADD COLUMN `membershipStartDate` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE `users` ADD COLUMN `membershipEndDate` TIMESTAMP NULL;

-- Establecer fecha de fin de membresía para usuarios existentes (8 días de prueba desde hoy)
UPDATE `users` SET `membershipEndDate` = DATE_ADD(NOW(), INTERVAL 8 DAY) WHERE `membershipEndDate` IS NULL;

-- El admin no tiene fecha de expiración
UPDATE `users` SET `membershipStatus` = 'active', `membershipEndDate` = NULL WHERE `email` = 'admin@contafacil.com';
