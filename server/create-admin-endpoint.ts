/**
 * Endpoint temporal para crear usuario administrador
 * Este archivo será importado en el servidor principal
 */

import { Express, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { db } from './db';
import { users } from '../drizzle/schema';
import { eq } from 'drizzle-orm';

const ADMIN_EMAIL = 'admin@contafacil.com';
const ADMIN_PASSWORD = 'Admin123!';
const ADMIN_NAME = 'Administrador';

export function registerAdminEndpoint(app: Express) {
  // Endpoint para crear usuario administrador
  app.get('/api/create-admin-user', async (req: Request, res: Response) => {
    try {
      console.log('🔐 Iniciando creación de usuario administrador...');

      // Verificar si ya existe un usuario administrador
      const existingAdmins = await db
        .select()
        .from(users)
        .where(eq(users.role, 'admin'));

      if (existingAdmins.length > 0) {
        console.log('⚠️  Ya existe un usuario administrador');
        return res.json({
          success: false,
          message: 'Ya existe un usuario administrador en la base de datos',
          existingAdmins: existingAdmins.map(admin => ({
            id: admin.id,
            email: admin.email,
            name: admin.name,
            role: admin.role
          }))
        });
      }

      // Verificar si el email ya existe
      const existingUser = await db
        .select()
        .from(users)
        .where(eq(users.email, ADMIN_EMAIL));

      if (existingUser.length > 0) {
        console.log('⚠️  Ya existe un usuario con el email especificado');
        return res.json({
          success: false,
          message: `Ya existe un usuario con el email ${ADMIN_EMAIL}`,
          user: {
            id: existingUser[0].id,
            email: existingUser[0].email,
            name: existingUser[0].name,
            role: existingUser[0].role
          }
        });
      }

      // Crear hash de la contraseña
      console.log('🔐 Generando hash de contraseña...');
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, salt);

      // Insertar usuario administrador
      console.log('👤 Creando usuario administrador...');
      const result = await db.insert(users).values({
        email: ADMIN_EMAIL,
        passwordHash,
        name: ADMIN_NAME,
        role: 'admin',
      });

      const insertId = result[0].insertId;

      console.log('✅ Usuario administrador creado exitosamente!');
      console.log(`   Email: ${ADMIN_EMAIL}`);
      console.log(`   Contraseña: ${ADMIN_PASSWORD}`);
      console.log(`   ID: ${insertId}`);

      // Obtener todos los usuarios para mostrar
      const allUsers = await db.select().from(users);

      return res.json({
        success: true,
        message: 'Usuario administrador creado exitosamente',
        credentials: {
          email: ADMIN_EMAIL,
          password: ADMIN_PASSWORD,
          id: insertId
        },
        totalUsers: allUsers.length,
        users: allUsers.map(user => ({
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
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  });

  console.log('✓ Endpoint temporal /api/create-admin-user registrado');
}
