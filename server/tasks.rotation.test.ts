import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createCaller } from "./_core/trpc";
import { db } from "./db";
import { households, householdMembers, tasks } from "../drizzle/schema";
import { eq } from "drizzle-orm";

describe("Task Rotation Functionality", () => {
  let testHouseholdId: number;
  let testMember1Id: number;
  let testMember2Id: number;
  let testTaskId: number;

  beforeAll(async () => {
    // Create test household
    const [household] = await db
      .insert(households)
      .values({
        name: "Test Rotation Household",
        password: "test123",
      })
      .$returningId();
    testHouseholdId = household.id;

    // Create test members
    const [member1] = await db
      .insert(householdMembers)
      .values({
        householdId: testHouseholdId,
        memberName: "Member 1",
        password: "pass1",
      })
      .$returningId();
    testMember1Id = member1.id;

    const [member2] = await db
      .insert(householdMembers)
      .values({
        householdId: testHouseholdId,
        memberName: "Member 2",
        password: "pass2",
      })
      .$returningId();
    testMember2Id = member2.id;
  });

  afterAll(async () => {
    // Clean up test data
    if (testTaskId) {
      await db.delete(tasks).where(eq(tasks.id, testTaskId));
    }
    await db
      .delete(householdMembers)
      .where(eq(householdMembers.householdId, testHouseholdId));
    await db.delete(households).where(eq(households.id, testHouseholdId));
  });

  it("should create task with rotation enabled", async () => {
    const caller = createCaller({
      user: {
        openId: "test-openid",
        name: "Test User",
        role: "user",
        householdId: testHouseholdId,
        memberId: testMember1Id,
      },
    });

    const task = await caller.tasks.create({
      name: "Rotating Task",
      householdId: testHouseholdId,
      assignedTo: [testMember1Id],
      dueDate: new Date("2026-03-01").toISOString(),
      enableRepeat: true,
      repeatInterval: 1,
      repeatUnit: "weeks",
      enableRotation: true,
      requiredPersons: 1,
      excludedMembers: [],
    });

    expect(task).toBeDefined();
    expect(task.enableRotation).toBe(true);
    expect(task.requiredPersons).toBe(1);
    testTaskId = task.id;
  });

  it("should retrieve rotation schedule for task", async () => {
    const caller = createCaller({
      user: {
        openId: "test-openid",
        name: "Test User",
        role: "user",
        householdId: testHouseholdId,
        memberId: testMember1Id,
      },
    });

    const schedule = await caller.tasks.getRotationSchedule({
      taskId: testTaskId,
    });

    expect(schedule).toBeDefined();
    expect(Array.isArray(schedule)).toBe(true);
    // Schedule should have at least one entry
    expect(schedule.length).toBeGreaterThan(0);
  });

  it("should update rotation schedule", async () => {
    const caller = createCaller({
      user: {
        openId: "test-openid",
        name: "Test User",
        role: "user",
        householdId: testHouseholdId,
        memberId: testMember1Id,
      },
    });

    const schedule = await caller.tasks.getRotationSchedule({
      taskId: testTaskId,
    });

    // Update first occurrence to assign member 2
    const updatedSchedule = schedule.map((occ, idx) => ({
      ...occ,
      assignedMemberIds: idx === 0 ? [testMember2Id] : occ.assignedMemberIds,
    }));

    const result = await caller.tasks.updateRotationSchedule({
      taskId: testTaskId,
      schedule: updatedSchedule,
    });

    expect(result.success).toBe(true);

    // Verify the update
    const newSchedule = await caller.tasks.getRotationSchedule({
      taskId: testTaskId,
    });
    expect(newSchedule[0].assignedMemberIds).toContain(testMember2Id);
  });

  it("should handle rotation with excluded members", async () => {
    const caller = createCaller({
      user: {
        openId: "test-openid",
        name: "Test User",
        role: "user",
        householdId: testHouseholdId,
        memberId: testMember1Id,
      },
    });

    // Create task with member 2 excluded
    const task = await caller.tasks.create({
      name: "Task with Exclusion",
      householdId: testHouseholdId,
      assignedTo: [testMember1Id],
      dueDate: new Date("2026-03-15").toISOString(),
      enableRepeat: true,
      repeatInterval: 1,
      repeatUnit: "weeks",
      enableRotation: true,
      requiredPersons: 1,
      excludedMembers: [testMember2Id],
    });

    expect(task.enableRotation).toBe(true);

    // Get rotation schedule
    const schedule = await caller.tasks.getRotationSchedule({
      taskId: task.id,
    });

    // Member 2 should not be in any occurrence
    const hasMember2 = schedule.some((occ) =>
      occ.assignedMemberIds.includes(testMember2Id)
    );
    expect(hasMember2).toBe(false);

    // Clean up
    await db.delete(tasks).where(eq(tasks.id, task.id));
  });
});
