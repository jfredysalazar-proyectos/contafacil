import mysql from 'mysql2/promise';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function runMigration() {
  // Obtener DATABASE_URL de las variables de entorno
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL no está definida');
    process.exit(1);
  }

  console.log('🔄 Conectando a la base de datos...');
  
  try {
    // Crear conexión
    const connection = await mysql.createConnection(databaseUrl);
    
    console.log('✅ Conexión establecida');
    
    // Leer el archivo de migración
    const migrationPath = join(__dirname, 'drizzle', 'migrations', '0002_fix_products_defaults.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf-8');
    
    console.log('📄 Ejecutando migración...');
    console.log(migrationSQL);
    
    // Dividir por líneas y ejecutar cada ALTER TABLE
    const statements = migrationSQL
      .split('\n')
      .filter(line => line.trim().startsWith('ALTER TABLE'))
      .map(line => line.trim().replace(/;$/, ''));
    
    for (const statement of statements) {
      console.log(`  Ejecutando: ${statement.substring(0, 60)}...`);
      await connection.execute(statement);
      console.log('  ✅ Completado');
    }
    
    console.log('✅ Migración completada exitosamente');
    
    // Cerrar conexión
    await connection.end();
    
  } catch (error) {
    console.error('❌ Error ejecutando migración:', error.message);
    process.exit(1);
  }
}

runMigration();
