/**
 * Endpoint temporal para configurar la base de datos
 * Este endpoint ejecutará las migraciones y creará el usuario administrador
 */

import { Express, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { getDb } from './db';
import { users } from '../drizzle/schema';
import mysql from 'mysql2/promise';

const ADMIN_EMAIL = 'admin@contafacil.com';
const ADMIN_PASSWORD = 'Admin123!';
const ADMIN_NAME = 'Administrador';

export function registerSetupEndpoint(app: Express) {
  app.get('/api/setup-database', async (req: Request, res: Response) => {
    try {
      console.log('🚀 Iniciando configuración de base de datos...');

      // Conectar a la base de datos directamente
      const DATABASE_URL = process.env.DATABASE_URL;
      if (!DATABASE_URL) {
        throw new Error('DATABASE_URL no está configurada');
      }

      console.log('📡 Conectando a la base de datos...');
      const connection = await mysql.createConnection(DATABASE_URL);
      console.log('✅ Conexión establecida');

      // Verificar si las tablas existen
      console.log('🔍 Verificando estructura de base de datos...');
      const [tables]: any = await connection.query('SHOW TABLES');
      console.log(`📊 Tablas encontradas: ${tables.length}`);

      if (tables.length === 0) {
        await connection.end();
        return res.json({
          success: false,
          message: 'No se encontraron tablas en la base de datos',
          action: 'Necesitas ejecutar las migraciones de Drizzle primero',
          hint: 'Las migraciones se ejecutarán automáticamente en el próximo deployment'
        });
      }

      // Verificar si la tabla users existe
      const tableNames = tables.map((t: any) => Object.values(t)[0]);
      if (!tableNames.includes('users')) {
        await connection.end();
        return res.json({
          success: false,
          message: 'La tabla users no existe',
          tables: tableNames,
          action: 'Las migraciones de Drizzle necesitan ejecutarse'
        });
      }

      console.log('✅ Tabla users encontrada');

      // Verificar si ya existe un usuario administrador
      console.log('👤 Verificando usuarios existentes...');
      const [existingUsers]: any = await connection.query('SELECT * FROM users');
      console.log(`📋 Usuarios encontrados: ${existingUsers.length}`);

      const existingAdmins = existingUsers.filter((user: any) => user.role === 'admin');

      if (existingAdmins.length > 0) {
        console.log('⚠️  Ya existe un usuario administrador');
        await connection.end();
        return res.json({
          success: false,
          message: 'Ya existe un usuario administrador en la base de datos',
          existingAdmins: existingAdmins.map((admin: any) => ({
            id: admin.id,
            email: admin.email,
            name: admin.name,
            role: admin.role
          }))
        });
      }

      // Verificar si el email ya existe
      const existingUser = existingUsers.find((user: any) => user.email === ADMIN_EMAIL);

      if (existingUser) {
        console.log(`⚠️  Ya existe un usuario con el email ${ADMIN_EMAIL}`);
        await connection.end();
        return res.json({
          success: false,
          message: `Ya existe un usuario con el email ${ADMIN_EMAIL}`,
          user: {
            id: existingUser.id,
            email: existingUser.email,
            name: existingUser.name,
            role: existingUser.role
          }
        });
      }

      // Crear usuario administrador
      console.log('🔐 Creando usuario administrador...');
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, salt);

      const [result]: any = await connection.query(
        'INSERT INTO users (email, passwordHash, name, role, createdAt, updatedAt) VALUES (?, ?, ?, ?, NOW(), NOW())',
        [ADMIN_EMAIL, passwordHash, ADMIN_NAME, 'admin']
      );

      console.log('✅ Usuario administrador creado exitosamente!');
      console.log(`   Email: ${ADMIN_EMAIL}`);
      console.log(`   Contraseña: ${ADMIN_PASSWORD}`);
      console.log(`   ID: ${result.insertId}`);

      await connection.end();

      return res.json({
        success: true,
        message: 'Usuario administrador creado exitosamente',
        credentials: {
          email: ADMIN_EMAIL,
          password: ADMIN_PASSWORD,
          id: result.insertId
        },
        totalUsers: existingUsers.length + 1
      });

    } catch (error) {
      console.error('❌ Error durante la configuración:', error);
      return res.status(500).json({
        success: false,
        message: 'Error durante la configuración de la base de datos',
        error: error instanceof Error ? error.message : 'Error desconocido',
        stack: error instanceof Error ? error.stack : undefined
      });
    }
  });

  console.log('✓ Endpoint temporal /api/setup-database registrado');
}
