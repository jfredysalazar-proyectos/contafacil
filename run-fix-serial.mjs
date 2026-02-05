import mysql from 'mysql2/promise';
import fs from 'fs';

async function runMigration() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  
  try {
    console.log('🔄 Aplicando migración para cambiar id a SERIAL...');
    
    const sql = fs.readFileSync('./fix-products-id-serial.sql', 'utf8');
    
    await connection.query(sql);
    
    console.log('✅ Migración aplicada exitosamente');
    console.log('✅ La columna id ahora es SERIAL (BIGINT UNSIGNED NOT NULL AUTO_INCREMENT UNIQUE)');
  } catch (error) {
    console.error('❌ Error al aplicar migración:', error.message);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

runMigration();
