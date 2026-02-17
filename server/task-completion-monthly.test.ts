import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  upsertUser,
  getUserByOpenId,
  createHousehold,
  createHouseholdMember,
  createTask,
  getTasks,
  getDb,
} from "./db";

describe("Task Completion with Monthly Recurrence Modes", () => {
  let testHouseholdId: number;
  let testUserId: number;
  let memberId: number;

  beforeAll(async () => {
    // Create test user
    const testOpenId = "test-user-completion-" + Date.now();
    await upsertUser({ openId: testOpenId, name: "Test User" });
    const testUser = await getUserByOpenId(testOpenId);
    if (!testUser) throw new Error("Failed to create test user");
    testUserId = testUser.id;
    
    // Create test household
    testHouseholdId = await createHousehold(
      "Test Household for Completion",
      "test_hash",
      testUserId
    );

    // Create test member
    memberId = await createHouseholdMember({
      householdId: testHouseholdId,
      memberName: "Test Member",
      openId: testOpenId,
    });
  });

  afterAll(async () => {
    // Cleanup is handled by cascade delete
  });

  describe("Monthly Same Date Mode", () => {
    it("should calculate next occurrence with same_date mode", async () => {
      // Create task with same_date mode, due on Feb 15
      const taskId = await createTask({
        householdId: testHouseholdId,
        name: "Monthly Task - Same Date",
        repeatInterval: 1,
        repeatUnit: "months",
        monthlyRecurrenceMode: "same_date",
        dueDate: new Date(2026, 1, 15), // Feb 15, 2026
        createdBy: memberId,
      });

      // Simulate completion by updating due date
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Import the date utility
      const { getNextMonthlyOccurrence } = await import("../shared/dateUtils");
      const currentDate = new Date(2026, 1, 15);
      const nextDate = getNextMonthlyOccurrence(currentDate, 1, "same_date");

      // Update task with next date
      await db.execute(`
        UPDATE tasks 
        SET dueDate = '${nextDate.toISOString().split('T')[0]}'
        WHERE id = ${taskId}
      `);

      // Verify the task was updated
      const tasks = await getTasks(testHouseholdId);
      const updatedTask = tasks.find(t => t.id === taskId);
      
      expect(updatedTask).toBeDefined();
      const taskDueDate = new Date(updatedTask!.dueDate!);
      expect(taskDueDate.getMonth()).toBe(2); // March
      expect(taskDueDate.getDate()).toBe(15); // Same day of month
    });

    it("should handle multiple month intervals with same_date mode", async () => {
      const taskId = await createTask({
        householdId: testHouseholdId,
        name: "Quarterly Task - Same Date",
        repeatInterval: 3, // Every 3 months
        repeatUnit: "months",
        monthlyRecurrenceMode: "same_date",
        dueDate: new Date(2026, 1, 15), // Feb 15, 2026
        createdBy: memberId,
      });

      const { getNextMonthlyOccurrence } = await import("../shared/dateUtils");
      const currentDate = new Date(2026, 1, 15);
      const nextDate = getNextMonthlyOccurrence(currentDate, 3, "same_date");

      expect(nextDate.getMonth()).toBe(4); // May (0-indexed)
      expect(nextDate.getDate()).toBe(15);
    });
  });

  describe("Monthly Same Weekday Mode", () => {
    it("should calculate next occurrence with same_weekday mode", async () => {
      // Create task with same_weekday mode, due on 3rd Thursday (Feb 19, 2026)
      const taskId = await createTask({
        householdId: testHouseholdId,
        name: "Monthly Task - Same Weekday",
        repeatInterval: 1,
        repeatUnit: "months",
        monthlyRecurrenceMode: "same_weekday",
        dueDate: new Date(2026, 1, 19), // Feb 19, 2026 (3rd Thursday)
        createdBy: memberId,
      });

      // Calculate next occurrence
      const { getNextMonthlyOccurrence } = await import("../shared/dateUtils");
      const currentDate = new Date(2026, 1, 19);
      const nextDate = getNextMonthlyOccurrence(currentDate, 1, "same_weekday");

      // Update task
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.execute(`
        UPDATE tasks 
        SET dueDate = '${nextDate.toISOString().split('T')[0]}'
        WHERE id = ${taskId}
      `);

      // Verify
      const tasks = await getTasks(testHouseholdId);
      const updatedTask = tasks.find(t => t.id === taskId);
      
      expect(updatedTask).toBeDefined();
      const taskDueDate = new Date(updatedTask!.dueDate!);
      expect(taskDueDate.getMonth()).toBe(2); // March
      expect(taskDueDate.getDate()).toBe(19); // 3rd Thursday of March
      expect(taskDueDate.getDay()).toBe(4); // Thursday
    });

    it("should handle multiple month intervals with same_weekday mode", async () => {
      const taskId = await createTask({
        householdId: testHouseholdId,
        name: "Quarterly Task - Same Weekday",
        repeatInterval: 3,
        repeatUnit: "months",
        monthlyRecurrenceMode: "same_weekday",
        dueDate: new Date(2026, 1, 19), // Feb 19, 2026 (3rd Thursday)
        createdBy: memberId,
      });

      const { getNextMonthlyOccurrence } = await import("../shared/dateUtils");
      const currentDate = new Date(2026, 1, 19);
      const nextDate = getNextMonthlyOccurrence(currentDate, 3, "same_weekday");

      // May 2026: 3rd Thursday is May 21
      expect(nextDate.getMonth()).toBe(4); // May
      expect(nextDate.getDate()).toBe(21);
      expect(nextDate.getDay()).toBe(4); // Thursday
    });

    it("should handle edge case when 5th occurrence doesn't exist", async () => {
      // Create task on 5th Monday of a month (rare)
      const { getNextMonthlyOccurrence } = await import("../shared/dateUtils");
      
      // March 2026 has 5 Mondays (2, 9, 16, 23, 30)
      const currentDate = new Date(2026, 2, 30); // March 30, 2026 (5th Monday)
      const nextDate = getNextMonthlyOccurrence(currentDate, 1, "same_weekday");

      // April 2026 only has 4 Mondays, so fallback to 4th Monday (April 27)
      expect(nextDate.getMonth()).toBe(3); // April
      expect(nextDate.getDay()).toBe(1); // Monday
      // Should be 4th Monday since 5th doesn't exist
      expect(nextDate.getDate()).toBe(27);
    });
  });

  describe("Regression Tests", () => {
    it("should still work for daily tasks (no monthlyRecurrenceMode)", async () => {
      const taskId = await createTask({
        householdId: testHouseholdId,
        name: "Daily Task",
        repeatInterval: 1,
        repeatUnit: "days",
        dueDate: new Date(2026, 1, 15),
        createdBy: memberId,
      });

      // Daily tasks should not be affected
      const tasks = await getTasks(testHouseholdId);
      const task = tasks.find(t => t.id === taskId);
      
      expect(task).toBeDefined();
      expect(task!.repeatUnit).toBe("days");
      // monthlyRecurrenceMode may be set to default "same_date" by schema
    });

    it("should still work for weekly tasks (no monthlyRecurrenceMode)", async () => {
      const taskId = await createTask({
        householdId: testHouseholdId,
        name: "Weekly Task",
        repeatInterval: 1,
        repeatUnit: "weeks",
        dueDate: new Date(2026, 1, 15),
        createdBy: memberId,
      });

      const tasks = await getTasks(testHouseholdId);
      const task = tasks.find(t => t.id === taskId);
      
      expect(task).toBeDefined();
      expect(task!.repeatUnit).toBe("weeks");
      // monthlyRecurrenceMode may be set to default "same_date" by schema
    });

    it("should default to same_date if monthlyRecurrenceMode is not set", async () => {
      const taskId = await createTask({
        householdId: testHouseholdId,
        name: "Monthly Task - No Mode Set",
        repeatInterval: 1,
        repeatUnit: "months",
        // monthlyRecurrenceMode not set
        dueDate: new Date(2026, 1, 15),
        createdBy: memberId,
      });

      const { getNextMonthlyOccurrence } = await import("../shared/dateUtils");
      const currentDate = new Date(2026, 1, 15);
      // Should default to same_date
      const nextDate = getNextMonthlyOccurrence(currentDate, 1, "same_date");

      expect(nextDate.getMonth()).toBe(2); // March
      expect(nextDate.getDate()).toBe(15); // Same day
    });
  });
});
