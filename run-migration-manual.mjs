import mysql from 'mysql2/promise';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function runMigration() {
  console.log('🔄 Iniciando migración de numeración personalizada...');
  
  // Obtener DATABASE_URL del entorno
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error('❌ ERROR: DATABASE_URL no está configurada');
    process.exit(1);
  }
  
  console.log('✅ DATABASE_URL encontrada');
  
  let connection;
  
  try {
    // Crear conexión
    console.log('🔌 Conectando a la base de datos...');
    connection = await mysql.createConnection(databaseUrl);
    console.log('✅ Conexión establecida');
    
    // Leer el archivo de migración
    const migrationPath = join(__dirname, 'drizzle/migrations/0003_add_document_numbering_config.sql');
    console.log(`📄 Leyendo migración: ${migrationPath}`);
    const migrationSQL = readFileSync(migrationPath, 'utf8');
    console.log('✅ Migración leída');
    
    // Dividir por líneas y ejecutar cada ALTER TABLE por separado
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);
    
    console.log(`📋 Ejecutando ${statements.length} sentencias SQL...`);
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      console.log(`\n🔹 Ejecutando sentencia ${i + 1}/${statements.length}:`);
      console.log(statement);
      
      try {
        await connection.execute(statement);
        console.log(`✅ Sentencia ${i + 1} ejecutada correctamente`);
      } catch (error) {
        // Si el error es que la columna ya existe, lo ignoramos
        if (error.code === 'ER_DUP_FIELDNAME') {
          console.log(`⚠️  Columna ya existe, continuando...`);
        } else {
          throw error;
        }
      }
    }
    
    console.log('\n✅ Migración completada exitosamente');
    
    // Verificar que las columnas existan
    console.log('\n🔍 Verificando columnas agregadas...');
    const [columns] = await connection.execute(`
      SELECT COLUMN_NAME, COLUMN_TYPE, COLUMN_DEFAULT
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'users'
        AND COLUMN_NAME IN ('salesPrefix', 'salesNextNumber', 'quotationsPrefix', 'quotationsNextNumber')
      ORDER BY COLUMN_NAME
    `);
    
    console.log('\n📊 Columnas encontradas:');
    console.table(columns);
    
    if (columns.length === 4) {
      console.log('\n✅ Todas las columnas fueron agregadas correctamente');
    } else {
      console.log(`\n⚠️  Solo se encontraron ${columns.length} de 4 columnas`);
    }
    
  } catch (error) {
    console.error('\n❌ ERROR durante la migración:');
    console.error(error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Conexión cerrada');
    }
  }
}

runMigration();
