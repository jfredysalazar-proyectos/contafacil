import { TRPCError } from "@trpc/server";
import { getDb } from "./db";
import { users } from "../drizzle/schema";
import { eq } from "drizzle-orm";

/**
 * Verifica si la membresía del usuario está activa
 * Actualiza el estado automáticamente si ha expirado
 */
export async function checkMembershipStatus(userId: number, userEmail: string) {
  // El admin siempre tiene acceso
  if (userEmail === "admin@contafacil.com") {
    return { isActive: true, status: "active" as const, daysRemaining: null };
  }

  const db = await getDb();
  
  // Obtener información de membresía del usuario
  const [user] = await db
    .select({
      membershipStatus: users.membershipStatus,
      membershipEndDate: users.membershipEndDate,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Usuario no encontrado",
    });
  }

  // Si no tiene fecha de fin, está activo (admin o membresía ilimitada)
  if (!user.membershipEndDate) {
    return { isActive: true, status: user.membershipStatus, daysRemaining: null };
  }

  const now = new Date();
  const endDate = new Date(user.membershipEndDate);
  const isExpired = now > endDate;

  // Actualizar estado si ha expirado
  if (isExpired && user.membershipStatus !== "expired") {
    await db
      .update(users)
      .set({ membershipStatus: "expired" })
      .where(eq(users.id, userId));
    
    return { isActive: false, status: "expired" as const, daysRemaining: 0 };
  }

  // Calcular días restantes
  const daysRemaining = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  return {
    isActive: !isExpired,
    status: user.membershipStatus,
    daysRemaining: daysRemaining > 0 ? daysRemaining : 0,
  };
}

/**
 * Middleware para proteger rutas que requieren membresía activa
 */
export async function requireActiveMembership(userId: number, userEmail: string) {
  const { isActive, daysRemaining } = await checkMembershipStatus(userId, userEmail);

  if (!isActive) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Tu membresía ha expirado. Contacta al administrador para renovarla.",
    });
  }

  return { daysRemaining };
}
