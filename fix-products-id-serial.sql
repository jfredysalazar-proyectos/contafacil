-- Cambiar la columna id de products a SERIAL
-- SERIAL es un alias de BIGINT UNSIGNED NOT NULL AUTO_INCREMENT UNIQUE

ALTER TABLE `products` 
MODIFY COLUMN `id` SERIAL;
