import { describe, it, expect } from "vitest";
import { getTasks } from "./db";
import { getDb } from "./db";
import { sql } from "drizzle-orm";

describe("Assignee Display with Real Data", () => {
  it("should resolve assignedToNames from database", async () => {
    // Find a household that has tasks with assignees
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    
    const [result] = await db.execute(
      sql`SELECT householdId FROM tasks WHERE assignedTo IS NOT NULL LIMIT 1`
    );
    
    const rows = result as any[];
    if (rows.length === 0) {
      console.log("No tasks with assignees in database - skipping test");
      return;
    }
    
    const householdId = rows[0].householdId;
    console.log(`Testing with householdId: ${householdId}`);
    
    // Get tasks for this household
    const tasks = await getTasks(householdId);
    
    console.log(`Total tasks found: ${tasks.length}`);
    
    // Find tasks with assignees
    // Debug: log first task to see assignedTo structure
    if (tasks.length > 0) {
      console.log("First task raw data:", {
        id: tasks[0].id,
        assignedTo: tasks[0].assignedTo,
        assignedToType: typeof tasks[0].assignedTo,
        isArray: Array.isArray(tasks[0].assignedTo),
      });
    }
    
    const tasksWithAssignees = tasks.filter(t => t.assignedTo && Array.isArray(t.assignedTo) && t.assignedTo.length > 0);
    
    console.log(`Tasks with assignees: ${tasksWithAssignees.length}`);
    
    expect(tasksWithAssignees.length).toBeGreaterThan(0);
    
    const firstTask = tasksWithAssignees[0];
    
    console.log("First task with assignees:", {
      id: firstTask.id,
      name: firstTask.name,
      assignedTo: firstTask.assignedTo,
      assignedToNames: firstTask.assignedToNames,
    });
    
    // Verify assignedToNames is set correctly
    expect(firstTask.assignedToNames).toBeDefined();
    expect(firstTask.assignedToNames).not.toBe("Unbekannt");
    expect(firstTask.assignedToNames).not.toBe("");
    expect(firstTask.assignedToNames).not.toBeNull();
    
    // Should contain actual names (not just IDs)
    expect(typeof firstTask.assignedToNames).toBe("string");
    expect(firstTask.assignedToNames!.length).toBeGreaterThan(0);
    
    console.log("✓ assignedToNames correctly resolved to:", firstTask.assignedToNames);
  });
  
  it("should handle tasks without assignees", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    
    const [result] = await db.execute(
      sql`SELECT householdId FROM tasks LIMIT 1`
    );
    
    const rows = result as any[];
    if (rows.length === 0) {
      console.log("No tasks in database - skipping test");
      return;
    }
    
    const householdId = rows[0].householdId;
    const tasks = await getTasks(householdId);
    
    const tasksWithoutAssignees = tasks.filter(t => !t.assignedTo || !Array.isArray(t.assignedTo) || t.assignedTo.length === 0);
    
    if (tasksWithoutAssignees.length > 0) {
      const firstTask = tasksWithoutAssignees[0];
      
      console.log("Task without assignees:", {
        id: firstTask.id,
        name: firstTask.name,
        assignedTo: firstTask.assignedTo,
        assignedToNames: firstTask.assignedToNames,
      });
      
      // Should be null for tasks without assignees
      expect(firstTask.assignedToNames).toBeNull();
    }
  });
});
