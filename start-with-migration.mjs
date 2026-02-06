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
    
    // Verificar si la columna id es SERIAL (BIGINT UNSIGNED)
    const [rows] = await connection.execute(`
      SELECT COLUMN_TYPE 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'products' 
        AND COLUMN_NAME = 'id'
    `);
    
    const idIsSerial = rows.length > 0 && rows[0].COLUMN_TYPE.includes('bigint unsigned');
    
    if (idIsSerial && qrCodeExists && taxTypeExists) {
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
