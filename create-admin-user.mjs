/**
 * Script para crear un usuario administrador en ContaFacil
 * 
 * Uso:
 * 1. Asegúrate de tener la variable de entorno DATABASE_URL configurada
 * 2. Ejecuta: node create-admin-user.mjs
 */

import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import { config } from 'dotenv';

// Cargar variables de entorno
config();

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ Error: DATABASE_URL no está configurada en las variables de entorno');
  process.exit(1);
}

// Credenciales del usuario administrador
const ADMIN_EMAIL = 'admin@contafacil.com';
const ADMIN_PASSWORD = 'Admin123!';
const ADMIN_NAME = 'Administrador';

async function createAdminUser() {
  let connection;
  
  try {
    console.log('🔌 Conectando a la base de datos...');
    
    // Crear conexión
    connection = await mysql.createConnection(DATABASE_URL);
    
    console.log('✓ Conexión establecida');
    
    // Verificar si existe la tabla users
    console.log('\n📋 Verificando estructura de la base de datos...');
    const [tables] = await connection.query("SHOW TABLES LIKE 'users'");
    
    if (tables.length === 0) {
      console.error('❌ La tabla "users" no existe en la base de datos.');
      console.error('   Necesitas ejecutar las migraciones primero con: npm run db:push');
      process.exit(1);
    }
    
    console.log('✓ Tabla "users" encontrada');
    
    // Verificar si ya existe un usuario administrador
    console.log('\n🔍 Verificando usuarios administradores existentes...');
    const [admins] = await connection.query(
      'SELECT id, email, name, role FROM users WHERE role = ?',
      ['admin']
    );
    
    if (admins.length > 0) {
      console.log('\n⚠️  Ya existe(n) usuario(s) administrador(es) en la base de datos:');
      admins.forEach(admin => {
        console.log(`   • ID: ${admin.id}, Email: ${admin.email}, Nombre: ${admin.name}`);
      });
      
      // Preguntar si desea continuar
      console.log('\n❓ ¿Deseas crear otro usuario administrador de todas formas?');
      console.log('   Si deseas continuar, ejecuta el script con la flag --force');
      
      if (!process.argv.includes('--force')) {
        process.exit(0);
      }
    }
    
    // Verificar si el email ya existe
    const [existingUser] = await connection.query(
      'SELECT id, email FROM users WHERE email = ?',
      [ADMIN_EMAIL]
    );
    
    if (existingUser.length > 0) {
      console.log(`\n⚠️  Ya existe un usuario con el email ${ADMIN_EMAIL}`);
      console.log(`   ID: ${existingUser[0].id}`);
      console.log('\n   Si deseas crear un usuario con otro email, modifica el script.');
      process.exit(1);
    }
    
    // Crear hash de la contraseña
    console.log('\n🔐 Generando hash de contraseña...');
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, salt);
    
    console.log('✓ Hash generado');
    
    // Insertar usuario administrador
    console.log('\n👤 Creando usuario administrador...');
    const [result] = await connection.query(
      `INSERT INTO users (email, passwordHash, name, role, createdAt, updatedAt, lastSignedIn)
       VALUES (?, ?, ?, ?, NOW(), NOW(), NOW())`,
      [ADMIN_EMAIL, passwordHash, ADMIN_NAME, 'admin']
    );
    
    console.log('\n✅ ¡Usuario administrador creado exitosamente!');
    console.log('\n📧 Credenciales de acceso:');
    console.log(`   Email: ${ADMIN_EMAIL}`);
    console.log(`   Contraseña: ${ADMIN_PASSWORD}`);
    console.log(`   ID: ${result.insertId}`);
    
    // Mostrar todos los usuarios
    console.log('\n📊 Listado de usuarios en la base de datos:');
    const [allUsers] = await connection.query(
      'SELECT id, email, name, role, createdAt FROM users ORDER BY id'
    );
    
    console.log(`\n   Total: ${allUsers.length} usuario(s)\n`);
    allUsers.forEach(user => {
      console.log(`   • ID: ${user.id}`);
      console.log(`     Email: ${user.email}`);
      console.log(`     Nombre: ${user.name}`);
      console.log(`     Role: ${user.role}`);
      console.log(`     Creado: ${user.createdAt}`);
      console.log('');
    });
    
    console.log('✓ Proceso completado exitosamente');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.code) {
      console.error(`   Código de error: ${error.code}`);
    }
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Conexión cerrada');
    }
  }
}

// Ejecutar
createAdminUser();
