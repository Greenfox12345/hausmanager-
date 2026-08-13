import { describe, expect, it } from "vitest";
import { shouldShowJumpToCurrent } from "../client/src/lib/taskOccurrenceNavigation";

describe("shouldShowJumpToCurrent", () => {
  const now = new Date(2026, 7, 13, 12, 0);

  it("zeigt den Sprung für Folgetermine", () => {
    expect(shouldShowJumpToCurrent({ isFutureOccurrence: true }, now)).toBe(true);
  });

  it("zeigt den Sprung für vergangene, noch offene Termine", () => {
    expect(shouldShowJumpToCurrent({ dueDate: new Date(2026, 7, 12, 9, 0) }, now)).toBe(true);
  });

  it("blendet den Sprung für erledigte, ausgelassene und aktuelle Termine aus", () => {
    expect(shouldShowJumpToCurrent({ dueDate: new Date(2026, 7, 12), isCompleted: true }, now)).toBe(false);
    expect(shouldShowJumpToCurrent({ dueDate: new Date(2026, 7, 12), isSkippedOccurrence: true }, now)).toBe(false);
    expect(shouldShowJumpToCurrent({ dueDate: new Date(2026, 7, 13, 13, 0) }, now)).toBe(false);
  });
});
