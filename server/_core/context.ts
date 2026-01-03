import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { getUserById } from "../db";
import { verifyToken, COOKIE_NAME } from "../auth";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    // Intentar obtener el token de la cookie
    const token = opts.req.cookies?.[COOKIE_NAME];
    
    if (token) {
      // Verificar el token
      const payload = await verifyToken(token);
      
      if (payload) {
        // Obtener el usuario de la base de datos
        user = await getUserById(payload.userId) || null;
      }
    }
  } catch (error) {
    console.error("[Auth] Error verifying token:", error);
    user = null;
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
