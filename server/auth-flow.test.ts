import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

describe("Flujo completo de autenticación independiente", () => {
  it("permite registrar un nuevo usuario", async () => {
    const ctx: TrpcContext = {
      req: {
        protocol: "https",
        headers: {},
        cookies: {},
      } as TrpcContext["req"],
      res: {
        cookie: () => {},
        clearCookie: () => {},
      } as TrpcContext["res"],
      user: null,
    };

    const caller = appRouter.createCaller(ctx);

    const result = await caller.auth.register({
      email: `test${Date.now()}@example.com`,
      password: "password123",
      name: "Test User",
      businessName: "Test Business",
      phone: "1234567890",
    });

    expect(result.success).toBe(true);
    expect(result.user).toBeDefined();
    expect(result.user.email).toContain("@example.com");
    expect(result.user.name).toBe("Test User");
  });

  it("no permite registrar un usuario con email duplicado", async () => {
    const ctx: TrpcContext = {
      req: {
        protocol: "https",
        headers: {},
        cookies: {},
      } as TrpcContext["req"],
      res: {
        cookie: () => {},
        clearCookie: () => {},
      } as TrpcContext["res"],
      user: null,
    };

    const caller = appRouter.createCaller(ctx);
    const email = `duplicate${Date.now()}@example.com`;

    // Primer registro
    await caller.auth.register({
      email,
      password: "password123",
      name: "User 1",
    });

    // Segundo registro con mismo email
    await expect(
      caller.auth.register({
        email,
        password: "password456",
        name: "User 2",
      })
    ).rejects.toThrow("El correo electrónico ya está registrado");
  });

  it("permite iniciar sesión con credenciales válidas", async () => {
    const ctx: TrpcContext = {
      req: {
        protocol: "https",
        headers: {},
        cookies: {},
      } as TrpcContext["req"],
      res: {
        cookie: () => {},
        clearCookie: () => {},
      } as TrpcContext["res"],
      user: null,
    };

    const caller = appRouter.createCaller(ctx);
    const email = `login${Date.now()}@example.com`;
    const password = "password123";

    // Registrar usuario
    await caller.auth.register({
      email,
      password,
      name: "Login Test User",
    });

    // Iniciar sesión
    const result = await caller.auth.login({
      email,
      password,
    });

    expect(result.success).toBe(true);
    expect(result.user).toBeDefined();
    expect(result.user.email).toBe(email);
  });

  it("rechaza login con credenciales inválidas", async () => {
    const ctx: TrpcContext = {
      req: {
        protocol: "https",
        headers: {},
        cookies: {},
      } as TrpcContext["req"],
      res: {
        cookie: () => {},
        clearCookie: () => {},
      } as TrpcContext["res"],
      user: null,
    };

    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.auth.login({
        email: "noexiste@example.com",
        password: "wrongpassword",
      })
    ).rejects.toThrow("Credenciales inválidas");
  });

  it("rechaza contraseñas cortas en el registro", async () => {
    const ctx: TrpcContext = {
      req: {
        protocol: "https",
        headers: {},
        cookies: {},
      } as TrpcContext["req"],
      res: {
        cookie: () => {},
        clearCookie: () => {},
      } as TrpcContext["res"],
      user: null,
    };

    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.auth.register({
        email: `short${Date.now()}@example.com`,
        password: "123",
        name: "Short Password User",
      })
    ).rejects.toThrow();
  });
});
