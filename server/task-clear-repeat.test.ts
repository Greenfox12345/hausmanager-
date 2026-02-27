/**
 * Unit Test: Clearing repeat fields when task is updated to "no repeat" mode
 * Tests the logic that determines hasRepeat and the payload construction
 * when repeatMode is set to "none".
 */
import { describe, it, expect } from "vitest";

// Simulate the hasRepeat logic from TaskDetailDialog.tsx
function computeHasRepeat(task: {
  repeatUnit?: string | null;
  enableRepeat?: boolean | null;
  frequency?: string;
}) {
  // Primary source of truth: repeatUnit (null = no repeat, set = has repeat)
  // Fallback: enableRepeat flag for legacy data
  return Boolean(task.repeatUnit) || Boolean(task.enableRepeat);
}

// Simulate the payload construction from handleSave in TaskDetailDialog.tsx
function buildRepeatPayload(repeatMode: "none" | "irregular" | "regular", repeatInterval: string, repeatUnit: string) {
  return {
    frequency: repeatMode !== "none" ? "weekly" : "once",
    repeatInterval: repeatMode !== "none" ? parseInt(repeatInterval) : null,
    repeatUnit: repeatMode !== "none" ? repeatUnit : null,
    irregularRecurrence: repeatMode === "irregular" ? true : false,
    enableRotation: repeatMode !== "none" ? false : false,
  };
}

describe("Task repeat field clearing logic", () => {
  describe("computeHasRepeat", () => {
    it("should return false when repeatUnit is null", () => {
      expect(computeHasRepeat({ repeatUnit: null })).toBe(false);
    });

    it("should return false when repeatUnit is undefined", () => {
      expect(computeHasRepeat({ repeatUnit: undefined })).toBe(false);
    });

    it("should return true when repeatUnit is 'weeks'", () => {
      expect(computeHasRepeat({ repeatUnit: "weeks" })).toBe(true);
    });

    it("should return true when repeatUnit is 'days'", () => {
      expect(computeHasRepeat({ repeatUnit: "days" })).toBe(true);
    });

    it("should return true when repeatUnit is 'months'", () => {
      expect(computeHasRepeat({ repeatUnit: "months" })).toBe(true);
    });

    it("should return true when repeatUnit is 'irregular'", () => {
      expect(computeHasRepeat({ repeatUnit: "irregular" })).toBe(true);
    });

    it("should return false even if frequency is 'weekly' but repeatUnit is null (new behavior)", () => {
      // This is the key fix: frequency alone should NOT determine hasRepeat
      // Old broken behavior: Boolean(task.enableRepeat) || (task.frequency && task.frequency !== "once")
      // New correct behavior: Boolean(task.repeatUnit) || Boolean(task.enableRepeat)
      expect(computeHasRepeat({ repeatUnit: null, frequency: "weekly" })).toBe(false);
    });

    it("should return true for legacy data with enableRepeat=true but no repeatUnit", () => {
      expect(computeHasRepeat({ repeatUnit: null, enableRepeat: true })).toBe(true);
    });
  });

  describe("buildRepeatPayload when repeatMode is 'none'", () => {
    it("should send null for repeatInterval when repeatMode is none", () => {
      const payload = buildRepeatPayload("none", "1", "weeks");
      expect(payload.repeatInterval).toBeNull();
    });

    it("should send null for repeatUnit when repeatMode is none", () => {
      const payload = buildRepeatPayload("none", "1", "weeks");
      expect(payload.repeatUnit).toBeNull();
    });

    it("should send frequency 'once' when repeatMode is none", () => {
      const payload = buildRepeatPayload("none", "1", "weeks");
      expect(payload.frequency).toBe("once");
    });

    it("should send false for irregularRecurrence when repeatMode is none", () => {
      const payload = buildRepeatPayload("none", "1", "weeks");
      expect(payload.irregularRecurrence).toBe(false);
    });
  });

  describe("buildRepeatPayload when repeatMode is 'regular'", () => {
    it("should send repeatInterval as number when repeatMode is regular", () => {
      const payload = buildRepeatPayload("regular", "2", "weeks");
      expect(payload.repeatInterval).toBe(2);
    });

    it("should send repeatUnit when repeatMode is regular", () => {
      const payload = buildRepeatPayload("regular", "1", "months");
      expect(payload.repeatUnit).toBe("months");
    });

    it("should send false for irregularRecurrence when repeatMode is regular", () => {
      const payload = buildRepeatPayload("regular", "1", "weeks");
      expect(payload.irregularRecurrence).toBe(false);
    });
  });

  describe("buildRepeatPayload when repeatMode is 'irregular'", () => {
    it("should send true for irregularRecurrence when repeatMode is irregular", () => {
      const payload = buildRepeatPayload("irregular", "1", "irregular");
      expect(payload.irregularRecurrence).toBe(true);
    });
  });
});
