import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { appRouter } from "./routers";
import { getDb } from "./db";
import { users } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

describe("User Profile Management", () => {
  let testUserId: number;
  let testUserEmail: string;
  const testPassword = "testpassword123";

  beforeAll(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database connection failed");

    // Create a test user
    const passwordHash = await bcrypt.hash(testPassword, 10);
    const [result] = await db.insert(users).values({
      email: `test-profile-${Date.now()}@example.com`,
      passwordHash,
      name: "Test User",
      loginMethod: "email",
    });

    testUserId = result.insertId;
    
    // Get the created user's email
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, testUserId))
      .limit(1);
    
    testUserEmail = user.email;
  });

  afterAll(async () => {
    const db = await getDb();
    if (!db) return;

    // Clean up test user
    await db.delete(users).where(eq(users.id, testUserId));
  });

  it("should get user profile", async () => {
    const caller = appRouter.createCaller({
      user: { id: testUserId, email: testUserEmail, name: "Test User" },
      req: {} as any,
      res: {} as any,
    });

    const profile = await caller.userProfile.getProfile();

    expect(profile).toBeDefined();
    expect(profile.id).toBe(testUserId);
    expect(profile.email).toBe(testUserEmail);
    expect(profile.name).toBe("Test User");
  });

  it("should update user profile name", async () => {
    const caller = appRouter.createCaller({
      user: { id: testUserId, email: testUserEmail, name: "Test User" },
      req: {} as any,
      res: {} as any,
    });

    const result = await caller.userProfile.updateProfile({
      name: "Updated Name",
    });

    expect(result.success).toBe(true);

    // Verify the update
    const profile = await caller.userProfile.getProfile();
    expect(profile.name).toBe("Updated Name");
  });

  it("should update user profile email", async () => {
    const caller = appRouter.createCaller({
      user: { id: testUserId, email: testUserEmail, name: "Test User" },
      req: {} as any,
      res: {} as any,
    });

    const newEmail = `updated-${Date.now()}@example.com`;
    const result = await caller.userProfile.updateProfile({
      email: newEmail,
    });

    expect(result.success).toBe(true);

    // Verify the update
    const profile = await caller.userProfile.getProfile();
    expect(profile.email).toBe(newEmail);
    
    // Update testUserEmail for subsequent tests
    testUserEmail = newEmail;
  });

  it("should reject duplicate email when updating profile", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database connection failed");

    // Create another user
    const passwordHash = await bcrypt.hash("password123", 10);
    const [result] = await db.insert(users).values({
      email: `another-user-${Date.now()}@example.com`,
      passwordHash,
      name: "Another User",
      loginMethod: "email",
    });

    const anotherUserId = result.insertId;
    const [anotherUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, anotherUserId))
      .limit(1);

    const caller = appRouter.createCaller({
      user: { id: testUserId, email: testUserEmail, name: "Test User" },
      req: {} as any,
      res: {} as any,
    });

    // Try to update to another user's email
    await expect(
      caller.userProfile.updateProfile({
        email: anotherUser.email,
      })
    ).rejects.toThrow("Diese E-Mail-Adresse wird bereits verwendet");

    // Clean up
    await db.delete(users).where(eq(users.id, anotherUserId));
  });

  it("should change user password", async () => {
    const caller = appRouter.createCaller({
      user: { id: testUserId, email: testUserEmail, name: "Test User" },
      req: {} as any,
      res: {} as any,
    });

    const newPassword = "newpassword456";
    const result = await caller.userProfile.changePassword({
      currentPassword: testPassword,
      newPassword,
    });

    expect(result.success).toBe(true);

    // Verify the password was changed
    const db = await getDb();
    if (!db) throw new Error("Database connection failed");

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, testUserId))
      .limit(1);

    const isValid = await bcrypt.compare(newPassword, user.passwordHash!);
    expect(isValid).toBe(true);
  });

  it("should reject incorrect current password", async () => {
    const caller = appRouter.createCaller({
      user: { id: testUserId, email: testUserEmail, name: "Test User" },
      req: {} as any,
      res: {} as any,
    });

    await expect(
      caller.userProfile.changePassword({
        currentPassword: "wrongpassword",
        newPassword: "newpassword789",
      })
    ).rejects.toThrow("Aktuelles Passwort ist falsch");
  });

  it("should reject short password", async () => {
    const caller = appRouter.createCaller({
      user: { id: testUserId, email: testUserEmail, name: "Test User" },
      req: {} as any,
      res: {} as any,
    });

    await expect(
      caller.userProfile.changePassword({
        currentPassword: "newpassword456",
        newPassword: "short",
      })
    ).rejects.toThrow();
  });
});
