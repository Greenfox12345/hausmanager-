import { describe, it, expect, beforeAll } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import * as db from "./db";

function createTestContext(): TrpcContext {
  return {
    user: null,
    req: {} as any,
    res: {} as any,
  };
}

describe("Activities Router", () => {
  let testHouseholdId: number;
  let testMemberId: number;
  let testTaskId: number;

  beforeAll(async () => {
    // Create test user first (required by foreign key)
    const testOpenId = `test-user-${Date.now()}`;
    await db.upsertUser({
      openId: testOpenId,
      name: "Test User",
      email: `test-${Date.now()}@example.com`,
      passwordHash: "test",
      loginMethod: "email",
    });
    
    const testUser = await db.getUserByOpenId(testOpenId);
    if (!testUser) throw new Error("Failed to create test user");
    const testUserId = testUser.id;

    // Create test household
    testHouseholdId = await db.createHousehold(
      "Test Household for Activities",
      "test",
      testUserId
    );

    // Create test member
    testMemberId = await db.createHouseholdMember({
      householdId: testHouseholdId,
      memberName: "Test Member",
      passwordHash: "test",
      userId: null,
    });

    // Create test task
    testTaskId = await db.createTask({
      householdId: testHouseholdId,
      name: "Test Task with History",
      description: "Task for testing activity history",
      assignedTo: testMemberId,
      createdBy: testMemberId,
    });

    // Create some activity history entries
    await db.createActivityHistory({
      householdId: testHouseholdId,
      memberId: testMemberId,
      activityType: "task",
      action: "Aufgabe abgeschlossen",
      description: "Test Task with History wurde abgeschlossen",
      relatedItemId: testTaskId,
      comment: "Test comment 1",
      photoUrls: ["https://example.com/photo1.jpg"],
    });

    await db.createActivityHistory({
      householdId: testHouseholdId,
      memberId: testMemberId,
      activityType: "task",
      action: "Zwischenziel dokumentiert",
      description: "Zwischenziel für Test Task with History dokumentiert",
      relatedItemId: testTaskId,
      comment: "Test milestone",
      photoUrls: ["https://example.com/photo2.jpg", "https://example.com/photo3.jpg"],
    });
  });

  it("should get all activities for a household", async () => {
    const caller = appRouter.createCaller(createTestContext());
    const result = await caller.activities.list({ householdId: testHouseholdId });

    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThanOrEqual(2);
  });

  it("should get activities for a specific task", async () => {
    const caller = appRouter.createCaller(createTestContext());
    const result = await caller.activities.getByTaskId({
      taskId: testTaskId,
      householdId: testHouseholdId,
    });

    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(2);

    // Check first activity
    const firstActivity = result[0];
    expect(firstActivity.relatedItemId).toBe(testTaskId);
    expect(firstActivity.activityType).toBe("task");
    expect(firstActivity.comment).toBeDefined();
    expect(firstActivity.photoUrls).toBeDefined();
    expect(Array.isArray(firstActivity.photoUrls)).toBe(true);
  });

  it("should return empty array for task with no activities", async () => {
    // Create a task without any activities
    const emptyTaskId = await db.createTask({
      householdId: testHouseholdId,
      name: "Task without history",
      assignedTo: testMemberId,
      createdBy: testMemberId,
    });

    const caller = appRouter.createCaller(createTestContext());
    const result = await caller.activities.getByTaskId({
      taskId: emptyTaskId,
      householdId: testHouseholdId,
    });

    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(0);
  });

  it("should only return activities for the specified household", async () => {
    // Create another user and household with activities
    const otherOpenId = `other-user-${Date.now()}`;
    await db.upsertUser({
      openId: otherOpenId,
      name: "Other User",
      email: `other-${Date.now()}@example.com`,
      passwordHash: "test",
      loginMethod: "email",
    });
    
    const otherUser = await db.getUserByOpenId(otherOpenId);
    if (!otherUser) throw new Error("Failed to create other user");
    const otherUserId = otherUser.id;

    const otherHouseholdId = await db.createHousehold(
      "Other Household",
      "test",
      otherUserId
    );

    const otherMemberId = await db.createHouseholdMember({
      householdId: otherHouseholdId,
      memberName: "Other Member",
      passwordHash: "test",
      userId: null,
    });

    const otherTaskId = await db.createTask({
      householdId: otherHouseholdId,
      name: "Other Task",
      assignedTo: otherMemberId,
      createdBy: otherMemberId,
    });

    await db.createActivityHistory({
      householdId: otherHouseholdId,
      memberId: otherMemberId,
      activityType: "task",
      action: "Aufgabe erstellt",
      description: "Other Task wurde erstellt",
      relatedItemId: otherTaskId,
    });

    const caller = appRouter.createCaller(createTestContext());
    const result = await caller.activities.getByTaskId({
      taskId: testTaskId,
      householdId: testHouseholdId,
    });

    // Should only return activities from testHouseholdId, not otherHouseholdId
    expect(result.every((activity: any) => activity.householdId === testHouseholdId)).toBe(true);
  });
});
