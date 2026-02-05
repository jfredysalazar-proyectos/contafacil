import mysql from 'mysql2/promise';

async function verifySchema() {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL no está definida');
    process.exit(1);
  }

  console.log('🔍 Verificando esquema de la tabla products...\n');
  
  try {
    const connection = await mysql.createConnection(databaseUrl);
    
    // Ver la estructura completa de la tabla products
    const [columns] = await connection.execute(`
      SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT, EXTRA
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'products'
      ORDER BY ORDINAL_POSITION
    `);
    
    console.log('Columnas de la tabla products:');
    console.table(columns);
    
    // Ver específicamente la columna id
    const [idColumn] = await connection.execute(`
      SELECT * 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'products' 
        AND COLUMN_NAME = 'id'
    `);
    
    console.log('\nDetalles de la columna id:');
    console.log(JSON.stringify(idColumn[0], null, 2));
    
    await connection.end();
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

verifySchema();
