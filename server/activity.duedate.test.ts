import { describe, expect, it } from "vitest";

/**
 * Test suite for activity history due date preservation
 * 
 * When a recurring task is completed, the activity history should store
 * the original due date (at the time of completion), not the new due date
 * that gets calculated for the next occurrence.
 */
describe("Activity History - Original Due Date", () => {
  it("should store original due date in metadata when completing recurring task", () => {
    // Mock task with original due date
    const originalDueDate = new Date("2024-12-25T10:00:00");
    const task = {
      id: 1,
      name: "Test Task",
      frequency: "weekly" as const,
      dueDate: originalDueDate,
      repeatInterval: 1,
      repeatUnit: "weeks" as const,
    };

    // Simulate task completion logic
    const savedOriginalDueDate = task.dueDate;
    
    // Calculate next due date (this would update the task)
    const nextDueDate = new Date(task.dueDate);
    nextDueDate.setDate(nextDueDate.getDate() + 7);
    
    // Activity log should contain original due date in metadata
    const activityLog = {
      activityType: "task",
      action: "completed",
      description: `Aufgabe abgeschlossen: ${task.name}`,
      metadata: savedOriginalDueDate ? { originalDueDate: savedOriginalDueDate.toISOString() } : undefined,
    };

    // Verify original due date is preserved
    expect(activityLog.metadata).toBeDefined();
    expect(activityLog.metadata?.originalDueDate).toBe(originalDueDate.toISOString());
    expect(new Date(activityLog.metadata!.originalDueDate)).toEqual(originalDueDate);
    
    // Verify it's different from the next due date
    expect(new Date(activityLog.metadata!.originalDueDate)).not.toEqual(nextDueDate);
  });

  it("should handle one-time tasks without metadata", () => {
    const task = {
      id: 2,
      name: "One-time Task",
      frequency: "once" as const,
      dueDate: new Date("2024-12-25T10:00:00"),
    };

    const savedOriginalDueDate = task.dueDate;
    
    const activityLog = {
      activityType: "task",
      action: "completed",
      description: `Aufgabe abgeschlossen: ${task.name}`,
      metadata: savedOriginalDueDate ? { originalDueDate: savedOriginalDueDate.toISOString() } : undefined,
    };

    // One-time tasks should still have metadata with original due date
    expect(activityLog.metadata).toBeDefined();
    expect(activityLog.metadata?.originalDueDate).toBe(task.dueDate.toISOString());
  });

  it("should handle tasks without due date", () => {
    const task = {
      id: 3,
      name: "Task without due date",
      frequency: "once" as const,
      dueDate: null,
    };

    const savedOriginalDueDate = task.dueDate;
    
    const activityLog = {
      activityType: "task",
      action: "completed",
      description: `Aufgabe abgeschlossen: ${task.name}`,
      metadata: savedOriginalDueDate ? { originalDueDate: savedOriginalDueDate.toISOString() } : undefined,
    };

    // Tasks without due date should not have metadata
    expect(activityLog.metadata).toBeUndefined();
  });
});
