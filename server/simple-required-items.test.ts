/**
 * Unit Test: SimpleRequiredItemsSection logic
 * Tests the filtering and display logic for non-repeating task items (occurrenceNumber=0)
 */
import { describe, it, expect } from "vitest";

const SINGLE_OCCURRENCE = 0;

// Simulate the item filtering logic from SimpleRequiredItemsSection
function filterItemsForSingleOccurrence(
  allItems: Array<{ id: number; occurrenceNumber: number; itemName: string }>
) {
  return allItems.filter((item) => item.occurrenceNumber === SINGLE_OCCURRENCE);
}

// Simulate the display condition from TaskDetailDialog
function shouldShowSimpleSection(task: { repeatUnit?: string | null }) {
  return !task.repeatUnit;
}

function shouldShowRepeatSection(task: { repeatUnit?: string | null }, rotationScheduleLength: number) {
  return Boolean(task.repeatUnit) && rotationScheduleLength > 0;
}

describe("SimpleRequiredItemsSection logic", () => {
  describe("filterItemsForSingleOccurrence", () => {
    it("should return only items with occurrenceNumber=0", () => {
      const items = [
        { id: 1, occurrenceNumber: 0, itemName: "Hammer" },
        { id: 2, occurrenceNumber: 1, itemName: "Schrauben" },
        { id: 3, occurrenceNumber: 2, itemName: "Bohrer" },
        { id: 4, occurrenceNumber: 0, itemName: "Säge" },
      ];
      const result = filterItemsForSingleOccurrence(items);
      expect(result).toHaveLength(2);
      expect(result[0].itemName).toBe("Hammer");
      expect(result[1].itemName).toBe("Säge");
    });

    it("should return empty array when no items have occurrenceNumber=0", () => {
      const items = [
        { id: 1, occurrenceNumber: 1, itemName: "Hammer" },
        { id: 2, occurrenceNumber: 2, itemName: "Schrauben" },
      ];
      const result = filterItemsForSingleOccurrence(items);
      expect(result).toHaveLength(0);
    });

    it("should return empty array for empty input", () => {
      expect(filterItemsForSingleOccurrence([])).toHaveLength(0);
    });
  });

  describe("shouldShowSimpleSection (non-repeating tasks)", () => {
    it("should show simple section when repeatUnit is null", () => {
      expect(shouldShowSimpleSection({ repeatUnit: null })).toBe(true);
    });

    it("should show simple section when repeatUnit is undefined", () => {
      expect(shouldShowSimpleSection({ repeatUnit: undefined })).toBe(true);
    });

    it("should NOT show simple section when repeatUnit is 'weeks'", () => {
      expect(shouldShowSimpleSection({ repeatUnit: "weeks" })).toBe(false);
    });

    it("should NOT show simple section when repeatUnit is 'days'", () => {
      expect(shouldShowSimpleSection({ repeatUnit: "days" })).toBe(false);
    });

    it("should NOT show simple section when repeatUnit is 'months'", () => {
      expect(shouldShowSimpleSection({ repeatUnit: "months" })).toBe(false);
    });

    it("should NOT show simple section when repeatUnit is 'irregular'", () => {
      expect(shouldShowSimpleSection({ repeatUnit: "irregular" })).toBe(false);
    });
  });

  describe("shouldShowRepeatSection (repeating tasks)", () => {
    it("should show repeat section when repeatUnit is set and schedule has items", () => {
      expect(shouldShowRepeatSection({ repeatUnit: "weeks" }, 3)).toBe(true);
    });

    it("should NOT show repeat section when repeatUnit is null", () => {
      expect(shouldShowRepeatSection({ repeatUnit: null }, 3)).toBe(false);
    });

    it("should NOT show repeat section when schedule is empty", () => {
      expect(shouldShowRepeatSection({ repeatUnit: "weeks" }, 0)).toBe(false);
    });
  });

  describe("mutual exclusivity of sections", () => {
    it("should show only simple section for non-repeating task", () => {
      const task = { repeatUnit: null };
      const scheduleLength = 0;
      expect(shouldShowSimpleSection(task)).toBe(true);
      expect(shouldShowRepeatSection(task, scheduleLength)).toBe(false);
    });

    it("should show only repeat section for repeating task with schedule", () => {
      const task = { repeatUnit: "weeks" };
      const scheduleLength = 3;
      expect(shouldShowSimpleSection(task)).toBe(false);
      expect(shouldShowRepeatSection(task, scheduleLength)).toBe(true);
    });
  });
});
