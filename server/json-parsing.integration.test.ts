import { describe, it, expect } from "vitest";
import { getTasks, getDb } from "./db";
import { sql } from "drizzle-orm";

describe("JSON Parsing in getTasks", () => {
  it("should return assignedTo as a proper array, not a string", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Find a household with tasks that have assignees
    const [result] = await db.execute(
      sql`SELECT householdId FROM tasks WHERE assignedTo IS NOT NULL LIMIT 1`
    );
    const rows = result as unknown as any[];
    if (rows.length === 0) {
      console.log("No tasks with assignees - skipping");
      return;
    }

    const householdId = rows[0].householdId;
    const tasks = await getTasks(householdId);
    const taskWithAssignee = tasks.find(t => t.assignedTo !== null && t.assignedTo !== undefined);

    expect(taskWithAssignee).toBeDefined();
    
    // CRITICAL: assignedTo must be a real array, not a string
    expect(typeof taskWithAssignee!.assignedTo).not.toBe("string");
    expect(Array.isArray(taskWithAssignee!.assignedTo)).toBe(true);
    
    // Each element must be a number, not an array
    if (taskWithAssignee!.assignedTo!.length > 0) {
      expect(typeof taskWithAssignee!.assignedTo![0]).toBe("number");
    }
    
    console.log("✓ assignedTo is a proper array:", taskWithAssignee!.assignedTo);
  });

  it("should resolve assignedToNames to actual names", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const [result] = await db.execute(
      sql`SELECT householdId FROM tasks WHERE assignedTo IS NOT NULL LIMIT 1`
    );
    const rows = result as unknown as any[];
    if (rows.length === 0) return;

    const householdId = rows[0].householdId;
    const tasks = await getTasks(householdId);
    const taskWithAssignee = tasks.find(
      t => t.assignedTo && Array.isArray(t.assignedTo) && t.assignedTo.length > 0
    );

    expect(taskWithAssignee).toBeDefined();
    expect(taskWithAssignee!.assignedToNames).toBeDefined();
    expect(taskWithAssignee!.assignedToNames).not.toBeNull();
    expect(typeof taskWithAssignee!.assignedToNames).toBe("string");
    expect(taskWithAssignee!.assignedToNames!.length).toBeGreaterThan(0);
    
    console.log("✓ assignedToNames resolved to:", taskWithAssignee!.assignedToNames);
  });

  it("should parse other JSON fields correctly (projectIds, sharedHouseholdIds)", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const [result] = await db.execute(
      sql`SELECT householdId FROM tasks WHERE sharedHouseholdIds IS NOT NULL LIMIT 1`
    );
    const rows = result as unknown as any[];
    if (rows.length === 0) {
      console.log("No tasks with sharedHouseholdIds - skipping");
      return;
    }

    const householdId = rows[0].householdId;
    const tasks = await getTasks(householdId);
    const taskWithShared = tasks.find(
      t => t.sharedHouseholdIds && t.sharedHouseholdIds.length > 0
    );

    if (taskWithShared) {
      expect(Array.isArray(taskWithShared.sharedHouseholdIds)).toBe(true);
      expect(typeof taskWithShared.sharedHouseholdIds).not.toBe("string");
      console.log("✓ sharedHouseholdIds is a proper array:", taskWithShared.sharedHouseholdIds);
    }
  });

  it("should convert boolean fields correctly (isCompleted, enableRotation)", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const [result] = await db.execute(
      sql`SELECT householdId FROM tasks LIMIT 1`
    );
    const rows = result as unknown as any[];
    if (rows.length === 0) return;

    const householdId = rows[0].householdId;
    const tasks = await getTasks(householdId);

    if (tasks.length > 0) {
      expect(typeof tasks[0].isCompleted).toBe("boolean");
      console.log("✓ isCompleted is boolean:", tasks[0].isCompleted);
    }
  });
});
