#!/usr/bin/env node
/**
 * Script para configurar la base de datos:
 * 1. Ejecutar migraciones de Drizzle
 * 2. Crear usuario administrador
 */

import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import { users } from './drizzle/schema.js';
import { eq } from 'drizzle-orm';

const DATABASE_URL = process.env.DATABASE_URL || 'mysql://root:mKizRABJCGHQZrPvXJUZfvHVJRqlpXir@ballast.proxy.rlwy.net:43004/railway';
const ADMIN_EMAIL = 'admin@contafacil.com';
const ADMIN_PASSWORD = 'Admin123!';
const ADMIN_NAME = 'Administrador';

async function setupDatabase() {
  console.log('🚀 Iniciando configuración de base de datos...\n');

  try {
    // Conectar a la base de datos
    console.log('📡 Conectando a la base de datos...');
    const connection = await mysql.createConnection(DATABASE_URL);
    const db = drizzle(connection);
    console.log('✅ Conexión establecida\n');

    // Verificar si la tabla users existe
    console.log('🔍 Verificando estructura de base de datos...');
    const [tables] = await connection.query('SHOW TABLES');
    console.log(`📊 Tablas encontradas: ${tables.length}`);
    
    if (tables.length === 0) {
      console.log('\n⚠️  No se encontraron tablas. Necesitas ejecutar las migraciones de Drizzle.');
      console.log('💡 Ejecuta: pnpm drizzle-kit push\n');
      await connection.end();
      process.exit(1);
    }

    console.log('✅ Estructura de base de datos verificada\n');

    // Verificar si ya existe un usuario administrador
    console.log('👤 Verificando usuarios existentes...');
    const existingUsers = await db.select().from(users);
    console.log(`📋 Usuarios encontrados: ${existingUsers.length}`);

    const existingAdmins = existingUsers.filter(user => user.role === 'admin');
    
    if (existingAdmins.length > 0) {
      console.log('\n⚠️  Ya existe un usuario administrador:');
      existingAdmins.forEach(admin => {
        console.log(`   - Email: ${admin.email}`);
        console.log(`   - Nombre: ${admin.name}`);
        console.log(`   - ID: ${admin.id}`);
      });
      console.log('\n💡 Usa estas credenciales para acceder al sistema.');
      await connection.end();
      return;
    }

    // Verificar si el email ya existe
    const existingUser = existingUsers.find(user => user.email === ADMIN_EMAIL);
    
    if (existingUser) {
      console.log(`\n⚠️  Ya existe un usuario con el email ${ADMIN_EMAIL}`);
      console.log(`   - Nombre: ${existingUser.name}`);
      console.log(`   - Rol: ${existingUser.role}`);
      console.log(`   - ID: ${existingUser.id}`);
      await connection.end();
      return;
    }

    // Crear usuario administrador
    console.log('\n🔐 Creando usuario administrador...');
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, salt);

    const [result] = await connection.query(
      'INSERT INTO users (email, passwordHash, name, role, createdAt, updatedAt) VALUES (?, ?, ?, ?, NOW(), NOW())',
      [ADMIN_EMAIL, passwordHash, ADMIN_NAME, 'admin']
    );

    console.log('✅ Usuario administrador creado exitosamente!\n');
    console.log('═══════════════════════════════════════════');
    console.log('📧 Email:      ' + ADMIN_EMAIL);
    console.log('🔑 Contraseña: ' + ADMIN_PASSWORD);
    console.log('👤 Nombre:     ' + ADMIN_NAME);
    console.log('🆔 ID:         ' + result.insertId);
    console.log('═══════════════════════════════════════════\n');

    console.log('🎉 Configuración completada exitosamente!');
    console.log('🌐 Ahora puedes acceder a: https://web-production-926df.up.railway.app/\n');

    await connection.end();
  } catch (error) {
    console.error('\n❌ Error durante la configuración:');
    console.error(error);
    process.exit(1);
  }
}

setupDatabase();
