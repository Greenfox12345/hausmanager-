import { describe, it, expect } from "vitest";
import { getTasks } from "./db";

describe("Assignee Names Resolution", () => {
  it("should return assignedToNames for tasks with assignees", async () => {
    // Get tasks from database
    const result = await getTasks(1); // householdId = 1
    
    console.log("Sample tasks:", JSON.stringify(result.slice(0, 3), null, 2));
    
    // Check that tasks have assignedToNames field
    const tasksWithAssignees = result.filter(t => t.assignedTo && t.assignedTo.length > 0);
    
    if (tasksWithAssignees.length === 0) {
      console.log("No tasks with assignees found");
      return;
    }
    
    const firstTask = tasksWithAssignees[0];
    console.log("First task with assignee:", {
      id: firstTask.id,
      name: firstTask.name,
      assignedTo: firstTask.assignedTo,
      assignedToNames: firstTask.assignedToNames,
    });
    
    // assignedToNames should not be "Unbekannt" if assignedTo has valid IDs
    expect(firstTask.assignedToNames).toBeDefined();
    expect(firstTask.assignedToNames).not.toBe("Unbekannt");
    expect(firstTask.assignedToNames).not.toBe("");
  });
  
  it("should handle tasks without assignees", async () => {
    const result = await getTasks(1);
    
    const tasksWithoutAssignees = result.filter(t => !t.assignedTo || t.assignedTo.length === 0);
    
    if (tasksWithoutAssignees.length === 0) {
      console.log("All tasks have assignees");
      return;
    }
    
    const firstTask = tasksWithoutAssignees[0];
    console.log("Task without assignee:", {
      id: firstTask.id,
      name: firstTask.name,
      assignedTo: firstTask.assignedTo,
      assignedToNames: firstTask.assignedToNames,
    });
    
    // Should return "Nicht zugewiesen" or similar
    expect(firstTask.assignedToNames).toBeDefined();
  });
});
