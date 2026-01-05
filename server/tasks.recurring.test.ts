import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import {
  createHousehold,
  createHouseholdMember,
  createTask,
  getTasks,
  deleteHousehold,
  upsertUser,
} from "./db";

function createTestContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

describe("Recurring Tasks Logic", () => {
  let householdId: number;
  let memberId: number;
  let taskId: number;
  let userId: number;

  beforeAll(async () => {
    // Create test user first (required for foreign key)
    await upsertUser({
      openId: "test-user-recurring",
      email: "test-recurring@example.com",
      name: "Test User Recurring",
    });

    // Get the user ID
    const { getUserByOpenId } = await import("./db");
    const user = await getUserByOpenId("test-user-recurring");
    if (!user) throw new Error("Failed to create test user");
    userId = user.id;

    // Create test household
    householdId = await createHousehold(
      "Test Household Recurring",
      "test-password-hash",
      userId
    );

    // Create test member
    memberId = await createHouseholdMember({
      householdId,
      memberName: "Test Member",
      isActive: true,
    });
  });

  afterAll(async () => {
    // Cleanup
    if (householdId) {
      await deleteHousehold(householdId);
    }
  });

  it("should move recurring task to next occurrence when completed (daily)", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    // Create a daily recurring task
    const originalDueDate = new Date("2026-01-10T10:00:00Z");
    taskId = await createTask({
      householdId,
      name: "Daily Task Test",
      description: "Test daily recurring task",
      createdBy: memberId,
      assignedTo: memberId,
      dueDate: originalDueDate,
      repeatInterval: 1,
      repeatUnit: "days",
      enableRotation: false,
    });

    // Complete the task
    await caller.tasks.toggleComplete({
      taskId,
      householdId,
      memberId,
      isCompleted: true,
    });

    // Verify task was moved to next day, not marked as completed
    const tasks = await getTasks(householdId);
    const task = tasks.find((t) => t.id === taskId);

    expect(task).toBeDefined();
    expect(task!.isCompleted).toBe(false);
    expect(task!.completedBy).toBeNull();
    expect(task!.completedAt).toBeNull();

    // Verify due date was moved forward by 1 day
    const expectedNextDate = new Date("2026-01-11T10:00:00Z");
    expect(task!.dueDate?.toISOString()).toBe(expectedNextDate.toISOString());
  });

  it("should move recurring task to next occurrence when completed (weekly)", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    // Create a weekly recurring task
    const originalDueDate = new Date("2026-01-10T10:00:00Z");
    const weeklyTaskId = await createTask({
      householdId,
      name: "Weekly Task Test",
      description: "Test weekly recurring task",
      createdBy: memberId,
      assignedTo: memberId,
      dueDate: originalDueDate,
      repeatInterval: 1,
      repeatUnit: "weeks",
      enableRotation: false,
    });

    // Complete the task
    await caller.tasks.toggleComplete({
      taskId: weeklyTaskId,
      householdId,
      memberId,
      isCompleted: true,
    });

    // Verify task was moved to next week
    const tasks = await getTasks(householdId);
    const task = tasks.find((t) => t.id === weeklyTaskId);

    expect(task).toBeDefined();
    expect(task!.isCompleted).toBe(false);

    // Verify due date was moved forward by 7 days
    const expectedNextDate = new Date("2026-01-17T10:00:00Z");
    expect(task!.dueDate?.toISOString()).toBe(expectedNextDate.toISOString());
  });

  it("should move recurring task to next occurrence when completed (monthly)", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    // Create a monthly recurring task
    const originalDueDate = new Date("2026-01-15T10:00:00Z");
    const monthlyTaskId = await createTask({
      householdId,
      name: "Monthly Task Test",
      description: "Test monthly recurring task",
      createdBy: memberId,
      assignedTo: memberId,
      dueDate: originalDueDate,
      repeatInterval: 1,
      repeatUnit: "months",
      enableRotation: false,
    });

    // Complete the task
    await caller.tasks.toggleComplete({
      taskId: monthlyTaskId,
      householdId,
      memberId,
      isCompleted: true,
    });

    // Verify task was moved to next month
    const tasks = await getTasks(householdId);
    const task = tasks.find((t) => t.id === monthlyTaskId);

    expect(task).toBeDefined();
    expect(task!.isCompleted).toBe(false);

    // Verify due date was moved forward by 1 month
    const expectedNextDate = new Date("2026-02-15T10:00:00Z");
    expect(task!.dueDate?.toISOString()).toBe(expectedNextDate.toISOString());
  });

  it("should rotate assignee when completing recurring task with rotation enabled", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    // Create second member for rotation
    const member2Id = await createHouseholdMember({
      householdId,
      memberName: "Test Member 2",
      isActive: true,
    });

    // Create a recurring task with rotation
    const originalDueDate = new Date("2026-01-10T10:00:00Z");
    const rotationTaskId = await createTask({
      householdId,
      name: "Rotation Task Test",
      description: "Test recurring task with rotation",
      createdBy: memberId,
      assignedTo: memberId,
      dueDate: originalDueDate,
      repeatInterval: 1,
      repeatUnit: "days",
      enableRotation: true,
    });

    // Complete the task
    await caller.tasks.toggleComplete({
      taskId: rotationTaskId,
      householdId,
      memberId,
      isCompleted: true,
    });

    // Verify task was moved to next day AND assigned to next member
    const tasks = await getTasks(householdId);
    const task = tasks.find((t) => t.id === rotationTaskId);

    expect(task).toBeDefined();
    expect(task!.isCompleted).toBe(false);
    expect(task!.assignedTo).toBe(member2Id); // Should be rotated to member 2

    // Verify due date was moved forward
    const expectedNextDate = new Date("2026-01-11T10:00:00Z");
    expect(task!.dueDate?.toISOString()).toBe(expectedNextDate.toISOString());
  });

  it("should mark non-recurring task as completed normally", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    // Create a non-recurring task
    const nonRecurringTaskId = await createTask({
      householdId,
      name: "Non-Recurring Task Test",
      description: "Test non-recurring task",
      createdBy: memberId,
      assignedTo: memberId,
      dueDate: new Date("2026-01-10T10:00:00Z"),
      repeatInterval: null,
      repeatUnit: null,
      enableRotation: false,
    });

    // Complete the task
    await caller.tasks.toggleComplete({
      taskId: nonRecurringTaskId,
      householdId,
      memberId,
      isCompleted: true,
    });

    // Verify task was marked as completed (NOT moved to next occurrence)
    const tasks = await getTasks(householdId);
    const task = tasks.find((t) => t.id === nonRecurringTaskId);

    expect(task).toBeDefined();
    expect(task!.isCompleted).toBe(true);
    expect(task!.completedBy).toBe(memberId);
    expect(task!.completedAt).toBeDefined();
    expect(task!.dueDate?.toISOString()).toBe(new Date("2026-01-10T10:00:00Z").toISOString());
  });
});
