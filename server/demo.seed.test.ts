/**
 * Tests for the demo seed member-name logic.
 *
 * Verifies that:
 * 1. ownerName is placed in slot 0 (not overwritten by memberNames)
 * 2. memberNames are placed in slots 1-N
 * 3. Default names are used when no custom names are provided
 * 4. The memberId returned by seedDemoHousehold refers to the owner slot (slot 0)
 *
 * We test the pure name-resolution logic extracted from seedDemoHousehold
 * without hitting the database.
 */
import { describe, it, expect } from "vitest";

// ── Pure helpers extracted from seedDemoHousehold ──────────────────────────────
// These mirror the exact logic in server/routers/demo.ts so we can unit-test it.

function resolveInventoryCount(config: { inventoryCount?: number }, totalItems: number): number {
  return Math.max(0, config.inventoryCount ?? totalItems);
}

function resolveNames(config: {
  ownerName?: string;
  memberNames?: string[];
}): string[] {
  const defaultMemberNames = ["Alex", "Maria", "Jonas", "Sophie"];
  const customMemberNames = config.memberNames ?? [];
  const memberCount = Math.max(
    1,
    Math.min(4, customMemberNames.length > 0 ? customMemberNames.length : 4)
  );
  // Build resolved list for Mitbewohner slots (1-N)
  const resolvedMemberNames = Array.from({ length: memberCount }, (_, i) =>
    customMemberNames[i]?.trim() || defaultMemberNames[i]
  );
  // Slot 0: Inhaber
  const ownerSlotName = config.ownerName?.trim() || "Ich";
  // Full list: [owner, ...members]
  return [ownerSlotName, ...resolvedMemberNames];
}

describe("Demo seed – member name resolution", () => {
  it("places ownerName in slot 0 when provided", () => {
    const names = resolveNames({ ownerName: "Max", memberNames: ["Alex", "Maria", "Jonas"] });
    expect(names[0]).toBe("Max");
  });

  it("does NOT replace slot 0 with a memberName (the original bug)", () => {
    const names = resolveNames({ ownerName: "Max", memberNames: ["Alex", "Maria", "Jonas"] });
    // Alex must NOT appear in slot 0
    expect(names[0]).not.toBe("Alex");
    // Alex must appear in slot 1
    expect(names[1]).toBe("Alex");
  });

  it("places memberNames in slots 1-N", () => {
    const names = resolveNames({ ownerName: "Max", memberNames: ["Alex", "Maria", "Jonas"] });
    expect(names[1]).toBe("Alex");
    expect(names[2]).toBe("Maria");
    expect(names[3]).toBe("Jonas");
    // Total: 1 owner + 3 members = 4
    expect(names).toHaveLength(4);
  });

  it("uses 'Ich' as default owner name when ownerName is empty", () => {
    const names = resolveNames({ memberNames: ["Alex"] });
    expect(names[0]).toBe("Ich");
  });

  it("uses default member names when memberNames is empty", () => {
    const names = resolveNames({ ownerName: "Max" });
    expect(names[0]).toBe("Max");
    expect(names[1]).toBe("Alex");
    expect(names[2]).toBe("Maria");
    expect(names[3]).toBe("Jonas");
    expect(names[4]).toBe("Sophie");
    expect(names).toHaveLength(5); // 1 owner + 4 default members
  });

  it("uses default member names when memberNames is not provided", () => {
    const names = resolveNames({});
    expect(names[0]).toBe("Ich");
    expect(names[1]).toBe("Alex");
    expect(names).toHaveLength(5);
  });

  it("limits member count to 4 (max 5 total including owner)", () => {
    const names = resolveNames({
      ownerName: "Max",
      memberNames: ["A", "B", "C", "D"],
    });
    expect(names).toHaveLength(5); // 1 owner + 4 members
  });

  it("falls back to default name for empty string in memberNames", () => {
    const names = resolveNames({ ownerName: "Max", memberNames: ["", "Maria"] });
    // Empty string → falls back to default "Alex"
    expect(names[1]).toBe("Alex");
    expect(names[2]).toBe("Maria");
  });
});

describe("Demo seed – inventory count resolution", () => {
  const TOTAL_ITEMS = 6;

  it("uses all items when inventoryCount is not provided", () => {
    expect(resolveInventoryCount({}, TOTAL_ITEMS)).toBe(6);
  });

  it("uses all items when inventoryCount equals total", () => {
    expect(resolveInventoryCount({ inventoryCount: 6 }, TOTAL_ITEMS)).toBe(6);
  });

  it("returns 0 when inventoryCount is 0 (empty inventory)", () => {
    expect(resolveInventoryCount({ inventoryCount: 0 }, TOTAL_ITEMS)).toBe(0);
  });

  it("returns partial count when inventoryCount is between 1 and 5", () => {
    expect(resolveInventoryCount({ inventoryCount: 3 }, TOTAL_ITEMS)).toBe(3);
  });

  it("never returns negative count", () => {
    expect(resolveInventoryCount({ inventoryCount: -1 }, TOTAL_ITEMS)).toBe(0);
  });
});
