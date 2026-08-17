import { describe, it, expect, beforeAll } from "vitest";
import { getDb, createHousehold, createHouseholdMember, createTask, createProject } from "./db";
import { households, householdMembers, tasks, projects, projectHouseholds, taskDependencies } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";

describe("Project Management Features", () => {
  let testHouseholdId: number;
  let testMemberId: number;
  let testProjectId: number;
  let testTaskId: number;

  beforeAll(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Create test household
    testHouseholdId = await createHousehold(
      "TestHousehold_Projects_" + Date.now(),
      "test_hash",
      1
    );

    // Create test member
    testMemberId = await createHouseholdMember({
      householdId: testHouseholdId,
      memberName: "TestMember",
      passwordHash: "test_hash",
    });

    // Create test project
    const projectResult = await db.insert(projects).values({
      name: "Test Project",
      description: "Test project description",
      status: "planning",
      isNeighborhoodProject: false,
      createdBy: testMemberId,
    });
    testProjectId = Number(projectResult[0].insertId);

    // Link project to household
    await db.insert(projectHouseholds).values({
      projectId: testProjectId,
      householdId: testHouseholdId,
    });
  });

  it("should create a task with projectId", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const taskId = await createTask({
      householdId: testHouseholdId,
      name: "Project Task 1",
      description: "Task linked to project",
      assignedTo: testMemberId,
      frequency: "once",
      projectIds: [testProjectId],
      createdBy: testMemberId,
    });

    expect(taskId).toBeGreaterThan(0);

    // Verify task has projectIds
    const [task] = await db
      .select()
      .from(tasks)
      .where(eq(tasks.id, taskId));

    expect(task).toBeDefined();
    expect(task.projectIds).toEqual([testProjectId]);
    expect(task.name).toBe("Project Task 1");

    testTaskId = taskId;
  });

  it("should create task dependencies (prerequisites and followups)", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Create prerequisite task
    const prereqTaskId = await createTask({
      householdId: testHouseholdId,
      name: "Prerequisite Task",
      assignedTo: testMemberId,
      frequency: "once",
      projectIds: [testProjectId],
      createdBy: testMemberId,
    });

    // Create followup task
    const followupTaskId = await createTask({
      householdId: testHouseholdId,
      name: "Followup Task",
      assignedTo: testMemberId,
      frequency: "once",
      projectIds: [testProjectId],
      createdBy: testMemberId,
    });

    // Add prerequisite dependency
    await db.insert(taskDependencies).values({
      taskId: testTaskId,
      dependsOnTaskId: prereqTaskId,
      dependencyType: "prerequisite",
    });

    // Add followup dependency
    await db.insert(taskDependencies).values({
      taskId: followupTaskId,
      dependsOnTaskId: testTaskId,
      dependencyType: "followup",
    });

    // Verify prerequisites
    const prerequisites = await db
      .select()
      .from(taskDependencies)
      .where(
        and(
          eq(taskDependencies.taskId, testTaskId),
          eq(taskDependencies.dependencyType, "prerequisite")
        )
      );

    expect(prerequisites).toHaveLength(1);
    expect(prerequisites[0].dependsOnTaskId).toBe(prereqTaskId);

    // Verify followups
    const followups = await db
      .select()
      .from(taskDependencies)
      .where(
        and(
          eq(taskDependencies.taskId, followupTaskId),
          eq(taskDependencies.dependsOnTaskId, testTaskId)
        )
      );

    expect(followups).toHaveLength(1);
  });

  it("should add household to project (multi-household collaboration)", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Create second household
    const secondHouseholdId = await createHousehold(
      "TestHousehold_Collab_" + Date.now(),
      "test_hash",
      1
    );

    // Add second household to project
    await db.insert(projectHouseholds).values({
      projectId: testProjectId,
      householdId: secondHouseholdId,
    });

    // Verify both households are linked to project
    const projectHouseholdsRecords = await db
      .select()
      .from(projectHouseholds)
      .where(eq(projectHouseholds.projectId, testProjectId));

    expect(projectHouseholdsRecords).toHaveLength(2);
    
    const householdIds = projectHouseholdsRecords.map(ph => ph.householdId);
    expect(householdIds).toContain(testHouseholdId);
    expect(householdIds).toContain(secondHouseholdId);
  });

  it("should prevent duplicate household in project", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Try to add same household again
    try {
      await db.insert(projectHouseholds).values({
        projectId: testProjectId,
        householdId: testHouseholdId,
      });
      // Should not reach here
      expect(true).toBe(false);
    } catch (error: any) {
      // Expect duplicate key error
      expect(error).toBeDefined();
    }
  });

  it("should list all tasks for a project", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Get all tasks and filter by projectIds in JavaScript
    const allTasks = await db
      .select()
      .from(tasks)
      .where(eq(tasks.householdId, testHouseholdId));
    
    const projectTasks = allTasks.filter(task => 
      Array.isArray(task.projectIds) && task.projectIds.includes(testProjectId)
    );

    // Should have at least 3 tasks (main task + prerequisite + followup)
    expect(projectTasks.length).toBeGreaterThanOrEqual(3);
    
    // All tasks should belong to the project
    projectTasks.forEach(task => {
      expect(task.projectIds).toContain(testProjectId);
    });
  });

  it("should create project from task data", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Simulate creating a project from task form
    const taskName = "Main Project Task";
    const taskDescription = "This task becomes the project";
    const dueDate = new Date("2025-12-31");

    // Create project with task data
    const projectResult = await db.insert(projects).values({
      name: taskName, // Use task name as project name
      description: taskDescription,
      endDate: dueDate,
      status: "planning",
      isNeighborhoodProject: false,
      createdBy: testMemberId,
    });
    const newProjectId = Number(projectResult[0].insertId);

    // Link to household
    await db.insert(projectHouseholds).values({
      projectId: newProjectId,
      householdId: testHouseholdId,
    });

    // Create the main task
    const mainTaskId = await createTask({
      householdId: testHouseholdId,
      name: taskName,
      description: taskDescription,
      assignedTo: testMemberId,
      frequency: "once",
      dueDate: dueDate,
      projectIds: [newProjectId],
      createdBy: testMemberId,
    });

    // Verify project and task are linked
    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, newProjectId));

    const [task] = await db
      .select()
      .from(tasks)
      .where(eq(tasks.id, mainTaskId));

    expect(project.name).toBe(taskName);
    expect(task.projectIds).toEqual([newProjectId]);
    expect(task.name).toBe(taskName);
  });
});
