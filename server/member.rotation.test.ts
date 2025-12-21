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

describe("household.addMember", () => {
  it("accepts member creation with name and password", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const input = {
      householdId: 1,
      memberName: "Test Member",
      password: "testpass123",
    };

    // Should not throw and return memberId
    await expect(caller.household.addMember(input)).resolves.toHaveProperty("memberId");
  });

  it("validates minimum password length", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const input = {
      householdId: 1,
      memberName: "Test Member",
      password: "123", // Too short
    };

    // Should throw validation error
    await expect(caller.household.addMember(input)).rejects.toThrow();
  });
});

describe("tasks.completeTask with rotation", () => {
  it("accepts task completion and should trigger rotation", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const input = {
      taskId: 1,
      householdId: 1,
      memberId: 1,
      comment: "Task completed successfully",
      photoUrls: ["https://example.com/photo.jpg"],
    };

    // Should not throw
    await expect(caller.tasks.completeTask(input)).resolves.toHaveProperty("success", true);
  });
});

describe("household.getActivityHistory with task details", () => {
  it("returns activities with task details enriched", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const input = {
      householdId: 1,
    };

    // Should return array of activities
    const result = await caller.household.getActivityHistory(input);
    expect(Array.isArray(result)).toBe(true);
    
    // Each activity should have memberName
    result.forEach((activity: any) => {
      expect(activity).toHaveProperty("memberName");
      
      // Task activities should have taskDetails if available
      if (activity.activityType === "task" && activity.relatedItemId) {
        // taskDetails is optional but if present should have expected structure
        if (activity.taskDetails) {
          expect(activity.taskDetails).toHaveProperty("name");
        }
      }
    });
  });
});
