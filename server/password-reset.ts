import { getDb } from "./db";
import { passwordResetTokens, users } from "../drizzle/schema";
import { eq, and, gt } from "drizzle-orm";
import { nanoid } from "nanoid";
import bcrypt from "bcryptjs";

/**
 * Crea un token de recuperación de contraseña
 * El token expira en 15 minutos
 */
export async function createPasswordResetToken(email: string): Promise<string | null> {
  const db = await getDb();
  if (!db) return null;

  // Buscar usuario por email
  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  
  if (!user) {
    // Por seguridad, no revelamos si el email existe o no
    return null;
  }

  // Generar token seguro
  const token = nanoid(32);
  
  // Calcular fecha de expiración (15 minutos)
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

  // Guardar token en la base de datos
  await db.insert(passwordResetTokens).values({
    userId: user.id,
    token,
    expiresAt,
    used: false,
  });

  return token;
}

/**
 * Valida un token de recuperación
 * Retorna el userId si el token es válido, null si no
 */
export async function validatePasswordResetToken(token: string): Promise<number | null> {
  const db = await getDb();
  if (!db) return null;

  const [resetToken] = await db
    .select()
    .from(passwordResetTokens)
    .where(
      and(
        eq(passwordResetTokens.token, token),
        eq(passwordResetTokens.used, false),
        gt(passwordResetTokens.expiresAt, new Date())
      )
    )
    .limit(1);

  if (!resetToken) {
    return null;
  }

  return resetToken.userId;
}

/**
 * Restablece la contraseña del usuario y marca el token como usado
 */
export async function resetPassword(token: string, newPassword: string): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  // Validar token
  const userId = await validatePasswordResetToken(token);
  if (!userId) {
    return false;
  }

  // Hash de la nueva contraseña
  const passwordHash = await bcrypt.hash(newPassword, 10);

  // Actualizar contraseña del usuario
  await db.update(users).set({ passwordHash }).where(eq(users.id, userId));

  // Marcar token como usado
  await db
    .update(passwordResetTokens)
    .set({ used: true })
    .where(eq(passwordResetTokens.token, token));

  return true;
}

/**
 * Limpia tokens expirados (puede ejecutarse periódicamente)
 */
export async function cleanupExpiredTokens(): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  
  await db
    .delete(passwordResetTokens)
    .where(
      and(
        eq(passwordResetTokens.used, true),
        // Eliminar tokens usados o expirados hace más de 24 horas
        gt(passwordResetTokens.createdAt, oneDayAgo)
      )
    );
}
