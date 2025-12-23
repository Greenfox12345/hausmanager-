import { describe, expect, it, beforeAll } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { createHousehold, createHouseholdMember, createTask } from "./db";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createTestContext(): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
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

describe("tasks.completeTask", () => {
  let testHouseholdId: number;
  let testMemberId: number;
  let testTaskId: number;

  beforeAll(async () => {
    // Create test household
    testHouseholdId = await createHousehold(
      "TestHousehold_Completion_" + Date.now(),
      "test_hash",
      1
    );

    // Create test member
    testMemberId = await createHouseholdMember({
      householdId: testHouseholdId,
      memberName: "TestMember",
      passwordHash: "test_hash",
    });

    // Create test task
    testTaskId = await createTask({
      householdId: testHouseholdId,
      name: "Test Task for Completion",
      assignedTo: testMemberId,
      frequency: "once",
      createdBy: testMemberId,
    });
  });

  it("accepts task completion with comment and photos", async () => {
    const { ctx } = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.tasks.completeTask({
      taskId: testTaskId,
      householdId: testHouseholdId,
      memberId: testMemberId,
      comment: "Alles erledigt, hat 2 Stunden gedauert",
      photoUrls: ["https://example.com/before.jpg", "https://example.com/after.jpg"],
    });

    expect(result).toEqual({ success: true });
  });

  it("accepts task completion without comment and photos", async () => {
    const { ctx } = createTestContext();
    const caller = appRouter.createCaller(ctx);

    // Create another task for this test
    const anotherTaskId = await createTask({
      householdId: testHouseholdId,
      name: "Another Test Task",
      assignedTo: testMemberId,
      frequency: "once",
      createdBy: testMemberId,
    });

    const result = await caller.tasks.completeTask({
      taskId: anotherTaskId,
      householdId: testHouseholdId,
      memberId: testMemberId,
    });

    expect(result).toEqual({ success: true });
  });
});

describe("tasks.addMilestone", () => {
  let testHouseholdId: number;
  let testMemberId: number;
  let testTaskId: number;

  beforeAll(async () => {
    // Create test household
    testHouseholdId = await createHousehold(
      "TestHousehold_Milestone_" + Date.now(),
      "test_hash",
      1
    );

    // Create test member
    testMemberId = await createHouseholdMember({
      householdId: testHouseholdId,
      memberName: "TestMember",
      passwordHash: "test_hash",
    });

    // Create test task
    testTaskId = await createTask({
      householdId: testHouseholdId,
      name: "Test Task for Milestone",
      assignedTo: testMemberId,
      frequency: "once",
      createdBy: testMemberId,
    });
  });

  it("accepts milestone with comment and photos", async () => {
    const { ctx } = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.tasks.addMilestone({
      taskId: testTaskId,
      householdId: testHouseholdId,
      memberId: testMemberId,
      comment: "Erste Hälfte erledigt",
      photoUrls: ["https://example.com/progress.jpg"],
    });

    expect(result).toEqual({ success: true });
  });
});

describe("tasks.sendReminder", () => {
  let testHouseholdId: number;
  let testMemberId: number;
  let testTaskId: number;

  beforeAll(async () => {
    // Create test household
    testHouseholdId = await createHousehold(
      "TestHousehold_Reminder_" + Date.now(),
      "test_hash",
      1
    );

    // Create test member
    testMemberId = await createHouseholdMember({
      householdId: testHouseholdId,
      memberName: "TestMember",
      passwordHash: "test_hash",
    });

    // Create test task
    testTaskId = await createTask({
      householdId: testHouseholdId,
      name: "Test Task for Reminder",
      assignedTo: testMemberId,
      frequency: "once",
      createdBy: testMemberId,
    });
  });

  it("accepts reminder with optional comment", async () => {
    const { ctx } = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.tasks.sendReminder({
      taskId: testTaskId,
      householdId: testHouseholdId,
      memberId: testMemberId,
      comment: "Bitte nicht vergessen!",
    });

    expect(result).toEqual({ success: true });
  });

  it("accepts reminder without comment", async () => {
    const { ctx } = createTestContext();
    const caller = appRouter.createCaller(ctx);

    // Create another task for this test
    const anotherTaskId = await createTask({
      householdId: testHouseholdId,
      name: "Another Test Task for Reminder",
      assignedTo: testMemberId,
      frequency: "once",
      createdBy: testMemberId,
    });

    const result = await caller.tasks.sendReminder({
      taskId: anotherTaskId,
      householdId: testHouseholdId,
      memberId: testMemberId,
    });

    expect(result).toEqual({ success: true });
  });
});
