import { createConnection } from "mysql2/promise";
import * as dotenv from "dotenv";
dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;

async function migrate() {
  const connection = await createConnection(DATABASE_URL);
  console.log("Conectado a la base de datos");

  try {
    // Agregar columna isService a products
    await connection.execute(`
      ALTER TABLE products 
      ADD COLUMN IF NOT EXISTS isService BOOLEAN NOT NULL DEFAULT FALSE
    `);
    console.log("✓ Columna isService agregada a products");
  } catch (e) {
    if (e.message.includes("Duplicate column")) {
      console.log("✓ Columna isService ya existe en products");
    } else {
      console.error("Error en isService:", e.message);
    }
  }

  try {
    // Agregar columna servicesModuleEnabled a users
    await connection.execute(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS servicesModuleEnabled BOOLEAN NOT NULL DEFAULT FALSE
    `);
    console.log("✓ Columna servicesModuleEnabled agregada a users");
  } catch (e) {
    if (e.message.includes("Duplicate column")) {
      console.log("✓ Columna servicesModuleEnabled ya existe en users");
    } else {
      console.error("Error en servicesModuleEnabled:", e.message);
    }
  }

  await connection.end();
  console.log("Migración completada");
}

migrate().catch(console.error);
