/**
 * Endpoint temporal para crear usuario administrador
 * Este archivo será importado en el servidor principal
 */

import { Express, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { getDb, createUser, getUserByEmail } from './db';
import { users } from '../drizzle/schema';

const ADMIN_EMAIL = 'admin@contafacil.com';
const ADMIN_PASSWORD = 'Admin123!';
const ADMIN_NAME = 'Administrador';

export function registerAdminEndpoint(app: Express) {
  // Endpoint de diagnóstico
  app.get('/api/db-test', async (req: Request, res: Response) => {
    try {
      console.log('🔍 Probando conexión a base de datos...');
      
      const db = await getDb();
      if (!db) {
        return res.json({
          success: false,
          message: 'No se pudo obtener la conexión a la base de datos',
          env: {
            hasDatabaseUrl: !!process.env.DATABASE_URL,
            databaseUrlPrefix: process.env.DATABASE_URL?.substring(0, 20) + '...'
          }
        });
      }

      console.log('✓ Conexión obtenida, intentando consulta...');
      
      // Intentar una consulta simple
      try {
        const result = await db.select().from(users).limit(1);
        return res.json({
          success: true,
          message: 'Conexión exitosa',
          userCount: result.length,
          hasUsers: result.length > 0
        });
      } catch (queryError) {
        return res.json({
          success: false,
          message: 'Error al ejecutar consulta',
          error: queryError instanceof Error ? queryError.message : 'Error desconocido',
          stack: queryError instanceof Error ? queryError.stack : undefined
        });
      }
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Error general',
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  });

  // Endpoint para crear usuario administrador
  app.get('/api/create-admin-user', async (req: Request, res: Response) => {
    try {
      console.log('🔐 Iniciando creación de usuario administrador...');

      const db = await getDb();
      if (!db) {
        throw new Error('Base de datos no disponible');
      }

      console.log('✓ Conexión a base de datos establecida');

      // Obtener todos los usuarios
      let allUsers;
      try {
        allUsers = await db.select().from(users);
      } catch (selectError) {
        throw new Error(`Error al obtener usuarios: ${selectError instanceof Error ? selectError.message : 'Error desconocido'}`);
      }
      
      // Filtrar usuarios administradores en JavaScript
      const existingAdmins = allUsers.filter(user => user.role === 'admin');

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

      // Insertar usuario administrador usando la función createUser
      console.log('👤 Creando usuario administrador...');
      const result = await createUser({
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

      // Obtener todos los usuarios actualizados
      const updatedUsers = await db.select().from(users);

      return res.json({
        success: true,
        message: 'Usuario administrador creado exitosamente',
        credentials: {
          email: ADMIN_EMAIL,
          password: ADMIN_PASSWORD,
          id: insertId
        },
        totalUsers: updatedUsers.length,
        users: updatedUsers.map(user => ({
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

  console.log('✓ Endpoints temporales registrados: /api/db-test y /api/create-admin-user');
}
