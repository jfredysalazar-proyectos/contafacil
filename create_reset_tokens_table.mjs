import { drizzle } from "drizzle-orm/mysql2";
import "dotenv/config";

const db = drizzle(process.env.DATABASE_URL);

try {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id INT AUTO_INCREMENT PRIMARY KEY,
      userId INT NOT NULL,
      token VARCHAR(255) NOT NULL UNIQUE,
      expiresAt TIMESTAMP NOT NULL,
      used BOOLEAN NOT NULL DEFAULT FALSE,
      createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  console.log("Tabla password_reset_tokens creada exitosamente");
  process.exit(0);
} catch (error) {
  console.error("Error:", error);
  process.exit(1);
}
