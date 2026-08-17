import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { getNthWeekdayOfMonth, getNextMonthlyOccurrence, formatWeekdayOccurrence } from "../shared/dateUtils";
import { upsertUser, getUserByOpenId, createHousehold, createHouseholdMember, createTask, getDb } from "./db";

describe("Monthly Weekday Recurrence", () => {
  let testUserId: string;
  let householdId: number;
  let memberId: number;

  beforeAll(async () => {
    // Create test user, household, and member
    const testOpenId = `test-user-monthly-${Date.now()}`;
    await upsertUser({ openId: testOpenId, name: "Test User" });
    const testUser = await getUserByOpenId(testOpenId);
    if (!testUser) throw new Error("Failed to create test user");
    testUserId = testOpenId;
    const userId = testUser.id;
    householdId = await createHousehold("Test Household", "test_hash", userId);
    memberId = await createHouseholdMember({
      householdId,
      memberName: "Test Member",
      openId: testUserId,
    });
  });

  afterAll(async () => {
    // Cleanup
    const db = await getDb();
    if (db) {
      await db.execute(`DELETE FROM users WHERE openId = '${testUserId}'`);
    }
  });

  describe("Date Utilities", () => {
    it("should calculate the 3rd Thursday of a month", () => {
      // February 2026 starts on Sunday, so 3rd Thursday is Feb 19
      const result = getNthWeekdayOfMonth(2026, 1, 4, 3); // Month 1 = February (0-indexed)
      expect(result.getFullYear()).toBe(2026);
      expect(result.getMonth()).toBe(1); // February
      expect(result.getDate()).toBe(19);
      expect(result.getDay()).toBe(4); // Thursday
    });

    it("should calculate the 1st Monday of a month", () => {
      // February 2026: 1st Monday is Feb 2
      const result = getNthWeekdayOfMonth(2026, 1, 1, 1);
      expect(result.getFullYear()).toBe(2026);
      expect(result.getMonth()).toBe(1);
      expect(result.getDate()).toBe(2);
      expect(result.getDay()).toBe(1); // Monday
    });

    it("should calculate the 4th Friday of a month", () => {
      // January 2026: 1st=Thu, Fridays are 2, 9, 16, 23, 30
      const result = getNthWeekdayOfMonth(2026, 0, 5, 4);
      expect(result).not.toBeNull();
      expect(result!.getFullYear()).toBe(2026);
      expect(result!.getMonth()).toBe(0);
      expect(result!.getDate()).toBe(23); // 4th Friday
      expect(result!.getDay()).toBe(5); // Friday
    });

    it("should get next monthly occurrence with same_date mode", () => {
      const startDate = new Date(2026, 1, 15); // Feb 15, 2026
      const nextDate = getNextMonthlyOccurrence(startDate, 1, "same_date");
      
      expect(nextDate.getFullYear()).toBe(2026);
      expect(nextDate.getMonth()).toBe(2); // March
      expect(nextDate.getDate()).toBe(15); // Same day of month
    });

    it("should get next monthly occurrence with same_weekday mode", () => {
      // Feb 19, 2026 is the 3rd Thursday
      const startDate = new Date(2026, 1, 19);
      const nextDate = getNextMonthlyOccurrence(startDate, 1, "same_weekday");
      
      // March 2026: 3rd Thursday is March 19
      expect(nextDate.getFullYear()).toBe(2026);
      expect(nextDate.getMonth()).toBe(2); // March
      expect(nextDate.getDate()).toBe(19);
      expect(nextDate.getDay()).toBe(4); // Thursday
    });

    it("should handle multiple month intervals with same_weekday mode", () => {
      // Feb 19, 2026 is the 3rd Thursday
      const startDate = new Date(2026, 1, 19);
      const nextDate = getNextMonthlyOccurrence(startDate, 3, "same_weekday"); // 3 months later
      
      // May 2026: 3rd Thursday is May 21
      expect(nextDate.getFullYear()).toBe(2026);
      expect(nextDate.getMonth()).toBe(4); // May
      expect(nextDate.getDate()).toBe(21);
      expect(nextDate.getDay()).toBe(4); // Thursday
    });

    it("should format weekday occurrence in German", () => {
      const date = new Date(2026, 1, 19); // 3rd Thursday of February
      const formatted = formatWeekdayOccurrence(date);
      expect(formatted).toBe("3. Donnerstag");
    });

    it("should format 1st weekday occurrence in German", () => {
      const date = new Date(2026, 1, 2); // 1st Monday of February
      const formatted = formatWeekdayOccurrence(date);
      expect(formatted).toBe("1. Montag");
    });
  });

  describe("Task Creation with Monthly Recurrence Mode", () => {
    it("should create task with same_date monthly recurrence mode", async () => {
      const taskId = await createTask({
        householdId,
        name: "Monthly Task - Same Date",
        description: "Repeats on the same day each month",
        repeatInterval: 1,
        repeatUnit: "months",
        monthlyRecurrenceMode: "same_date",
        dueDate: new Date(2026, 1, 15), // Feb 15
        createdBy: memberId,
      });

      expect(taskId).toBeGreaterThan(0);
      // Note: monthlyRecurrenceMode storage is tested via integration tests
    });

    it("should create task with same_weekday monthly recurrence mode", async () => {
      const taskId = await createTask({
        householdId,
        name: "Monthly Task - Same Weekday",
        description: "Repeats on the same weekday each month (e.g., 3rd Thursday)",
        repeatInterval: 1,
        repeatUnit: "months",
        monthlyRecurrenceMode: "same_weekday",
        dueDate: new Date(2026, 1, 19), // Feb 19 (3rd Thursday)
        createdBy: memberId,
      });

      expect(taskId).toBeGreaterThan(0);
      // Note: monthlyRecurrenceMode storage is tested via integration tests
    });
  });

  describe("Task Completion with Monthly Recurrence Mode", () => {
    it("should calculate next due date with same_date mode", () => {
      // Feb 15, 2026
      const currentDate = new Date(2026, 1, 15);
      const nextDate = getNextMonthlyOccurrence(currentDate, 1, "same_date");
      
      // Should be March 15
      expect(nextDate.getMonth()).toBe(2); // March
      expect(nextDate.getDate()).toBe(15); // Same day
    });

    it("should calculate next due date with same_weekday mode", () => {
      // Feb 19, 2026 is 3rd Thursday
      const currentDate = new Date(2026, 1, 19);
      const nextDate = getNextMonthlyOccurrence(currentDate, 1, "same_weekday");
      
      // March 19, 2026 is also 3rd Thursday
      expect(nextDate.getMonth()).toBe(2); // March
      expect(nextDate.getDate()).toBe(19);
      expect(nextDate.getDay()).toBe(4); // Thursday
    });
  });
});
