import { describe, expect, it } from "vitest";
import { canModifyBalanceEntry, toBalanceAmountCents } from "../shared/balanceRules";

describe("Bilanzregeln", () => {
  it("erlaubt Korrekturen bis einschließlich fünf Tage nach Erfassung", () => {
    const createdAt = new Date("2026-08-01T12:00:00");
    expect(canModifyBalanceEntry(createdAt, new Date("2026-08-06T12:00:00"))).toBe(true);
    expect(canModifyBalanceEntry(createdAt, new Date("2026-08-06T12:00:01"))).toBe(false);
  });

  it("normalisiert Geldwerte ohne Gleitkomma-Rundungsfehler auf Cent", () => {
    expect(toBalanceAmountCents(12.3)).toBe(1230);
    expect(toBalanceAmountCents(0.1 + 0.2)).toBe(30);
  });
});
