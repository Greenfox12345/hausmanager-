import { describe, it, expect } from "vitest";
import { createContext } from "./_core/context";
import { appRouter } from "./routers";

describe("Assignee Display via tRPC", () => {
  it("should return tasks with assignedToNames", async () => {
    // Create a mock context
    const ctx = await createContext({
      req: {
        headers: {},
        cookies: {},
      } as any,
      res: {} as any,
    });
    
    // Override with test household
    (ctx as any).household = { id: 1 };
    (ctx as any).member = { id: 1, memberId: 1 };
    
    const caller = appRouter.createCaller(ctx);
    
    // Call the list endpoint
    const result = await caller.tasks.list({ householdId: 1 });
    
    console.log("Total tasks:", result.length);
    
    const tasksWithAssignees = result.filter(t => t.assignedTo && t.assignedTo.length > 0);
    console.log("Tasks with assignees:", tasksWithAssignees.length);
    
    if (tasksWithAssignees.length > 0) {
      const first = tasksWithAssignees[0];
      console.log("First task:", {
        id: first.id,
        name: first.name,
        assignedTo: first.assignedTo,
        assignedToNames: (first as any).assignedToNames,
      });
      
      // Check that assignedToNames is set
      expect((first as any).assignedToNames).toBeDefined();
      expect((first as any).assignedToNames).not.toBe("Unbekannt");
    }
  });
});
