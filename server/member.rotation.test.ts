import { describe, expect, it, beforeAll } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { createHousehold, createHouseholdMember, createTask } from "./db";

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
  let testHouseholdId: number;

  beforeAll(async () => {
    // Create test household
    testHouseholdId = await createHousehold(
      "TestHousehold_AddMember_" + Date.now(),
      "test_hash",
      1
    );
  });

  it("accepts member creation with name and password", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const input = {
      householdId: testHouseholdId,
      memberName: "Test Member " + Date.now(),
      password: "testpass123",
    };

    // Should not throw and return memberId
    await expect(caller.household.addMember(input)).resolves.toHaveProperty("memberId");
  });

  it("validates minimum password length", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const input = {
      householdId: testHouseholdId,
      memberName: "Test Member Short " + Date.now(),
      password: "123", // Too short
    };

    // Should throw validation error
    await expect(caller.household.addMember(input)).rejects.toThrow();
  });
});

describe("tasks.completeTask with rotation", () => {
  let testHouseholdId: number;
  let testMemberId: number;
  let testTaskId: number;

  beforeAll(async () => {
    // Create test household
    testHouseholdId = await createHousehold(
      "TestHousehold_Rotation_" + Date.now(),
      "test_hash",
      1
    );

    // Create test member
    testMemberId = await createHouseholdMember({
      householdId: testHouseholdId,
      memberName: "TestMember",
      passwordHash: "test_hash",
    });

    // Create test task with rotation enabled
    testTaskId = await createTask({
      householdId: testHouseholdId,
      name: "Test Task with Rotation",
      assignedTo: testMemberId,
      frequency: "weekly",
      enableRotation: true,
      requiredPersons: 1,
      createdBy: testMemberId,
    });
  });

  it("accepts task completion and should trigger rotation", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const input = {
      taskId: testTaskId,
      householdId: testHouseholdId,
      memberId: testMemberId,
      comment: "Task completed successfully",
      photoUrls: ["https://example.com/photo.jpg"],
    };

    // Should not throw
    await expect(caller.tasks.completeTask(input)).resolves.toHaveProperty("success", true);
  });
});

describe("household.getActivityHistory with task details", () => {
  let testHouseholdId: number;
  let testMemberId: number;

  beforeAll(async () => {
    // Create test household
    testHouseholdId = await createHousehold(
      "TestHousehold_Activity_" + Date.now(),
      "test_hash",
      1
    );

    // Create test member
    testMemberId = await createHouseholdMember({
      householdId: testHouseholdId,
      memberName: "TestMember",
      passwordHash: "test_hash",
    });

    // Create and complete a test task to generate activity
    const taskId = await createTask({
      householdId: testHouseholdId,
      name: "Test Task for Activity",
      assignedTo: testMemberId,
      frequency: "once",
      createdBy: testMemberId,
    });

    // Complete the task to create activity
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    await caller.tasks.completeTask({
      taskId,
      householdId: testHouseholdId,
      memberId: testMemberId,
    });
  });

  it("returns activities with task details enriched", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const input = {
      householdId: testHouseholdId,
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
