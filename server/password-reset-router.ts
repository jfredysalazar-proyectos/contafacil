import { router, publicProcedure } from "./_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  createPasswordResetToken,
  validatePasswordResetToken,
  resetPassword,
} from "./password-reset";
import { sendPasswordResetEmail } from "./email-service";

export const passwordResetRouter = router({
  /**
   * Solicita un token de recuperación de contraseña
   * Envía un email al usuario con el enlace de recuperación
   */
  requestReset: publicProcedure
    .input(
      z.object({
        email: z.string().email("Email inválido"),
      })
    )
    .mutation(async ({ input }) => {
      const token = await createPasswordResetToken(input.email);

      if (token) {
        // Construir enlace de recuperación
        const baseUrl = process.env.VITE_FRONTEND_FORGE_API_URL || "http://localhost:3000";
        const resetLink = `${baseUrl}/reset-password?token=${token}`;
        
        // Enviar email con el enlace de recuperación
        const emailSent = await sendPasswordResetEmail(input.email, resetLink, 15);
        
        if (!emailSent) {
          // Si el email no se pudo enviar, al menos logueamos el enlace
          console.log("[Password Reset] Email not sent, reset link:", resetLink);
        }
      }

      // Por seguridad, siempre retornamos success
      // No revelamos si el email existe o no
      return {
        success: true,
        message: "Si el email existe, recibirás un enlace de recuperación",
      };
    }),

  /**
   * Valida un token de recuperación
   */
  validateToken: publicProcedure
    .input(
      z.object({
        token: z.string(),
      })
    )
    .query(async ({ input }) => {
      const userId = await validatePasswordResetToken(input.token);

      if (!userId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Token inválido o expirado",
        });
      }

      return {
        valid: true,
      };
    }),

  /**
   * Restablece la contraseña usando un token válido
   */
  resetPassword: publicProcedure
    .input(
      z.object({
        token: z.string(),
        newPassword: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
      })
    )
    .mutation(async ({ input }) => {
      const success = await resetPassword(input.token, input.newPassword);

      if (!success) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Token inválido o expirado",
        });
      }

      return {
        success: true,
        message: "Contraseña restablecida exitosamente",
      };
    }),
});
