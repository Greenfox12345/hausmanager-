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

describe("tasks.add with new fields", () => {
  it("accepts task creation with due date and time", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const input = {
      householdId: 1,
      memberId: 1,
      name: "Test Task with Due Date",
      description: "Task with specific due date and time",
      dueDate: "2025-12-25",
      dueTime: "14:30",
      frequency: "once" as const,
    };

    // Should not throw
    await expect(caller.tasks.add(input)).resolves.toBeDefined();
  });

  it("accepts task creation with repeat interval", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const input = {
      householdId: 1,
      memberId: 1,
      name: "Repeating Task",
      description: "Task that repeats every 3 days",
      frequency: "custom" as const,
      repeatInterval: 3,
      repeatUnit: "days" as const,
    };

    // Should not throw
    await expect(caller.tasks.add(input)).resolves.toBeDefined();
  });

  it("accepts task creation with rotation configuration", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const input = {
      householdId: 1,
      memberId: 1,
      name: "Rotating Task",
      description: "Task with rotation enabled",
      frequency: "weekly" as const,
      enableRotation: true,
      requiredPersons: 2,
      excludedMembers: [3, 4], // Member IDs to exclude
    };

    // Should not throw
    await expect(caller.tasks.add(input)).resolves.toBeDefined();
  });

  it("accepts task creation with all new fields combined", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const input = {
      householdId: 1,
      memberId: 1,
      name: "Complex Task",
      description: "Task with all features",
      dueDate: "2025-12-31",
      dueTime: "23:59",
      frequency: "custom" as const,
      repeatInterval: 2,
      repeatUnit: "weeks" as const,
      enableRotation: true,
      requiredPersons: 3,
      excludedMembers: [5],
      assignedTo: 2,
    };

    // Should not throw and return taskId
    const result = await caller.tasks.add(input);
    expect(result).toHaveProperty("taskId");
    expect(typeof result.taskId).toBe("number");
  });
});
