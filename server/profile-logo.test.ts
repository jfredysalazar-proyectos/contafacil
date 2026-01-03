import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "sample-user",
    email: "sample@example.com",
    name: "Sample User",
    loginMethod: "independent",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };

  return { ctx };
}

describe("profile.uploadLogo", () => {
  it("rechaza archivos que superan 2MB", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Crear una imagen base64 grande (>2MB)
    const largeBase64 = "data:image/png;base64," + "A".repeat(3 * 1024 * 1024);

    await expect(
      caller.profile.uploadLogo({
        base64Image: largeBase64,
        mimeType: "image/png",
      })
    ).rejects.toThrow("El logo no puede superar los 2MB");
  });

  it("acepta tipos de archivo válidos", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Crear una imagen base64 pequeña válida (1x1 pixel PNG)
    const validPng =
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

    const result = await caller.profile.uploadLogo({
      base64Image: validPng,
      mimeType: "image/png",
    });

    expect(result.success).toBe(true);
    expect(result.logoUrl).toBeDefined();
    expect(result.message).toBe("Logo subido exitosamente");
  });
});

describe("profile.deleteLogo", () => {
  it("elimina el logo exitosamente", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.profile.deleteLogo();

    expect(result.success).toBe(true);
    expect(result.message).toBe("Logo eliminado exitosamente");
  });
});

describe("profile.getProfile incluye logoUrl", () => {
  it("retorna logoUrl en el perfil", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const profile = await caller.profile.getProfile();

    expect(profile).toHaveProperty("logoUrl");
  });
});
