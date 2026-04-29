import mysql from 'mysql2/promise';
import { spawn } from 'child_process';

async function runMigrationIfNeeded() {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL no está definida');
    process.exit(1);
  }

  console.log('🔄 Verificando esquema de base de datos...');
  
  try {
    const connection = await mysql.createConnection(databaseUrl);
    
    // Verificar si la columna qrCode existe
    const [qrCodeRows] = await connection.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'products' 
        AND COLUMN_NAME = 'qrCode'
    `);
    
    const qrCodeExists = qrCodeRows.length > 0;
    
    // Verificar si la columna taxType existe
    const [taxTypeRows] = await connection.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'products' 
        AND COLUMN_NAME = 'taxType'
    `);
    
    const taxTypeExists = taxTypeRows.length > 0;
    
    // Verificar si la tabla serial_numbers existe
    const [serialTableRows] = await connection.execute(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'serial_numbers'
    `);
    
    let serialTableExists = serialTableRows.length > 0;
    
    // Siempre eliminar y recrear la tabla serial_numbers para asegurar estructura correcta
    if (serialTableExists) {
      try {
        await connection.execute('DROP TABLE IF EXISTS `serial_numbers`');
        console.log('🔧 Eliminando tabla serial_numbers antigua para recrearla...');
      } catch (e) {
        console.log('⚠️  No se pudo eliminar tabla antigua');
      }
    }
    
    // Marcar como no existente para forzar recreación
    serialTableExists = false;
    
    // Verificar si la columna id es SERIAL (BIGINT UNSIGNED)
    const [rows] = await connection.execute(`
      SELECT COLUMN_TYPE 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'products' 
        AND COLUMN_NAME = 'id'
    `);
    
    const idIsSerial = rows.length > 0 && rows[0].COLUMN_TYPE.includes('bigint unsigned');
    
    if (idIsSerial && qrCodeExists && taxTypeExists && false) { // Siempre recrear serial_numbers
      console.log('✅ Esquema ya está actualizado');
      await connection.end();
    } else {
      console.log('🔧 Aplicando migración...');
      
      // Ejecutar las migraciones
      const statements = [];
      
      if (!idIsSerial) {
        statements.push("ALTER TABLE `products` MODIFY COLUMN `id` SERIAL");
      }
      
      if (!qrCodeExists) {
        statements.push("ALTER TABLE `products` ADD COLUMN `qrCode` text DEFAULT NULL");
      }
      
      if (!taxTypeExists) {
        statements.push("ALTER TABLE `products` ADD COLUMN `taxType` ENUM('excluded', 'exempt', 'iva_5', 'iva_19') NOT NULL DEFAULT 'iva_19' AFTER `sellBy`");
      }
      
      if (!serialTableExists) {
        statements.push(`
          CREATE TABLE IF NOT EXISTS \`serial_numbers\` (
            \`id\` INT AUTO_INCREMENT PRIMARY KEY,
            \`userId\` INT NOT NULL,
            \`serialNumber\` VARCHAR(255) NOT NULL,
            \`productId\` INT NOT NULL,
            \`productName\` TEXT NOT NULL,
            \`saleId\` INT NOT NULL,
            \`saleNumber\` VARCHAR(50) NOT NULL,
            \`customerId\` INT,
            \`customerName\` TEXT,
            \`saleDate\` DATETIME NOT NULL,
            \`createdAt\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            INDEX \`serialNumbers_userId_idx\` (\`userId\`),
            INDEX \`serialNumbers_serialNumber_idx\` (\`serialNumber\`),
            INDEX \`serialNumbers_productId_idx\` (\`productId\`),
            INDEX \`serialNumbers_saleId_idx\` (\`saleId\`),
            INDEX \`serialNumbers_saleDate_idx\` (\`saleDate\`)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
      }
      
      // Migrar saleDate de DATE a DATETIME si la tabla ya existe
      try {
        const [saleDateTypeRows] = await connection.execute(`
          SELECT DATA_TYPE 
          FROM INFORMATION_SCHEMA.COLUMNS 
          WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME = 'serial_numbers' 
            AND COLUMN_NAME = 'saleDate'
        `);
        
        if (saleDateTypeRows.length > 0 && saleDateTypeRows[0].DATA_TYPE === 'date') {
          statements.push("ALTER TABLE \`serial_numbers\` MODIFY COLUMN \`saleDate\` DATETIME NOT NULL");
          console.log('🔧 Convirtiendo saleDate de DATE a DATETIME...');
        }
      } catch (e) {
        // Ignorar si la tabla no existe
      }
      
      // Verificar y agregar columna isService en products
      const [isServiceRows] = await connection.execute(`
        SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'products' AND COLUMN_NAME = 'isService'
      `);
      if (isServiceRows.length === 0) {
        statements.push("ALTER TABLE `products` ADD COLUMN `isService` BOOLEAN NOT NULL DEFAULT FALSE");
      }

      // Verificar y agregar columna averageCost en inventory (costo promedio ponderado)
      const [avgCostRows] = await connection.execute(`
        SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'inventory' AND COLUMN_NAME = 'averageCost'
      `);
      if (avgCostRows.length === 0) {
        statements.push("ALTER TABLE `inventory` ADD COLUMN `averageCost` DECIMAL(15,4) NOT NULL DEFAULT 0 AFTER `stock`");
      }

      // Verificar y agregar columna servicesModuleEnabled en users
      const [svcModRows] = await connection.execute(`
        SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'servicesModuleEnabled'
      `);
      if (svcModRows.length === 0) {
        statements.push("ALTER TABLE `users` ADD COLUMN `servicesModuleEnabled` BOOLEAN NOT NULL DEFAULT FALSE");
      }

      // Crear tabla de cierres de caja
      statements.push(`
        CREATE TABLE IF NOT EXISTS \`cashRegisters\` (
          \`id\` INT AUTO_INCREMENT PRIMARY KEY,
          \`userId\` INT NOT NULL,
          \`openedAt\` TIMESTAMP NOT NULL,
          \`closedAt\` TIMESTAMP NULL,
          \`openingBalance\` DECIMAL(15,2) NOT NULL DEFAULT 0,
          \`closingBalance\` DECIMAL(15,2) NULL,
          \`totalCash\` DECIMAL(15,2) DEFAULT 0,
          \`totalCard\` DECIMAL(15,2) DEFAULT 0,
          \`totalTransfer\` DECIMAL(15,2) DEFAULT 0,
          \`totalCredit\` DECIMAL(15,2) DEFAULT 0,
          \`totalSales\` DECIMAL(15,2) DEFAULT 0,
          \`salesCount\` INT DEFAULT 0,
          \`notes\` TEXT NULL,
          \`status\` ENUM('open','closed') NOT NULL DEFAULT 'open',
          \`createdAt\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          \`updatedAt\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX \`cashRegisters_userId_idx\` (\`userId\`),
          INDEX \`cashRegisters_openedAt_idx\` (\`openedAt\`),
          INDEX \`cashRegisters_status_idx\` (\`status\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);

      // Agregar otras migraciones de DEFAULT NULL
      statements.push(
        "ALTER TABLE `products` MODIFY COLUMN `categoryId` int DEFAULT NULL",
        "ALTER TABLE `products` MODIFY COLUMN `description` text DEFAULT NULL",
        "ALTER TABLE `products` MODIFY COLUMN `sku` varchar(100) DEFAULT NULL",
        "ALTER TABLE `products` MODIFY COLUMN `barcode` varchar(100) DEFAULT NULL",
        "ALTER TABLE `products` MODIFY COLUMN `cost` decimal(15,2) DEFAULT NULL",
        "ALTER TABLE `products` MODIFY COLUMN `imageUrl` text DEFAULT NULL",
        "ALTER TABLE `products` MODIFY COLUMN `promotionalPrice` decimal(15,2) DEFAULT NULL"
      );
      
      for (const statement of statements) {
        try {
          await connection.execute(statement);
          console.log(`  ✅ ${statement.substring(0, 50)}...`);
        } catch (error) {
          // Ignorar errores si la columna ya tiene el DEFAULT correcto
          if (!error.message.includes('check that column/key exists')) {
            console.log(`  ⚠️  ${error.message}`);
          }
        }
      }
      
      console.log('✅ Migración completada');
      await connection.end();
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    // Continuar de todos modos
  }
  
  // Iniciar la aplicación
  console.log('🚀 Iniciando aplicación...');
  const app = spawn('node', ['dist/index.js'], {
    stdio: 'inherit',
    env: process.env
  });
  
  app.on('exit', (code) => {
    process.exit(code);
  });
}

runMigrationIfNeeded();
