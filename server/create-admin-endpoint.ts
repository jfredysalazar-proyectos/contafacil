/**
 * Endpoint temporal para crear usuario administrador
 * Este archivo será importado en el servidor principal
 */

import { Express, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import mysql from 'mysql2/promise';

const ADMIN_EMAIL = 'admin@contafacil.com';
const ADMIN_PASSWORD = 'Admin123!';
const ADMIN_NAME = 'Administrador';

export function registerAdminEndpoint(app: Express) {
  // Endpoint para crear usuario administrador
  app.get('/api/create-admin-user', async (req: Request, res: Response) => {
    let connection: mysql.Connection | null = null;
    
    try {
      console.log('🔐 Iniciando creación de usuario administrador...');

      if (!process.env.DATABASE_URL) {
        throw new Error('DATABASE_URL no está configurada');
      }

      // Crear conexión directa a MySQL
      connection = await mysql.createConnection(process.env.DATABASE_URL);
      
      console.log('✓ Conexión a base de datos establecida');

      // Verificar si ya existe un usuario administrador
      const [existingAdmins] = await connection.query<mysql.RowDataPacket[]>(
        "SELECT id, email, name, role FROM users WHERE role = 'admin'"
      );

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
      const [existingUser] = await connection.query<mysql.RowDataPacket[]>(
        'SELECT id, email, name, role FROM users WHERE email = ?',
        [ADMIN_EMAIL]
      );

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
      const [result] = await connection.query<mysql.ResultSetHeader>(
        `INSERT INTO users (email, passwordHash, name, role, createdAt, updatedAt, lastSignedIn)
         VALUES (?, ?, ?, 'admin', NOW(), NOW(), NOW())`,
        [ADMIN_EMAIL, passwordHash, ADMIN_NAME]
      );

      const insertId = result.insertId;

      console.log('✅ Usuario administrador creado exitosamente!');
      console.log(`   Email: ${ADMIN_EMAIL}`);
      console.log(`   Contraseña: ${ADMIN_PASSWORD}`);
      console.log(`   ID: ${insertId}`);

      // Obtener todos los usuarios para mostrar
      const [allUsers] = await connection.query<mysql.RowDataPacket[]>(
        'SELECT id, email, name, role, createdAt FROM users ORDER BY id'
      );

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
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    } finally {
      if (connection) {
        await connection.end();
        console.log('✓ Conexión cerrada');
      }
    }
  });

  console.log('✓ Endpoint temporal /api/create-admin-user registrado');
}
