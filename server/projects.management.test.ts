import { describe, it, expect, beforeEach } from "vitest";
import { createHouseholdMember, createProject, getDb } from "./db";
import { projects, projectHouseholds, households, householdMembers } from "../drizzle/schema";
import { eq } from "drizzle-orm";

describe("Project Management", () => {
  let householdId: number;
  let memberId: number;
  let projectId: number;

  beforeEach(async () => {
    // Create test household and member
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const householdResult = await db.insert(households).values({
      name: `TestHousehold_ProjectMgmt_${Date.now()}`,
      passwordHash: "password123",
      createdBy: 1,
    });
    householdId = Number(householdResult[0].insertId);

    const memberResult = await db.insert(householdMembers).values({
      householdId,
      memberName: "Test Member",
      passwordHash: "member123",
      role: "admin",
    });
    memberId = Number(memberResult[0].insertId);

    // Create test project
    const projectResult = await db.insert(projects).values({
      name: "Test Project",
      description: "Test Description",
      createdBy: memberId,
      status: "planning",
    });
    projectId = Number(projectResult[0].insertId);

    // Add household to project
    await db.insert(projectHouseholds).values({
      projectId,
      householdId,
    });
  });

  it("should update project details", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Update project
    await db
      .update(projects)
      .set({
        name: "Updated Project Name",
        description: "Updated Description",
        status: "active",
      })
      .where(eq(projects.id, projectId));

    // Verify update
    const updatedProject = await db
      .select()
      .from(projects)
      .where(eq(projects.id, projectId));

    expect(updatedProject[0].name).toBe("Updated Project Name");
    expect(updatedProject[0].description).toBe("Updated Description");
    expect(updatedProject[0].status).toBe("active");
  });

  it("should delete project and associated project_households", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Verify project exists
    const projectBefore = await db
      .select()
      .from(projects)
      .where(eq(projects.id, projectId));
    expect(projectBefore.length).toBe(1);

    // Delete project households first
    await db.delete(projectHouseholds).where(eq(projectHouseholds.projectId, projectId));

    // Delete project
    await db.delete(projects).where(eq(projects.id, projectId));

    // Verify deletion
    const projectAfter = await db
      .select()
      .from(projects)
      .where(eq(projects.id, projectId));
    expect(projectAfter.length).toBe(0);
  });

  it("should change project status", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Change to active
    await db
      .update(projects)
      .set({ status: "active" })
      .where(eq(projects.id, projectId));

    let project = await db
      .select()
      .from(projects)
      .where(eq(projects.id, projectId));
    expect(project[0].status).toBe("active");

    // Change to completed
    await db
      .update(projects)
      .set({ status: "completed" })
      .where(eq(projects.id, projectId));

    project = await db
      .select()
      .from(projects)
      .where(eq(projects.id, projectId));
    expect(project[0].status).toBe("completed");

    // Change to cancelled
    await db
      .update(projects)
      .set({ status: "cancelled" })
      .where(eq(projects.id, projectId));

    project = await db
      .select()
      .from(projects)
      .where(eq(projects.id, projectId));
    expect(project[0].status).toBe("cancelled");
  });

  it("should update project dates", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const startDate = new Date("2025-01-01");
    const endDate = new Date("2025-12-31");

    await db
      .update(projects)
      .set({
        startDate,
        endDate,
      })
      .where(eq(projects.id, projectId));

    const project = await db
      .select()
      .from(projects)
      .where(eq(projects.id, projectId));

    expect(project[0].startDate).toEqual(startDate);
    expect(project[0].endDate).toEqual(endDate);
  });

  it("should list all projects for a household", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Create additional project
    const project2Result = await db.insert(projects).values({
      name: "Second Project",
      description: "Second Description",
      createdBy: memberId,
      status: "planning",
    });
    const project2Id = Number(project2Result[0].insertId);

    // Add household to project
    await db.insert(projectHouseholds).values({
      projectId: project2Id,
      householdId,
    });

    // Get project households
    const projectHouseholdRecords = await db
      .select()
      .from(projectHouseholds)
      .where(eq(projectHouseholds.householdId, householdId));

    expect(projectHouseholdRecords.length).toBeGreaterThanOrEqual(2);

    // Get all projects
    const projectIds = projectHouseholdRecords.map((ph) => ph.projectId);
    expect(projectIds).toContain(projectId);
    expect(projectIds).toContain(project2Id);
  });
});
