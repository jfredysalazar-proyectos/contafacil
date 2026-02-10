import { z } from "zod";
import { protectedProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "./db";
import { users } from "../drizzle/schema";
import { eq, ne } from "drizzle-orm";
import { checkMembershipStatus } from "./membership-middleware";

export const membershipRouter = router({
  // Obtener estado de membresía del usuario actual
  getMyMembership: protectedProcedure.query(async ({ ctx }) => {
    const status = await checkMembershipStatus(ctx.user.id, ctx.user.email);
    
    const db = await getDb();
    const [user] = await db
      .select({
        membershipStatus: users.membershipStatus,
        membershipStartDate: users.membershipStartDate,
        membershipEndDate: users.membershipEndDate,
      })
      .from(users)
      .where(eq(users.id, ctx.user.id))
      .limit(1);

    return {
      ...status,
      startDate: user?.membershipStartDate,
      endDate: user?.membershipEndDate,
    };
  }),

  // Obtener todos los usuarios (solo admin)
  getAllUsers: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.email !== "admin@contafacil.com") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Solo el administrador puede ver todos los usuarios",
      });
    }

    const db = await getDb();
    const allUsers = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        businessName: users.businessName,
        phone: users.phone,
        membershipStatus: users.membershipStatus,
        membershipStartDate: users.membershipStartDate,
        membershipEndDate: users.membershipEndDate,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(ne(users.email, "admin@contafacil.com")) // Excluir admin de la lista
      .orderBy(users.createdAt);

    // Calcular días restantes para cada usuario
    const now = new Date();
    return allUsers.map(user => {
      let daysRemaining = null;
      if (user.membershipEndDate) {
        const endDate = new Date(user.membershipEndDate);
        daysRemaining = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        if (daysRemaining < 0) daysRemaining = 0;
      }

      return {
        ...user,
        daysRemaining,
      };
    });
  }),

  // Extender membresía de un usuario (solo admin)
  extendMembership: protectedProcedure
    .input(
      z.object({
        userId: z.number(),
        duration: z.number().min(1), // Duración en días
        durationType: z.enum(["days", "months", "years"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.email !== "admin@contafacil.com") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Solo el administrador puede extender membresías",
        });
      }

      const db = await getDb();

      // Obtener usuario
      const [user] = await db
        .select({
          membershipEndDate: users.membershipEndDate,
        })
        .from(users)
        .where(eq(users.id, input.userId))
        .limit(1);

      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Usuario no encontrado",
        });
      }

      // Calcular nueva fecha de fin
      const startDate = user.membershipEndDate && new Date(user.membershipEndDate) > new Date()
        ? new Date(user.membershipEndDate) // Si aún tiene tiempo, extender desde la fecha actual de fin
        : new Date(); // Si ya expiró, extender desde hoy

      const newEndDate = new Date(startDate);

      switch (input.durationType) {
        case "days":
          newEndDate.setDate(newEndDate.getDate() + input.duration);
          break;
        case "months":
          newEndDate.setMonth(newEndDate.getMonth() + input.duration);
          break;
        case "years":
          newEndDate.setFullYear(newEndDate.getFullYear() + input.duration);
          break;
      }

      // Actualizar membresía
      await db
        .update(users)
        .set({
          membershipStatus: "active",
          membershipEndDate: newEndDate,
        })
        .where(eq(users.id, input.userId));

      return {
        success: true,
        newEndDate,
      };
    }),

  // Revocar membresía de un usuario (solo admin)
  revokeMembership: protectedProcedure
    .input(
      z.object({
        userId: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.email !== "admin@contafacil.com") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Solo el administrador puede revocar membresías",
        });
      }

      const db = await getDb();

      // Actualizar membresía a expirada
      await db
        .update(users)
        .set({
          membershipStatus: "expired",
          membershipEndDate: new Date(), // Expira inmediatamente
        })
        .where(eq(users.id, input.userId));

      return {
        success: true,
      };
    }),
});
