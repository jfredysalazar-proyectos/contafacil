-- Agregar campos de configuración de numeración de documentos a la tabla users
ALTER TABLE `users` ADD COLUMN `salesPrefix` VARCHAR(10) NOT NULL DEFAULT 'VTA-';
ALTER TABLE `users` ADD COLUMN `salesNextNumber` INT NOT NULL DEFAULT 1;
ALTER TABLE `users` ADD COLUMN `quotationsPrefix` VARCHAR(10) NOT NULL DEFAULT 'COT-';
ALTER TABLE `users` ADD COLUMN `quotationsNextNumber` INT NOT NULL DEFAULT 1;
