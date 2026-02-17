import { describe, it, expect } from "vitest";
import { getDb } from "./db";
import { tasks } from "../drizzle/schema";
import { eq, sql } from "drizzle-orm";

describe("Multiple Assignees", () => {
  it("should store assignedTo as JSON array", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Get a task from the database - select specific fields to avoid schema mismatch
    const allTasks = await db.select({
      id: tasks.id,
      assignedTo: tasks.assignedTo,
    }).from(tasks).limit(1);
    
    if (allTasks.length === 0) {
      console.log("No tasks in database to test");
      return;
    }

    const task = allTasks[0];
    
    // Check that assignedTo is either null or an array
    if (task.assignedTo !== null) {
      expect(Array.isArray(task.assignedTo)).toBe(true);
    }
  });

  it("should accept array in assignedTo field", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Try to update a task with multiple assignees
    const allTasks = await db.select({
      id: tasks.id,
      assignedTo: tasks.assignedTo,
    }).from(tasks).limit(1);
    
    if (allTasks.length === 0) {
      console.log("No tasks in database to test");
      return;
    }

    const task = allTasks[0];
    const testAssignees = [1, 2, 3];

    // Update task with array (use sql template)
    await db.execute(
      sql`UPDATE tasks SET assignedTo = ${JSON.stringify(testAssignees)} WHERE id = ${task.id}`
    );

    // Read back
    const updated = await db.select({
      id: tasks.id,
      assignedTo: tasks.assignedTo,
    })
      .from(tasks)
      .where(eq(tasks.id, task.id))
      .limit(1);

    expect(updated[0].assignedTo).toEqual(testAssignees);

    // Restore original value
    await db.update(tasks)
      .set({ assignedTo: task.assignedTo })
      .where(eq(tasks.id, task.id));
  });
});
