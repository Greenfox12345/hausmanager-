import { describe, it, expect, beforeAll } from "vitest";
import { createCaller } from "./_core/trpc";
import { createTestHousehold, createTestMember, cleanupTestData } from "./test-helpers";

describe("Shared Households Feature", () => {
  let household1Id: number;
  let household2Id: number;
  let member1Id: number;
  let member2Id: number;
  let taskId: number;

  beforeAll(async () => {
    // Create two test households
    household1Id = await createTestHousehold("Test Household 1");
    household2Id = await createTestHousehold("Test Household 2");
    
    // Create members in each household
    member1Id = await createTestMember(household1Id, "Member 1");
    member2Id = await createTestMember(household2Id, "Member 2");
  });

  it("should save sharedHouseholdIds when creating a task", async () => {
    const caller = createCaller({ user: null });

    // Create task with shared households
    const result = await caller.tasks.add({
      householdId: household1Id,
      memberId: member1Id,
      name: "Shared Task Test",
      description: "Testing shared households",
      sharedHouseholdIds: [household2Id],
      nonResponsiblePermission: "full",
    });

    taskId = result.id;

    // Verify task was created with sharedHouseholdIds
    const tasks = await caller.tasks.list({ householdId: household1Id });
    const createdTask = tasks.find(t => t.id === taskId);

    expect(createdTask).toBeDefined();
    expect(createdTask?.sharedHouseholdIds).toEqual([household2Id]);
  });

  it("should update sharedHouseholdIds when editing a task", async () => {
    const caller = createCaller({ user: null });

    // Update task to remove shared household
    await caller.tasks.update({
      taskId,
      householdId: household1Id,
      memberId: member1Id,
      sharedHouseholdIds: [], // Remove sharing
    });

    // Verify sharedHouseholdIds was updated
    const tasks = await caller.tasks.list({ householdId: household1Id });
    const updatedTask = tasks.find(t => t.id === taskId);

    expect(updatedTask?.sharedHouseholdIds).toEqual(null); // Empty array becomes null

    // Update again to add sharing back
    await caller.tasks.update({
      taskId,
      householdId: household1Id,
      memberId: member1Id,
      sharedHouseholdIds: [household2Id],
    });

    // Verify it was added back
    const tasksAfterReAdd = await caller.tasks.list({ householdId: household1Id });
    const reAddedTask = tasksAfterReAdd.find(t => t.id === taskId);

    expect(reAddedTask?.sharedHouseholdIds).toEqual([household2Id]);
  });

  it("should show task in both households when shared", async () => {
    const caller = createCaller({ user: null });

    // Task should appear in household 1 (owner)
    const household1Tasks = await caller.tasks.list({ householdId: household1Id });
    const taskInHousehold1 = household1Tasks.find(t => t.id === taskId);
    expect(taskInHousehold1).toBeDefined();
    expect(taskInHousehold1?.isSharedWithUs).toBe(false); // Owner household

    // Task should also appear in household 2 (shared with)
    const household2Tasks = await caller.tasks.list({ householdId: household2Id });
    const taskInHousehold2 = household2Tasks.find(t => t.id === taskId);
    expect(taskInHousehold2).toBeDefined();
    expect(taskInHousehold2?.isSharedWithUs).toBe(true); // Shared household
  });

  afterAll(async () => {
    await cleanupTestData();
  });
});
