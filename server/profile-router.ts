import { router, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { getDb } from "./db";
import { users } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
// Cloudinary se importa dinámicamente en uploadLogo

export const profileRouter = router({
  /**
   * Obtiene el perfil del usuario actual
   */
  getProfile: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Base de datos no disponible",
      });
    }

    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        phone: users.phone,
        businessName: users.businessName,
        nit: users.nit,
        address: users.address,
        logoUrl: users.logoUrl,
        salesPrefix: users.salesPrefix,
        salesNextNumber: users.salesNextNumber,
        quotationsPrefix: users.quotationsPrefix,
        quotationsNextNumber: users.quotationsNextNumber,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, ctx.user.id))
      .limit(1);

    if (!user) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Usuario no encontrado",
      });
    }

    return user;
  }),

  /**
   * Actualiza la información del perfil del usuario
   */
  updateProfile: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1, "El nombre es requerido").optional(),
        phone: z.string().optional(),
        businessName: z.string().optional(),
        nit: z.string().optional(),
        address: z.string().optional(),
        salesPrefix: z.string().max(10).optional(),
        salesNextNumber: z.number().int().min(1).optional(),
        quotationsPrefix: z.string().max(10).optional(),
        quotationsNextNumber: z.number().int().min(1).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Base de datos no disponible",
        });
      }

      // Construir objeto de actualización solo con campos proporcionados
      const updateData: any = {};
      if (input.name !== undefined) updateData.name = input.name;
      if (input.phone !== undefined) updateData.phone = input.phone || null;
      if (input.businessName !== undefined) updateData.businessName = input.businessName || null;
      if (input.nit !== undefined) updateData.nit = input.nit || null;
      if (input.address !== undefined) updateData.address = input.address || null;
      if (input.salesPrefix !== undefined) updateData.salesPrefix = input.salesPrefix;
      if (input.salesNextNumber !== undefined) updateData.salesNextNumber = input.salesNextNumber;
      if (input.quotationsPrefix !== undefined) updateData.quotationsPrefix = input.quotationsPrefix;
      if (input.quotationsNextNumber !== undefined) updateData.quotationsNextNumber = input.quotationsNextNumber;

      if (Object.keys(updateData).length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No hay datos para actualizar",
        });
      }

      await db.update(users).set(updateData).where(eq(users.id, ctx.user.id));

      return {
        success: true,
        message: "Perfil actualizado exitosamente",
      };
    }),

  /**
   * Cambia la contraseña del usuario
   */
  changePassword: protectedProcedure
    .input(
      z.object({
        currentPassword: z.string().min(1, "La contraseña actual es requerida"),
        newPassword: z.string().min(6, "La nueva contraseña debe tener al menos 6 caracteres"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Base de datos no disponible",
        });
      }

      // Obtener usuario actual con su hash de contraseña
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, ctx.user.id))
        .limit(1);

      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Usuario no encontrado",
        });
      }

      // Verificar contraseña actual
      const isValidPassword = await bcrypt.compare(input.currentPassword, user.passwordHash);
      if (!isValidPassword) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "La contraseña actual es incorrecta",
        });
      }

      // Hash de la nueva contraseña
      const newPasswordHash = await bcrypt.hash(input.newPassword, 10);

      // Actualizar contraseña
      await db
        .update(users)
        .set({ passwordHash: newPasswordHash })
        .where(eq(users.id, ctx.user.id));

      return {
        success: true,
        message: "Contraseña cambiada exitosamente",
      };
    }),

  /**
   * Sube el logo del negocio a S3
   */
  uploadLogo: protectedProcedure
    .input(
      z.object({
        base64Image: z.string(),
        mimeType: z.enum(["image/png", "image/jpeg", "image/jpg", "image/svg+xml"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Base de datos no disponible",
        });
      }

      // Validar tamaño (máximo 2MB en base64)
      const sizeInBytes = (input.base64Image.length * 3) / 4;
      const maxSize = 2 * 1024 * 1024; // 2MB
      if (sizeInBytes > maxSize) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "El logo no puede superar los 2MB",
        });
      }

      // Subir a Cloudinary
      const { uploadImageToCloudinary } = await import("./cloudinary-service");
      const { url } = await uploadImageToCloudinary(
        input.base64Image,
        `contafacil/logos/${ctx.user.id}`
      );

      // Actualizar en base de datos
      await db.update(users).set({ logoUrl: url }).where(eq(users.id, ctx.user.id));

      return {
        success: true,
        logoUrl: url,
        message: "Logo subido exitosamente",
      };
    }),

  /**
   * Elimina el logo del negocio
   */
  deleteLogo: protectedProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();
    if (!db) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Base de datos no disponible",
      });
    }

    await db.update(users).set({ logoUrl: null }).where(eq(users.id, ctx.user.id));

    return {
      success: true,
      message: "Logo eliminado exitosamente",
    };
  }),
});
