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
import { format } from "date-fns";

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

describe("Tasks - Skipped Dates", () => {
  let testHouseholdId: number;
  let testMemberId: number;
  let testTaskId: number;
  let userId: number;

  beforeAll(async () => {
    // Create test user first
    await upsertUser({
      openId: "test-user-skipped-dates",
      email: "test-skipped@example.com",
      name: "Test User Skipped",
    });

    const { getUserByOpenId } = await import("./db");
    const user = await getUserByOpenId("test-user-skipped-dates");
    if (!user) throw new Error("Failed to create test user");
    userId = user.id;

    // Create test household
    testHouseholdId = await createHousehold(
      "Test Household - Skipped Dates",
      "test-password-hash",
      userId
    );

    // Create test member
    testMemberId = await createHouseholdMember({
      householdId: testHouseholdId,
      memberName: "Test Member",
      isActive: true,
    });

    // Create recurring task
    const today = new Date();
    testTaskId = await createTask({
      householdId: testHouseholdId,
      name: "Weekly Recurring Task",
      description: "Test task for skipped dates",
      assignedTo: testMemberId,
      dueDate: today,
      repeatInterval: 1,
      repeatUnit: "weeks",
      enableRotation: false,
      createdBy: testMemberId,
    });
  });

  afterAll(async () => {
    if (testHouseholdId) {
      await deleteHousehold(testHouseholdId);
    }
  });

  it("should skip an occurrence and add to skippedDates array", async () => {
    const dateToSkip = format(new Date(), "yyyy-MM-dd");
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.tasks.skipOccurrence({
      taskId: testTaskId,
      householdId: testHouseholdId,
      memberId: testMemberId,
      dateToSkip,
    });

    expect(result.success).toBe(true);

    // Verify the task has the skipped date
    const tasks = await getTasks(testHouseholdId);
    const task = tasks.find((t) => t.id === testTaskId);
    expect(task?.skippedDates).toContain(dateToSkip);
  });

  it("should restore a skipped occurrence and remove from skippedDates array", async () => {
    const dateToRestore = "2026-01-15";
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    // First skip the date
    await caller.tasks.skipOccurrence({
      taskId: testTaskId,
      householdId: testHouseholdId,
      memberId: testMemberId,
      dateToSkip: dateToRestore,
    });

    // Then restore it
    const result = await caller.tasks.restoreSkippedDate({
      taskId: testTaskId,
      householdId: testHouseholdId,
      memberId: testMemberId,
      dateToRestore,
    });

    expect(result.success).toBe(true);

    // Verify the task no longer has the skipped date
    const tasks = await getTasks(testHouseholdId);
    const task = tasks.find((t) => t.id === testTaskId);
    expect(task?.skippedDates).not.toContain(dateToRestore);
  });

  it("should handle multiple skipped dates", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);
    const date1 = "2026-02-01";
    const date2 = "2026-02-08";
    const date3 = "2026-02-15";

    // Skip multiple dates
    await caller.tasks.skipOccurrence({
      taskId: testTaskId,
      householdId: testHouseholdId,
      memberId: testMemberId,
      dateToSkip: date1,
    });

    await caller.tasks.skipOccurrence({
      taskId: testTaskId,
      householdId: testHouseholdId,
      memberId: testMemberId,
      dateToSkip: date2,
    });

    await caller.tasks.skipOccurrence({
      taskId: testTaskId,
      householdId: testHouseholdId,
      memberId: testMemberId,
      dateToSkip: date3,
    });

    // Verify all dates are skipped
    const tasks = await getTasks(testHouseholdId);
    const task = tasks.find((t) => t.id === testTaskId);
    expect(task?.skippedDates).toContain(date1);
    expect(task?.skippedDates).toContain(date2);
    expect(task?.skippedDates).toContain(date3);

    // Restore one date
    await caller.tasks.restoreSkippedDate({
      taskId: testTaskId,
      householdId: testHouseholdId,
      memberId: testMemberId,
      dateToRestore: date2,
    });

    // Verify only date2 is restored
    const updatedTasks = await getTasks(testHouseholdId);
    const updatedTask = updatedTasks.find((t) => t.id === testTaskId);
    expect(updatedTask?.skippedDates).toContain(date1);
    expect(updatedTask?.skippedDates).not.toContain(date2);
    expect(updatedTask?.skippedDates).toContain(date3);
  });

  it("should log skip action in activity history", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);
    const dateToSkip = "2026-03-01";

    await caller.tasks.skipOccurrence({
      taskId: testTaskId,
      householdId: testHouseholdId,
      memberId: testMemberId,
      dateToSkip,
    });

    // Check activity history
    const activities = await caller.activities.list({
      householdId: testHouseholdId,
      limit: 10,
    });

    const skipActivity = activities.activities.find(
      (a) => a.action === "skipped" && a.relatedItemId === testTaskId
    );

    expect(skipActivity).toBeDefined();
    expect(skipActivity?.description).toContain("Termin übersprungen");
  });

  it("should log restore action in activity history", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);
    const dateToRestore = "2026-03-08";

    // First skip
    await caller.tasks.skipOccurrence({
      taskId: testTaskId,
      householdId: testHouseholdId,
      memberId: testMemberId,
      dateToSkip: dateToRestore,
    });

    // Then restore
    await caller.tasks.restoreSkippedDate({
      taskId: testTaskId,
      householdId: testHouseholdId,
      memberId: testMemberId,
      dateToRestore,
    });

    // Check activity history
    const activities = await caller.activities.list({
      householdId: testHouseholdId,
      limit: 10,
    });

    const restoreActivity = activities.activities.find(
      (a) => a.action === "restored" && a.relatedItemId === testTaskId
    );

    expect(restoreActivity).toBeDefined();
    expect(restoreActivity?.description).toContain("wiederhergestellt");
  });
});
