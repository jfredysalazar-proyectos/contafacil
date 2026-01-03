import mysql from "mysql2/promise";

const connection = await mysql.createConnection(process.env.DATABASE_URL);

try {
  await connection.execute(`
    ALTER TABLE users ADD COLUMN logoUrl TEXT AFTER businessName
  `);
  console.log("✓ Column logoUrl added successfully");
} catch (error) {
  if (error.code === 'ER_DUP_FIELDNAME') {
    console.log("✓ Column logoUrl already exists");
  } else {
    console.error("Error:", error.message);
  }
} finally {
  await connection.end();
}
