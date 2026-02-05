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
    
    // Verificar si la columna categoryId tiene DEFAULT NULL
    const [rows] = await connection.execute(`
      SELECT COLUMN_DEFAULT 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'products' 
        AND COLUMN_NAME = 'categoryId'
    `);
    
    if (rows.length > 0 && rows[0].COLUMN_DEFAULT === null) {
      console.log('✅ Esquema ya está actualizado');
      await connection.end();
    } else {
      console.log('🔧 Aplicando migración...');
      
      // Ejecutar las migraciones
      const statements = [
        "ALTER TABLE `products` MODIFY COLUMN `id` SERIAL",
        "ALTER TABLE `products` MODIFY COLUMN `categoryId` int DEFAULT NULL",
        "ALTER TABLE `products` MODIFY COLUMN `description` text DEFAULT NULL",
        "ALTER TABLE `products` MODIFY COLUMN `sku` varchar(100) DEFAULT NULL",
        "ALTER TABLE `products` MODIFY COLUMN `barcode` varchar(100) DEFAULT NULL",
        "ALTER TABLE `products` MODIFY COLUMN `cost` decimal(15,2) DEFAULT NULL",
        "ALTER TABLE `products` MODIFY COLUMN `imageUrl` text DEFAULT NULL",
        "ALTER TABLE `products` MODIFY COLUMN `qrCode` text DEFAULT NULL",
        "ALTER TABLE `products` MODIFY COLUMN `promotionalPrice` decimal(15,2) DEFAULT NULL"
      ];
      
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
