import { describe, expect, it } from "vitest";
import { getDaysUntilDue, isWithinDndWindow } from "../shared/notificationRules";

describe("In-App-Erinnerungsregeln", () => {
  it("erkennt Ruhezeiten innerhalb eines Tages", () => {
    expect(isWithinDndWindow("09:00", "17:00", new Date(2026, 7, 13, 12, 0))).toBe(true);
    expect(isWithinDndWindow("09:00", "17:00", new Date(2026, 7, 13, 18, 0))).toBe(false);
  });

  it("erkennt Ruhezeiten über Mitternacht", () => {
    expect(isWithinDndWindow("22:00", "07:00", new Date(2026, 7, 13, 23, 30))).toBe(true);
    expect(isWithinDndWindow("22:00", "07:00", new Date(2026, 7, 14, 6, 30))).toBe(true);
    expect(isWithinDndWindow("22:00", "07:00", new Date(2026, 7, 14, 12, 0))).toBe(false);
  });

  it("berechnet Fälligkeit anhand von Kalendertagen statt Uhrzeiten", () => {
    const now = new Date(2026, 7, 13, 23, 30);
    expect(getDaysUntilDue(new Date(2026, 7, 13, 0, 1), now)).toBe(0);
    expect(getDaysUntilDue(new Date(2026, 7, 14, 0, 1), now)).toBe(1);
  });
});
