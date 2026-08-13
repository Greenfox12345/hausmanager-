import { describe, expect, it } from "vitest";
import { toOccurrenceDateKey } from "./db";

describe("toOccurrenceDateKey", () => {
  it("bewahrt ein vom Frontend geliefertes Kalenderdatum unverändert", () => {
    expect(toOccurrenceDateKey("2026-08-13")).toBe("2026-08-13");
    expect(toOccurrenceDateKey("2026-08-13 12:00:00")).toBe("2026-08-13");
  });

  it("bildet Date-Werte über lokale Kalenderkomponenten ab", () => {
    expect(toOccurrenceDateKey(new Date(2026, 0, 9, 23, 30))).toBe("2026-01-09");
    expect(toOccurrenceDateKey(new Date(2026, 11, 31, 12, 0))).toBe("2026-12-31");
  });
});
