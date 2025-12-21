import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

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

describe("Shopping List", () => {
  it("should add a shopping item", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Create household and member first
    const household = await caller.household.createHousehold({
      name: `TestHousehold_${Date.now()}`,
      password: "testpass123",
    });

    const member = await caller.household.createMember({
      householdId: household.householdId,
      memberName: "Test Member",
      password: "memberpass123",
    });

    // Add shopping item
    const result = await caller.shopping.add({
      householdId: household.householdId,
      memberId: member.memberId,
      name: "Milch",
      category: "Lebensmittel",
    });

    expect(result).toHaveProperty("itemId");
    expect(typeof result.itemId).toBe("number");
  });

  it("should list shopping items", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Create household and member
    const household = await caller.household.createHousehold({
      name: `TestHousehold_${Date.now()}`,
      password: "testpass123",
    });

    const member = await caller.household.createMember({
      householdId: household.householdId,
      memberName: "Test Member",
      password: "memberpass123",
    });

    // Add items
    await caller.shopping.add({
      householdId: household.householdId,
      memberId: member.memberId,
      name: "Brot",
      category: "Lebensmittel",
    });

    await caller.shopping.add({
      householdId: household.householdId,
      memberId: member.memberId,
      name: "Seife",
      category: "Pflege",
    });

    // List items
    const items = await caller.shopping.list({
      householdId: household.householdId,
    });

    expect(Array.isArray(items)).toBe(true);
    expect(items.length).toBeGreaterThanOrEqual(2);
  });

  it("should toggle shopping item completion", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Setup
    const household = await caller.household.createHousehold({
      name: `TestHousehold_${Date.now()}`,
      password: "testpass123",
    });

    const member = await caller.household.createMember({
      householdId: household.householdId,
      memberName: "Test Member",
      password: "memberpass123",
    });

    const item = await caller.shopping.add({
      householdId: household.householdId,
      memberId: member.memberId,
      name: "Äpfel",
      category: "Lebensmittel",
    });

    // Toggle completion
    const result = await caller.shopping.toggleComplete({
      itemId: item.itemId,
      householdId: household.householdId,
      memberId: member.memberId,
      isCompleted: true,
    });

    expect(result).toHaveProperty("success", true);
  });

  it("should delete shopping item", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Setup
    const household = await caller.household.createHousehold({
      name: `TestHousehold_${Date.now()}`,
      password: "testpass123",
    });

    const member = await caller.household.createMember({
      householdId: household.householdId,
      memberName: "Test Member",
      password: "memberpass123",
    });

    const item = await caller.shopping.add({
      householdId: household.householdId,
      memberId: member.memberId,
      name: "Bananen",
      category: "Lebensmittel",
    });

    // Delete item
    const result = await caller.shopping.delete({
      itemId: item.itemId,
      householdId: household.householdId,
      memberId: member.memberId,
    });

    expect(result).toHaveProperty("success", true);
  });
});
