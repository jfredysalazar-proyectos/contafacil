/**
 * Endpoint temporal para crear usuario administrador
 * Este archivo será importado en el servidor principal
 */

import { Express, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { getDb, createUser, getUserByEmail } from './db';
import { users } from '../drizzle/schema';
import { eq, sql } from 'drizzle-orm';

const ADMIN_EMAIL = 'admin@contafacil.com';
const ADMIN_PASSWORD = 'Admin123!';
const ADMIN_NAME = 'Administrador';

export function registerAdminEndpoint(app: Express) {
  // Endpoint para crear usuario administrador
  app.get('/api/create-admin-user', async (req: Request, res: Response) => {
    try {
      console.log('🔐 Iniciando creación de usuario administrador...');

      const db = await getDb();
      if (!db) {
        throw new Error('Base de datos no disponible');
      }

      console.log('✓ Conexión a base de datos establecida');

      // Verificar si ya existe un usuario administrador usando SQL raw
      const existingAdminsResult = await db.execute(
        sql`SELECT id, email, name, role FROM users WHERE role = 'admin'`
      );
      
      const existingAdmins = existingAdminsResult.rows as any[];

      if (existingAdmins.length > 0) {
        console.log('⚠️  Ya existe un usuario administrador');
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
      const existingUser = await getUserByEmail(ADMIN_EMAIL);

      if (existingUser) {
        console.log('⚠️  Ya existe un usuario con el email especificado');
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

      // Crear hash de la contraseña
      console.log('🔐 Generando hash de contraseña...');
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, salt);

      // Insertar usuario administrador usando SQL raw para evitar problemas con el enum
      console.log('👤 Creando usuario administrador...');
      const insertResult = await db.execute(
        sql`INSERT INTO users (email, passwordHash, name, role, createdAt, updatedAt, lastSignedIn)
            VALUES (${ADMIN_EMAIL}, ${passwordHash}, ${ADMIN_NAME}, 'admin', NOW(), NOW(), NOW())`
      );

      const insertId = (insertResult as any).insertId || 0;

      console.log('✅ Usuario administrador creado exitosamente!');
      console.log(`   Email: ${ADMIN_EMAIL}`);
      console.log(`   Contraseña: ${ADMIN_PASSWORD}`);
      console.log(`   ID: ${insertId}`);

      // Obtener todos los usuarios para mostrar
      const allUsersResult = await db.execute(
        sql`SELECT id, email, name, role, createdAt FROM users ORDER BY id`
      );
      
      const allUsers = allUsersResult.rows as any[];

      return res.json({
        success: true,
        message: 'Usuario administrador creado exitosamente',
        credentials: {
          email: ADMIN_EMAIL,
          password: ADMIN_PASSWORD,
          id: insertId
        },
        totalUsers: allUsers.length,
        users: allUsers.map((user: any) => ({
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          createdAt: user.createdAt
        }))
      });

    } catch (error) {
      console.error('❌ Error al crear usuario administrador:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al crear usuario administrador',
        error: error instanceof Error ? error.message : 'Error desconocido',
        stack: error instanceof Error ? error.stack : undefined
      });
    }
  });

  console.log('✓ Endpoint temporal /api/create-admin-user registrado');
}
