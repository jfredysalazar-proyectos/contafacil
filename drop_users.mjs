import { drizzle } from "drizzle-orm/mysql2";
import { config } from "dotenv";

config();

const db = drizzle(process.env.DATABASE_URL);

try {
  await db.execute("DROP TABLE IF EXISTS users");
  console.log("✓ Tabla users eliminada exitosamente");
} catch (error) {
  console.error("Error:", error);
}

process.exit(0);
