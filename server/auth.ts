import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { createUser, getUserByEmail, getUserById, updateUserLastSignIn } from "./db";
import { TRPCError } from "@trpc/server";
import { SignJWT, jwtVerify } from "jose";
import { ENV } from "./_core/env";
import bcrypt from "bcryptjs";

const JWT_SECRET = new TextEncoder().encode(ENV.cookieSecret);
const COOKIE_NAME = "app_session_id";

// Helper para hashear contraseñas
async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

// Helper para generar JWT
async function generateToken(userId: number): Promise<string> {
  return await new SignJWT({ userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(JWT_SECRET);
}

// Helper para verificar JWT
async function verifyToken(token: string): Promise<{ userId: number } | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as { userId: number };
  } catch {
    return null;
  }
}

export const authRouter = router({
  // Registro de usuario
  register: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        password: z.string().min(6),
        name: z.string().min(1),
        phone: z.string().optional(),
        businessName: z.string().optional(),
        nit: z.string().optional(),
        address: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Verificar si el usuario ya existe
      const existingUser = await getUserByEmail(input.email);
      if (existingUser) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "El correo electrónico ya está registrado",
        });
      }

      // Hashear contraseña
      const passwordHash = await hashPassword(input.password);

      // Crear usuario
      await createUser({
        email: input.email,
        passwordHash,
        name: input.name,
        phone: input.phone || null,
        businessName: input.businessName || null,
        nit: input.nit || null,
        address: input.address || null,
        role: "user",
      });

      // Obtener usuario creado
      const user = await getUserByEmail(input.email);
      if (!user) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Error al crear usuario",
        });
      }

      // Generar token
      const token = await generateToken(user.id);

      // Establecer cookie
      ctx.res.cookie(COOKIE_NAME, token, {
        httpOnly: true,
        secure: true,
        sameSite: "none",
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 días
        path: "/",
      });

      return {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
      };
    }),

  // Login
  login: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        password: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Buscar usuario
      const user = await getUserByEmail(input.email);
      if (!user) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Credenciales inválidas",
        });
      }

      // Verificar contraseña
      const passwordMatch = await bcrypt.compare(input.password, user.passwordHash);
      if (!passwordMatch) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Credenciales inválidas",
        });
      }

      // Actualizar último inicio de sesión
      await updateUserLastSignIn(user.id);

      // Generar token
      const token = await generateToken(user.id);

      // Establecer cookie
      ctx.res.cookie(COOKIE_NAME, token, {
        httpOnly: true,
        secure: true,
        sameSite: "none",
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 días
        path: "/",
      });

      return {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          businessName: user.businessName,
          nit: user.nit,
        },
      };
    }),

  // Obtener usuario actual
  me: publicProcedure.query(async ({ ctx }) => {
    const token = ctx.req.cookies?.[COOKIE_NAME];
    if (!token) {
      return null;
    }

    const payload = await verifyToken(token);
    if (!payload) {
      return null;
    }

    const user = await getUserById(payload.userId);
    if (!user) {
      return null;
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      businessName: user.businessName,
      nit: user.nit,
      phone: user.phone,
      address: user.address,
    };
  }),

  // Logout
  logout: publicProcedure.mutation(({ ctx }) => {
    ctx.res.clearCookie(COOKIE_NAME, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      path: "/",
      maxAge: -1,
    });

    return {
      success: true,
    };
  }),

  // Actualizar perfil
  updateProfile: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).optional(),
        phone: z.string().optional(),
        businessName: z.string().optional(),
        nit: z.string().optional(),
        address: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Esta funcionalidad se implementará cuando actualicemos server/db.ts
      throw new TRPCError({
        code: "NOT_IMPLEMENTED",
        message: "Funcionalidad en desarrollo",
      });
    }),
});

export { COOKIE_NAME, verifyToken };
