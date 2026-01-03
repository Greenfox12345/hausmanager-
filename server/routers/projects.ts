import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { projects, projectHouseholds, tasks, taskDependencies, householdMembers } from "../../drizzle/schema";
import { eq, and, inArray, desc } from "drizzle-orm";

export const projectsRouter = router({
  // List all projects accessible to the household
  list: protectedProcedure
    .input(z.object({ householdId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Get projects where household is a participant
      const projectHouseholdRecords = await db
        .select()
        .from(projectHouseholds)
        .where(eq(projectHouseholds.householdId, input.householdId));

      if (projectHouseholdRecords.length === 0) {
        return [];
      }

      const projectIds = projectHouseholdRecords.map((ph) => ph.projectId);
      const projectList = await db
        .select()
        .from(projects)
        .where(inArray(projects.id, projectIds))
        .orderBy(desc(projects.createdAt));

      return projectList;
    }),

  // Create a new project
  create: protectedProcedure
    .input(
      z.object({
        householdId: z.number(),
        memberId: z.number(),
        name: z.string().min(1),
        description: z.string().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        isNeighborhoodProject: z.boolean().default(false),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Create project
      const result = await db.insert(projects).values({
        name: input.name,
        description: input.description,
        startDate: input.startDate ? new Date(input.startDate) : undefined,
        endDate: input.endDate ? new Date(input.endDate) : undefined,
        status: "planning",
        isNeighborhoodProject: input.isNeighborhoodProject,
        createdBy: input.memberId,
      });

      const projectId = Number(result[0].insertId);

      // Add household to project
      await db.insert(projectHouseholds).values({
        projectId,
        householdId: input.householdId,
      });

      return { projectId };
    }),

  // Get all tasks (household tasks) accessible to the household for dependency selection
  getAvailableTasks: protectedProcedure
    .input(z.object({ householdId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const taskList = await db
        .select({
          id: tasks.id,
          name: tasks.name,
          dueDate: tasks.dueDate,
          projectId: tasks.projectId,
        })
        .from(tasks)
        .where(eq(tasks.householdId, input.householdId))
        .orderBy(desc(tasks.createdAt));

      return taskList;
    }),

  // Add task dependencies
  addDependencies: protectedProcedure
    .input(
      z.object({
        taskId: z.number(),
        householdId: z.number(),
        prerequisites: z.array(z.number()).optional(),
        followups: z.array(z.number()).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Validate task belongs to household
      const task = await db.select().from(tasks).where(eq(tasks.id, input.taskId)).limit(1);
      if (!task[0] || task[0].householdId !== input.householdId) {
        throw new Error("Unauthorized: Task does not belong to your household");
      }

      // Add prerequisites
      if (input.prerequisites && input.prerequisites.length > 0) {
        await db.insert(taskDependencies).values(
          input.prerequisites.map((depId) => ({
            taskId: input.taskId,
            dependsOnTaskId: depId,
            dependencyType: "prerequisite" as const,
          }))
        );
      }

      // Add followups (direct, not mirrored)
      if (input.followups && input.followups.length > 0) {
        await db.insert(taskDependencies).values(
          input.followups.map((depId) => ({
            taskId: input.taskId,
            dependsOnTaskId: depId,
            dependencyType: "followup" as const,
          }))
        );
      }

      // Automatically create bidirectional mirrors
      const mirroredDependencies: Array<{ taskId: number; taskName: string; type: string }> = [];
      
      // For each prerequisite, create reverse followup
      if (input.prerequisites && input.prerequisites.length > 0) {
        for (const depId of input.prerequisites) {
          await db.insert(taskDependencies).values({
            taskId: depId,
            dependsOnTaskId: input.taskId,
            dependencyType: "followup" as const,
          });
          const depTask = await db.select().from(tasks).where(eq(tasks.id, depId)).limit(1);
          if (depTask[0]) {
            mirroredDependencies.push({ taskId: depId, taskName: depTask[0].name, type: "prerequisite" });
          }
        }
      }
      
      // For each followup, create reverse prerequisite
      if (input.followups && input.followups.length > 0) {
        for (const depId of input.followups) {
          await db.insert(taskDependencies).values({
            taskId: depId,
            dependsOnTaskId: input.taskId,
            dependencyType: "prerequisite" as const,
          });
          const depTask = await db.select().from(tasks).where(eq(tasks.id, depId)).limit(1);
          if (depTask[0]) {
            mirroredDependencies.push({ taskId: depId, taskName: depTask[0].name, type: "followup" });
          }
        }
      }

      return { success: true, mirroredDependencies };
    }),

  // Get task dependencies
  getDependencies: protectedProcedure
    .input(z.object({ taskId: z.number(), householdId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Validate task belongs to household
      const task = await db.select().from(tasks).where(eq(tasks.id, input.taskId)).limit(1);
      if (!task[0] || task[0].householdId !== input.householdId) {
        throw new Error("Unauthorized: Task does not belong to your household");
      }

      const deps = await db
        .select()
        .from(taskDependencies)
        .where(eq(taskDependencies.taskId, input.taskId));

      return deps;
    }),

  // Get all task dependencies for household
  getAllDependencies: protectedProcedure
    .input(z.object({ householdId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Get all tasks for the household
      const householdTasks = await db
        .select({ id: tasks.id })
        .from(tasks)
        .where(eq(tasks.householdId, input.householdId));

      if (householdTasks.length === 0) {
        return [];
      }

      const taskIds = householdTasks.map((t) => t.id);

      // Get all dependencies for these tasks
      const deps = await db
        .select()
        .from(taskDependencies)
        .where(inArray(taskDependencies.taskId, taskIds));

      return deps;
    }),
  
  // Get dependencies for a specific task
  getTaskDependencies: protectedProcedure
    .input(z.object({ taskId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Get prerequisites (tasks that must be completed before this task)
      const prerequisiteDeps = await db
        .select({
          id: tasks.id,
          name: tasks.name,
        })
        .from(taskDependencies)
        .innerJoin(tasks, eq(taskDependencies.dependsOnTaskId, tasks.id))
        .where(
          and(
            eq(taskDependencies.taskId, input.taskId),
            eq(taskDependencies.dependencyType, "prerequisite")
          )
        );

      // Get followups (tasks that should follow this task)
      const followupDeps = await db
        .select({
          id: tasks.id,
          name: tasks.name,
        })
        .from(taskDependencies)
        .innerJoin(tasks, eq(taskDependencies.dependsOnTaskId, tasks.id))
        .where(
          and(
            eq(taskDependencies.taskId, input.taskId),
            eq(taskDependencies.dependencyType, "followup")
          )
        );

      return {
        prerequisites: prerequisiteDeps,
        followups: followupDeps,
      };
    }),

  // Add household to project (multi-household collaboration)
  addHouseholdToProject: protectedProcedure
    .input(
      z.object({
        projectId: z.number(),
        householdId: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Check if household is already part of the project
      const existing = await db
        .select()
        .from(projectHouseholds)
        .where(
          and(
            eq(projectHouseholds.projectId, input.projectId),
            eq(projectHouseholds.householdId, input.householdId)
          )
        );

      if (existing.length > 0) {
        throw new Error("Household is already part of this project");
      }

      // Add household to project
      await db.insert(projectHouseholds).values({
        projectId: input.projectId,
        householdId: input.householdId,
      });

      return { success: true };
    }),

  // Update project
  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(1).optional(),
        description: z.string().optional(),
        status: z.enum(["planning", "active", "completed", "cancelled"]).optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        isNeighborhoodProject: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const { id, ...updateData } = input;
      
      // Convert date strings to Date objects if provided
      const processedData: any = { ...updateData };
      if (updateData.startDate) {
        processedData.startDate = new Date(updateData.startDate);
      }
      if (updateData.endDate) {
        processedData.endDate = new Date(updateData.endDate);
      }

      await db.update(projects).set(processedData).where(eq(projects.id, id));

      return { success: true };
    }),

  // Delete project
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Delete project households first (foreign key constraint)
      await db.delete(projectHouseholds).where(eq(projectHouseholds.projectId, input.id));

      // Delete project
      await db.delete(projects).where(eq(projects.id, input.id));

      return { success: true };
    }),

  // Archive project
  archive: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await db.update(projects).set({ isArchived: true }).where(eq(projects.id, input.id));

      return { success: true };
    }),

  // Unarchive project
  unarchive: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await db.update(projects).set({ isArchived: false }).where(eq(projects.id, input.id));

      return { success: true };
    }),

  // Update bidirectional dependencies
  updateBidirectionalDependencies: protectedProcedure
    .input(
      z.object({
        householdId: z.number(),
        dependencies: z.array(
          z.object({
            taskId: z.number(),
            type: z.enum(["prerequisite", "followup"]),
          })
        ),
        currentTaskId: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Validate all tasks belong to household
      const allTaskIds = [input.currentTaskId, ...input.dependencies.map((d) => d.taskId)];
      const taskRecords = await db.select().from(tasks).where(inArray(tasks.id, allTaskIds));
      
      if (taskRecords.some((t) => t.householdId !== input.householdId)) {
        throw new Error("Unauthorized: Some tasks do not belong to your household");
      }

      // Add bidirectional dependencies
      for (const dep of input.dependencies) {
        if (dep.type === "prerequisite") {
          // Current task has dep.taskId as prerequisite
          // So dep.taskId should have current task as followup
          await db.insert(taskDependencies).values({
            taskId: dep.taskId,
            dependsOnTaskId: input.currentTaskId,
            dependencyType: "followup",
          });
        } else {
          // Current task has dep.taskId as followup
          // So dep.taskId should have current task as prerequisite
          await db.insert(taskDependencies).values({
            taskId: dep.taskId,
            dependsOnTaskId: input.currentTaskId,
            dependencyType: "prerequisite",
          });
        }
      }

      return { success: true };
    }),
});
