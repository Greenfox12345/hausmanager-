import { describe, it, expect, beforeEach } from "vitest";
import { appRouter } from "./routers";
import { getDb } from "./db";
import { households, householdMembers, tasks, users } from "../drizzle/schema";
import { sql } from "drizzle-orm";

describe("Tasks - Irregular Recurrence", () => {
  let testHouseholdId: number;
  let testMemberId: number;

  beforeEach(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Create test user first
    const userResult = await db.insert(users).values({
      name: "Test User",
      email: `testuser${Date.now()}@test.com`,
      loginMethod: "email",
    });
    const testUserId = Number(userResult[0].insertId);

    // Create test household with unique name to avoid conflicts
    const householdResult = await db.insert(households).values({
      name: `Test Household - Irregular ${Date.now()}`,
      createdBy: testUserId,
    });
    testHouseholdId = Number(householdResult[0].insertId);

    // Create test member
    const memberResult = await db.insert(householdMembers).values({
      householdId: testHouseholdId,
      memberName: "Test Member",
      isActive: true,
    });
    testMemberId = Number(memberResult[0].insertId);
  });

  it("should create task with irregular recurrence", async () => {
    const caller = appRouter.createCaller({});

    const result = await caller.tasks.add({
      householdId: testHouseholdId,
      memberId: testMemberId,
      name: "Irregular Task",
      description: "Task with irregular recurrence",
      assignedTo: [testMemberId],
      repeatInterval: 1,
      repeatUnit: "irregular",
      irregularRecurrence: true,
      enableRotation: true,
      requiredPersons: 1,
    });

    expect(result).toHaveProperty("id");
    const taskId = result.id;

    const tasksList = await caller.tasks.list({ householdId: testHouseholdId });
    const createdTask = tasksList.find((t) => t.id === taskId);

    expect(createdTask).toBeDefined();
    expect(createdTask?.name).toBe("Irregular Task");
    expect(createdTask?.repeatUnit).toBe("irregular");
    expect(createdTask?.irregularRecurrence).toBe(1);
    expect(createdTask?.enableRotation).toBe(true);
  });

  it("should create task with irregular recurrence without due date", async () => {
    const caller = appRouter.createCaller({});

    const result = await caller.tasks.add({
      householdId: testHouseholdId,
      memberId: testMemberId,
      name: "Irregular Task No Date",
      assignedTo: [testMemberId],
      repeatInterval: 1,
      repeatUnit: "irregular",
      irregularRecurrence: true,
      enableRotation: true,
      requiredPersons: 1,
      // NO dueDate - this should work for irregular recurrence
    });

    expect(result).toHaveProperty("id");
    const taskId = result.id;

    const tasksList = await caller.tasks.list({ householdId: testHouseholdId });
    const createdTask = tasksList.find((t) => t.id === taskId);

    expect(createdTask).toBeDefined();
    expect(createdTask?.dueDate).toBeNull();
    expect(createdTask?.repeatUnit).toBe("irregular");
    expect(createdTask?.irregularRecurrence).toBe(1);
  });

  it("should update task to irregular recurrence", async () => {
    const caller = appRouter.createCaller({});

    // Create regular task first
    const result = await caller.tasks.add({
      householdId: testHouseholdId,
      memberId: testMemberId,
      name: "Regular Task",
      assignedTo: [testMemberId],
      repeatInterval: 1,
      repeatUnit: "weeks",
    });
    const taskId = result.id;

    // Update to irregular
    const updateResult = await caller.tasks.update({
      taskId,
      householdId: testHouseholdId,
      memberId: testMemberId,
      repeatUnit: "irregular",
      irregularRecurrence: true,
    });

    const tasksList = await caller.tasks.list({ householdId: testHouseholdId });
    const updatedTask = tasksList.find((t) => t.id === taskId);

    expect(updatedTask?.repeatUnit).toBe("irregular");
    expect(updatedTask?.irregularRecurrence).toBe(1);
  });

  it("should update task from irregular to regular recurrence", async () => {
    const caller = appRouter.createCaller({});

    // Create irregular task first
    const result = await caller.tasks.add({
      householdId: testHouseholdId,
      memberId: testMemberId,
      name: "Irregular Task",
      assignedTo: [testMemberId],
      repeatInterval: 1,
      repeatUnit: "irregular",
      irregularRecurrence: true,
    });
    const taskId = result.id;

    // Update to regular weekly
    const updateResult2 = await caller.tasks.update({
      taskId,
      householdId: testHouseholdId,
      memberId: testMemberId,
      repeatUnit: "weeks",
      irregularRecurrence: false,
      dueDate: "2026-03-01",
    });

    const tasksList = await caller.tasks.list({ householdId: testHouseholdId });
    const updatedTask = tasksList.find((t) => t.id === taskId);

    expect(updatedTask?.repeatUnit).toBe("weeks");
    expect(updatedTask?.irregularRecurrence).toBe(0);
    expect(updatedTask?.dueDate).toBeDefined();
  });

  it("should handle irregular recurrence with rotation schedule", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Create second member for rotation
    const member2Result = await db.insert(householdMembers).values({
      householdId: testHouseholdId,
      memberName: "Test Member 2",
      isActive: true,
    });
    const testMember2Id = Number(member2Result[0].insertId);

    const caller = appRouter.createCaller({});

    const result = await caller.tasks.add({
      householdId: testHouseholdId,
      memberId: testMemberId,
      name: "Irregular Rotation Task",
      assignedTo: [testMemberId],
      repeatInterval: 1,
      repeatUnit: "irregular",
      irregularRecurrence: true,
      enableRotation: true,
      requiredPersons: 1,
    });
    const taskId = result.id;

    // Set rotation schedule
    await caller.tasks.setRotationSchedule({
      taskId,
      schedule: [
        { occurrenceNumber: 1, members: [{ position: 1, memberId: testMemberId }], notes: "First" },
        { occurrenceNumber: 2, members: [{ position: 1, memberId: testMember2Id }], notes: "Second" },
        { occurrenceNumber: 3, members: [{ position: 1, memberId: testMemberId }], notes: "Third" },
      ],
    });

    const schedule = await caller.tasks.getRotationSchedule({ taskId });

    expect(schedule).toHaveLength(3);
    expect(schedule[0].occurrenceNumber).toBe(1);
    expect(schedule[0].members).toHaveLength(1);
    expect(schedule[0].members[0].memberId).toBe(testMemberId);
    expect(schedule[1].members[0].memberId).toBe(testMember2Id);
  });
});
