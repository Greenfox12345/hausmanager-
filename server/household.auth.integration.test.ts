import { describe, expect, it, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import bcrypt from "bcrypt";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user-openid",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
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

describe("Household Authentication", () => {
  it("should list all households", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const households = await caller.household.listHouseholds();

    expect(Array.isArray(households)).toBe(true);
  });

  it("should create a new household", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const testHouseholdName = `TestHousehold_${Date.now()}`;
    const testPassword = "testpass123";

    const result = await caller.household.createHousehold({
      name: testHouseholdName,
      password: testPassword,
    });

    expect(result).toHaveProperty("householdId");
    expect(result).toHaveProperty("name", testHouseholdName);
    expect(typeof result.householdId).toBe("number");
  });

  it("should login to an existing household", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // First create a household
    const testHouseholdName = `TestHousehold_${Date.now()}`;
    const testPassword = "testpass123";

    await caller.household.createHousehold({
      name: testHouseholdName,
      password: testPassword,
    });

    // Then try to login
    const loginResult = await caller.household.loginHousehold({
      name: testHouseholdName,
      password: testPassword,
    });

    expect(loginResult).toHaveProperty("householdId");
    expect(loginResult).toHaveProperty("name", testHouseholdName);
  });

  it("should fail to login with wrong password", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // First create a household
    const testHouseholdName = `TestHousehold_${Date.now()}`;
    const testPassword = "testpass123";

    await caller.household.createHousehold({
      name: testHouseholdName,
      password: testPassword,
    });

    // Try to login with wrong password
    await expect(
      caller.household.loginHousehold({
        name: testHouseholdName,
        password: "wrongpassword",
      })
    ).rejects.toThrow("Invalid password");
  });

  it("should create a household member", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // First create a household
    const testHouseholdName = `TestHousehold_${Date.now()}`;
    const testPassword = "testpass123";

    const household = await caller.household.createHousehold({
      name: testHouseholdName,
      password: testPassword,
    });

    // Create a member
    const memberResult = await caller.household.createMember({
      householdId: household.householdId,
      memberName: "Test Member",
      password: "memberpass123",
    });

    expect(memberResult).toHaveProperty("memberId");
    expect(memberResult).toHaveProperty("memberName", "Test Member");
  });

  it("should login as household member", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Create household and member
    const testHouseholdName = `TestHousehold_${Date.now()}`;
    const household = await caller.household.createHousehold({
      name: testHouseholdName,
      password: "testpass123",
    });

    const memberName = "Test Member";
    const memberPassword = "memberpass123";

    await caller.household.createMember({
      householdId: household.householdId,
      memberName,
      password: memberPassword,
    });

    // Login as member
    const loginResult = await caller.household.loginMember({
      householdId: household.householdId,
      memberName,
      password: memberPassword,
    });

    expect(loginResult).toHaveProperty("memberId");
    expect(loginResult).toHaveProperty("memberName", memberName);
    expect(loginResult).toHaveProperty("householdId", household.householdId);
  });
});
