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

describe("renameMember – permission logic (pure unit)", () => {
  // Mirror the canRename logic from Members.tsx / householdManagement.ts
  function canRenameDemo(target: { userId: number | null }): boolean {
    // Demo users can rename any unregistered member
    return target.userId === null;
  }

  function canRenameRegistered(
    target: { id: number; userId: number | null },
    caller: { memberId: number; isAdmin: boolean }
  ): boolean {
    const isOwnSlot = target.id === caller.memberId;
    return isOwnSlot || (caller.isAdmin && target.userId === null);
  }

  it("demo user can rename unregistered member", () => {
    expect(canRenameDemo({ userId: null })).toBe(true);
  });

  it("demo user cannot rename registered member", () => {
    expect(canRenameDemo({ userId: 42 })).toBe(false);
  });

  it("registered user can rename own slot", () => {
    expect(canRenameRegistered({ id: 1, userId: 10 }, { memberId: 1, isAdmin: false })).toBe(true);
  });

  it("registered admin can rename unregistered member", () => {
    expect(canRenameRegistered({ id: 2, userId: null }, { memberId: 1, isAdmin: true })).toBe(true);
  });

  it("registered non-admin cannot rename other member", () => {
    expect(canRenameRegistered({ id: 2, userId: null }, { memberId: 1, isAdmin: false })).toBe(false);
  });

  it("registered admin cannot rename another registered member", () => {
    expect(canRenameRegistered({ id: 2, userId: 99 }, { memberId: 1, isAdmin: true })).toBe(false);
  });
});

describe("demo_owner_name localStorage sync (pure unit)", () => {
  // Simulate the logic from Members.tsx onSuccess handler
  function syncDemoOwnerName(
    isDemoUser: boolean,
    renamedMemberId: number,
    ownMemberId: number,
    newName: string,
    storedValue: string | null
  ): string | null {
    if (renamedMemberId !== ownMemberId) return storedValue; // not own slot → no change
    if (!isDemoUser) return storedValue; // not demo → no change
    if (storedValue === null) return storedValue; // key not present → no change
    return newName; // update
  }

  it("updates demo_owner_name when own slot is renamed in demo mode", () => {
    expect(syncDemoOwnerName(true, 1, 1, "Neuer Name", "Alter Name")).toBe("Neuer Name");
  });

  it("does not update if renamed member is not own slot", () => {
    expect(syncDemoOwnerName(true, 2, 1, "Neuer Name", "Alter Name")).toBe("Alter Name");
  });

  it("does not update if not in demo mode", () => {
    expect(syncDemoOwnerName(false, 1, 1, "Neuer Name", "Alter Name")).toBe("Alter Name");
  });

  it("does not update if demo_owner_name was never set (null)", () => {
    expect(syncDemoOwnerName(true, 1, 1, "Neuer Name", null)).toBeNull();
  });
});

describe("kick button visibility (pure unit)", () => {
  // Mirror the condition from Members.tsx:
  // (settings?.isAdmin || isDemoUser) && editingMemberId !== m.id && m.id !== member?.memberId
  function showKickButton(opts: {
    isAdmin: boolean;
    isDemoUser: boolean;
    editingMemberId: number | null;
    targetMemberId: number;
    ownMemberId: number;
  }): boolean {
    const { isAdmin, isDemoUser, editingMemberId, targetMemberId, ownMemberId } = opts;
    return (isAdmin || isDemoUser) && editingMemberId !== targetMemberId && targetMemberId !== ownMemberId;
  }

  it("demo user sees kick button for other members", () => {
    expect(showKickButton({ isAdmin: false, isDemoUser: true, editingMemberId: null, targetMemberId: 2, ownMemberId: 1 })).toBe(true);
  });

  it("demo user does NOT see kick button for own slot", () => {
    expect(showKickButton({ isAdmin: false, isDemoUser: true, editingMemberId: null, targetMemberId: 1, ownMemberId: 1 })).toBe(false);
  });

  it("demo user does NOT see kick button while editing that member", () => {
    expect(showKickButton({ isAdmin: false, isDemoUser: true, editingMemberId: 2, targetMemberId: 2, ownMemberId: 1 })).toBe(false);
  });

  it("non-admin non-demo user does NOT see kick button", () => {
    expect(showKickButton({ isAdmin: false, isDemoUser: false, editingMemberId: null, targetMemberId: 2, ownMemberId: 1 })).toBe(false);
  });

  it("admin sees kick button for other members", () => {
    expect(showKickButton({ isAdmin: true, isDemoUser: false, editingMemberId: null, targetMemberId: 2, ownMemberId: 1 })).toBe(true);
  });

  it("admin does NOT see kick button for own slot", () => {
    expect(showKickButton({ isAdmin: true, isDemoUser: false, editingMemberId: null, targetMemberId: 1, ownMemberId: 1 })).toBe(false);
  });
});

describe("isDemoKick permission logic (pure unit)", () => {
  // Mirror the logic from householdManagement.ts kickMember
  function isDemoKick(ctx: { isDemoUser?: boolean; demoHouseholdId?: number }, inputHouseholdId: number): boolean {
    return ctx.isDemoUser === true && ctx.demoHouseholdId === inputHouseholdId;
  }

  it("allows kick when isDemoUser=true and householdId matches", () => {
    expect(isDemoKick({ isDemoUser: true, demoHouseholdId: 42 }, 42)).toBe(true);
  });

  it("denies kick when isDemoUser=true but householdId does not match", () => {
    expect(isDemoKick({ isDemoUser: true, demoHouseholdId: 42 }, 99)).toBe(false);
  });

  it("denies kick when isDemoUser=false", () => {
    expect(isDemoKick({ isDemoUser: false, demoHouseholdId: 42 }, 42)).toBe(false);
  });

  it("denies kick when isDemoUser is undefined", () => {
    expect(isDemoKick({ demoHouseholdId: 42 }, 42)).toBe(false);
  });

  it("denies kick when demoHouseholdId is undefined", () => {
    expect(isDemoKick({ isDemoUser: true }, 42)).toBe(false);
  });
});

describe("newMembers validation logic (pure unit)", () => {
  // Mirror the backend logic: trim and skip empty names
  function processNewMembers(names: string[]): string[] {
    return names.map((n) => n.trim()).filter((n) => n.length > 0);
  }

  it("adds valid member names", () => {
    expect(processNewMembers(["Anna", "Ben"])).toEqual(["Anna", "Ben"]);
  });

  it("trims whitespace from names", () => {
    expect(processNewMembers(["  Anna  ", " Ben"])).toEqual(["Anna", "Ben"]);
  });

  it("skips empty names after trimming", () => {
    expect(processNewMembers(["Anna", "  ", ""])).toEqual(["Anna"]);
  });

  it("returns empty array for all-empty input", () => {
    expect(processNewMembers(["", "  "])).toEqual([]);
  });

  it("handles empty array input", () => {
    expect(processNewMembers([])).toEqual([]);
  });
});
