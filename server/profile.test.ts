import { describe, expect, it, beforeAll } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { getDb } from "./db";
import { users } from "../drizzle/schema";
import bcrypt from "bcryptjs";

describe("Profile Router", () => {
  let testUserId: number;
  let testUserEmail: string;
  let testUser: NonNullable<TrpcContext["user"]>;

  beforeAll(async () => {
    // Crear usuario de prueba
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    testUserEmail = `test-profile-${Date.now()}@example.com`;
    const passwordHash = await bcrypt.hash("testpassword123", 10);

    const [result] = await db.insert(users).values({
      email: testUserEmail,
      passwordHash,
      name: "Test User",
      phone: "1234567890",
      businessName: "Test Business",
    });

    testUserId = result.insertId;

    testUser = {
      id: testUserId,
      openId: "test-open-id",
      email: testUserEmail,
      name: "Test User",
      loginMethod: "email",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    };
  });

  it("should get user profile", async () => {
    const ctx: TrpcContext = {
      user: testUser,
      req: {
        protocol: "https",
        headers: {},
      } as TrpcContext["req"],
      res: {} as TrpcContext["res"],
    };

    const caller = appRouter.createCaller(ctx);

    const profile = await caller.profile.getProfile();

    expect(profile).toBeDefined();
    expect(profile.email).toBe(testUserEmail);
    expect(profile.name).toBe("Test User");
    expect(profile.phone).toBe("1234567890");
    expect(profile.businessName).toBe("Test Business");
  });

  it("should update user profile", async () => {
    const ctx: TrpcContext = {
      user: testUser,
      req: {
        protocol: "https",
        headers: {},
      } as TrpcContext["req"],
      res: {} as TrpcContext["res"],
    };

    const caller = appRouter.createCaller(ctx);

    const result = await caller.profile.updateProfile({
      name: "Updated Name",
      phone: "9876543210",
      businessName: "Updated Business",
    });

    expect(result.success).toBe(true);
    expect(result.message).toContain("exitosamente");

    // Verificar que se actualizó
    const profile = await caller.profile.getProfile();
    expect(profile.name).toBe("Updated Name");
    expect(profile.phone).toBe("9876543210");
    expect(profile.businessName).toBe("Updated Business");
  });

  it("should change password with correct current password", async () => {
    const ctx: TrpcContext = {
      user: testUser,
      req: {
        protocol: "https",
        headers: {},
      } as TrpcContext["req"],
      res: {} as TrpcContext["res"],
    };

    const caller = appRouter.createCaller(ctx);

    const result = await caller.profile.changePassword({
      currentPassword: "testpassword123",
      newPassword: "newpassword456",
    });

    expect(result.success).toBe(true);
    expect(result.message).toContain("exitosamente");
  });

  it("should fail to change password with incorrect current password", async () => {
    const ctx: TrpcContext = {
      user: testUser,
      req: {
        protocol: "https",
        headers: {},
      } as TrpcContext["req"],
      res: {} as TrpcContext["res"],
    };

    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.profile.changePassword({
        currentPassword: "wrongpassword",
        newPassword: "newpassword789",
      })
    ).rejects.toThrow("incorrecta");
  });

  it("should require authentication for profile operations", async () => {
    const ctx: TrpcContext = {
      user: null,
      req: {
        protocol: "https",
        headers: {},
      } as TrpcContext["req"],
      res: {} as TrpcContext["res"],
    };

    const caller = appRouter.createCaller(ctx);

    await expect(caller.profile.getProfile()).rejects.toThrow();
  });
});
