import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import cookieParser from "cookie-parser";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { registerAdminEndpoint } from "../create-admin-endpoint";
import { registerSetupEndpoint } from "../setup-database-endpoint";
import mysql from "mysql2/promise";

/**
 * Ejecuta las migraciones pendientes al arrancar el servidor.
 * Solo crea tablas/columnas que no existen (idempotente).
 */
async function runStartupMigrations() {
  const DATABASE_URL = process.env.DATABASE_URL;
  if (!DATABASE_URL) return;
  let connection: mysql.Connection | null = null;
  try {
    connection = await mysql.createConnection(DATABASE_URL);
    // Crear tabla serial_numbers si no existe
    await connection.query(`
      CREATE TABLE IF NOT EXISTS \`serial_numbers\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`userId\` INT NOT NULL,
        \`serialNumber\` VARCHAR(255) NOT NULL,
        \`productId\` INT NOT NULL,
        \`productName\` TEXT NOT NULL,
        \`saleId\` INT NOT NULL,
        \`saleNumber\` VARCHAR(50) NOT NULL,
        \`customerId\` INT,
        \`customerName\` TEXT,
        \`saleDate\` DATETIME NOT NULL,
        \`warrantyDays\` INT NOT NULL DEFAULT 90,
        \`createdAt\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX \`serialNumbers_userId_idx\` (\`userId\`),
        INDEX \`serialNumbers_serialNumber_idx\` (\`serialNumber\`),
        INDEX \`serialNumbers_productId_idx\` (\`productId\`),
        INDEX \`serialNumbers_saleId_idx\` (\`saleId\`),
        INDEX \`serialNumbers_saleDate_idx\` (\`saleDate\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    // Agregar columna warrantyDays si la tabla ya existía sin ella
    const [cols]: any = await connection.query(
      `SELECT COUNT(*) as cnt FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'serial_numbers'
         AND COLUMN_NAME = 'warrantyDays'`
    );
    if (cols[0].cnt === 0) {
      await connection.query(
        `ALTER TABLE \`serial_numbers\` ADD COLUMN \`warrantyDays\` INT NOT NULL DEFAULT 90 AFTER \`saleDate\``
      );
      console.log("[Migration] Columna warrantyDays agregada a serial_numbers");
    }
    console.log("[Migration] Tabla serial_numbers OK");
  } catch (err: any) {
    console.warn("[Migration] Error en migraciones de startup (no fatal):", err.message);
  } finally {
    if (connection) await connection.end().catch(() => {});
  }
}

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  // Ejecutar migraciones pendientes antes de arrancar
  await runStartupMigrations();

  const app = express();
  const server = createServer(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  // Configure cookie parser
  app.use(cookieParser());
  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);
  // Temporary endpoint to create admin user
  registerAdminEndpoint(app);
  // Setup database endpoint
  registerSetupEndpoint(app);
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  
  // In production (Railway), use the exact port provided
  // In development, find an available port if the preferred one is busy
  let port = preferredPort;
  if (process.env.NODE_ENV === "development") {
    port = await findAvailablePort(preferredPort);
    if (port !== preferredPort) {
      console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
    }
  }

  server.listen(port, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${port}/`);
  });
}

startServer().catch(console.error);
