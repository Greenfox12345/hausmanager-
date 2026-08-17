import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb, createActivityLog, getHouseholdById, dateToWallClockString } from "../db";
import {
  projectCreated,
  projectUpdated,
  projectDeleted,
  projectArchived,
  projectUnarchived,
  projectStatusChanged,
} from "../activityTexts";
import { projects, projectHouseholds, tasks, taskDependencies, householdMembers } from "../../drizzle/schema";
import { eq, and, inArray, desc, asc } from "drizzle-orm";
import { wouldCreatePrerequisiteCycle, type TaskDependencyEdge } from "../../shared/taskDependencies";
import { resolveProjectVariableQuantity } from "../../shared/projectVariableQuantity";
import {
  planTemplates,
  planTemplateShoppingItems,
  planTemplateTaskItems,
  shoppingItems,
  projectsExtended,
  type PlanPhase,
  type PlanVariable,
  type ProjectPlanShoppingItem,
  type ProjectPlanTaskItem,
} from "../../drizzle/schema";

/** Resolve the member name for a given memberId (householdMembers.id). */
async function getMemberName(memberId: number): Promise<string> {
  const db = await getDb();
  if (!db) return "Unknown";
  const [m] = await db
    .select({ memberName: householdMembers.memberName })
    .from(householdMembers)
    .where(eq(householdMembers.id, memberId))
    .limit(1);
  return m?.memberName ?? "Unknown";
}

async function validateDependencyGraph(
  db: any,
  householdId: number,
  currentTaskId: number,
  prerequisites: number[] = [],
  followups: number[] = [],
  replaceExisting: boolean = false,
): Promise<{ prerequisites: number[]; followups: number[] }> {
  const normalizedPrerequisites = Array.from(new Set(prerequisites));
  const normalizedFollowups = Array.from(new Set(followups));
  const referencedIds = Array.from(new Set([currentTaskId, ...normalizedPrerequisites, ...normalizedFollowups]));

  if (normalizedPrerequisites.includes(currentTaskId) || normalizedFollowups.includes(currentTaskId)) {
    throw new Error("Eine Aufgabe kann nicht von sich selbst abhängen.");
  }

  const referencedTasks = await db.select({ id: tasks.id, householdId: tasks.householdId })
    .from(tasks)
    .where(inArray(tasks.id, referencedIds));
  if (referencedTasks.length !== referencedIds.length || referencedTasks.some((task: { householdId: number }) => task.householdId !== householdId)) {
    throw new Error("Alle verknüpften Aufgaben müssen zum selben Haushalt gehören.");
  }

  const householdTaskIds = (await db.select({ id: tasks.id }).from(tasks).where(eq(tasks.householdId, householdId)))
    .map((task: { id: number }) => task.id);
  const existingDependencies: TaskDependencyEdge[] = householdTaskIds.length > 0
    ? await db.select({
      taskId: taskDependencies.taskId,
      dependsOnTaskId: taskDependencies.dependsOnTaskId,
      dependencyType: taskDependencies.dependencyType,
    }).from(taskDependencies).where(inArray(taskDependencies.taskId, householdTaskIds))
    : [];

  // Beim Ersetzen werden die Beziehungen der aktuell bearbeiteten Aufgabe
  // neu erstellt. Beim Ergänzen bleiben sie Teil der Zyklusprüfung.
  const graph = replaceExisting
    ? existingDependencies.filter(
      (dependency) => dependency.taskId !== currentTaskId && dependency.dependsOnTaskId !== currentTaskId,
    )
    : [...existingDependencies];
  for (const prerequisiteId of normalizedPrerequisites) {
    if (wouldCreatePrerequisiteCycle(currentTaskId, prerequisiteId, graph)) {
      throw new Error("Diese Voraussetzung würde einen zyklischen Aufgabenablauf erzeugen.");
    }
    graph.push({ taskId: currentTaskId, dependsOnTaskId: prerequisiteId, dependencyType: "prerequisite" });
  }
  for (const followupId of normalizedFollowups) {
    if (wouldCreatePrerequisiteCycle(followupId, currentTaskId, graph)) {
      throw new Error("Diese Folgeaufgabe würde einen zyklischen Aufgabenablauf erzeugen.");
    }
    graph.push({ taskId: followupId, dependsOnTaskId: currentTaskId, dependencyType: "prerequisite" });
  }

  return { prerequisites: normalizedPrerequisites, followups: normalizedFollowups };
}

async function insertDependencyIfMissing(
  db: any,
  taskId: number,
  dependsOnTaskId: number,
  dependencyType: "prerequisite" | "followup",
) {
  const [existing] = await db.select({ id: taskDependencies.id })
    .from(taskDependencies)
    .where(and(
      eq(taskDependencies.taskId, taskId),
      eq(taskDependencies.dependsOnTaskId, dependsOnTaskId),
      eq(taskDependencies.dependencyType, dependencyType),
    ))
    .limit(1);
  if (!existing) {
    await db.insert(taskDependencies).values({ taskId, dependsOnTaskId, dependencyType });
  }
}

async function insertBidirectionalDependencies(
  db: any,
  currentTaskId: number,
  prerequisites: number[],
  followups: number[],
) {
  for (const prerequisiteId of prerequisites) {
    await insertDependencyIfMissing(db, currentTaskId, prerequisiteId, "prerequisite");
    await insertDependencyIfMissing(db, prerequisiteId, currentTaskId, "followup");
  }
  for (const followupId of followups) {
    await insertDependencyIfMissing(db, currentTaskId, followupId, "followup");
    await insertDependencyIfMissing(db, followupId, currentTaskId, "prerequisite");
  }
}

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

      // Activity log
      const household = await getHouseholdById(input.householdId);
      const lang = ((household?.language || "de") as "de" | "en" | "es" | "fr" | "zh" | "tr" | "ar");
      const memberName = await getMemberName(input.memberId);
      await createActivityLog({
        householdId: input.householdId,
        memberId: input.memberId,
        activityType: "project",
        action: "projectCreated",
        description: projectCreated(lang, input.name, memberName, input.description),
        relatedItemId: projectId,
        metadata: { project: { name: input.name, description: input.description ?? null, status: "planned" } },
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
          projectIds: tasks.projectIds,
        })
        .from(tasks)
        .where(eq(tasks.householdId, input.householdId))
        .orderBy(desc(tasks.createdAt));

      // Convert Date objects to wall-clock strings to prevent Superjson UTC shift
      return taskList.map(t => ({
        ...t,
        dueDate: t.dueDate ? dateToWallClockString(t.dueDate) : null,
      }));
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
      const dependencies = await validateDependencyGraph(
        db, input.householdId, input.taskId, input.prerequisites, input.followups,
      );
      await insertBidirectionalDependencies(
        db, input.taskId, dependencies.prerequisites, dependencies.followups,
      );
      return { success: true };
    }),

  // Update task dependencies (replaces all existing dependencies)
  updateDependencies: protectedProcedure
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

      const dependencies = await validateDependencyGraph(
        db, input.householdId, input.taskId, input.prerequisites, input.followups, true,
      );

      // Delete all existing dependencies for this task (both direct and mirrored)
      await db.delete(taskDependencies).where(eq(taskDependencies.taskId, input.taskId));
      
      // Also delete mirrored dependencies where this task is the target
      await db.delete(taskDependencies).where(eq(taskDependencies.dependsOnTaskId, input.taskId));

      await insertBidirectionalDependencies(
        db, input.taskId, dependencies.prerequisites, dependencies.followups,
      );
      return { success: true };
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
        householdId: z.number(),
        memberId: z.number(),
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

      // Fetch existing project to detect changes
      const [existing] = await db.select().from(projects).where(eq(projects.id, input.id)).limit(1);

      const { id, householdId, memberId, ...updateData } = input;
      
      // Convert date strings to Date objects if provided
      const processedData: Record<string, unknown> = { ...updateData };
      if (updateData.startDate) {
        processedData.startDate = new Date(updateData.startDate);
      }
      if (updateData.endDate) {
        processedData.endDate = new Date(updateData.endDate);
      }

      await db.update(projects).set(processedData).where(eq(projects.id, id));

      // Build change summary
      const changeParts: string[] = [];
      if (updateData.name && existing && updateData.name !== existing.name) {
        changeParts.push(`Name: „${existing.name}" → „${updateData.name}"`);
      }
      if (updateData.status && existing && updateData.status !== existing.status) {
        changeParts.push(`Status: ${existing.status} → ${updateData.status}`);
      }
      if (updateData.description !== undefined && existing && updateData.description !== existing.description) {
        changeParts.push(`Beschreibung geändert`);
      }

      // Activity log
      const household = await getHouseholdById(householdId);
      const lang = ((household?.language || "de") as "de" | "en" | "es" | "fr" | "zh" | "tr" | "ar");
      const memberName = await getMemberName(memberId);
      const projectName = updateData.name ?? existing?.name ?? `#${id}`;

      // If only status changed, use dedicated status-change log
      if (updateData.status && changeParts.length === 1 && changeParts[0].startsWith("Status:")) {
        await createActivityLog({
          householdId,
          memberId,
          activityType: "project",
          action: "projectStatusChanged",
          description: projectStatusChanged(lang, projectName, memberName, updateData.status),
          relatedItemId: id,
          metadata: { project: { name: projectName, status: updateData.status, previousStatus: existing?.status ?? null } },
        });
      } else {
        await createActivityLog({
          householdId,
          memberId,
          activityType: "project",
          action: "projectUpdated",
          description: projectUpdated(lang, projectName, memberName, changeParts.length > 0 ? changeParts.join(", ") : undefined),
          relatedItemId: id,
          metadata: { project: { name: projectName, description: updateData.description ?? existing?.description ?? null, changes: changeParts } },
        });
      }

      return { success: true };
    }),

  // Delete project
  delete: protectedProcedure
    .input(z.object({ id: z.number(), householdId: z.number(), memberId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Fetch project name before deletion
      const [project] = await db.select().from(projects).where(eq(projects.id, input.id)).limit(1);
      const projectName = project?.name ?? `#${input.id}`;

      // Delete project households first (foreign key constraint)
      await db.delete(projectHouseholds).where(eq(projectHouseholds.projectId, input.id));

      // Delete project
      await db.delete(projects).where(eq(projects.id, input.id));

      // Activity log
      const household = await getHouseholdById(input.householdId);
      const lang = ((household?.language || "de") as "de" | "en" | "es" | "fr" | "zh" | "tr" | "ar");
      const memberName = await getMemberName(input.memberId);
      await createActivityLog({
        householdId: input.householdId,
        memberId: input.memberId,
        activityType: "project",
        action: "projectDeleted",
        description: projectDeleted(lang, projectName, memberName),
      });

      return { success: true };
    }),

  // Archive project
  archive: protectedProcedure
    .input(z.object({ id: z.number(), householdId: z.number(), memberId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await db.update(projects).set({ isArchived: true }).where(eq(projects.id, input.id));

      // Activity log
      const [project] = await db.select().from(projects).where(eq(projects.id, input.id)).limit(1);
      const household = await getHouseholdById(input.householdId);
      const lang = ((household?.language || "de") as "de" | "en" | "es" | "fr" | "zh" | "tr" | "ar");
      const memberName = await getMemberName(input.memberId);
      await createActivityLog({
        householdId: input.householdId,
        memberId: input.memberId,
        activityType: "project",
        action: "projectArchived",
        description: projectArchived(lang, project?.name ?? `#${input.id}`, memberName),
        relatedItemId: input.id,
      });

      return { success: true };
    }),

  // Unarchive project
  unarchive: protectedProcedure
    .input(z.object({ id: z.number(), householdId: z.number(), memberId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await db.update(projects).set({ isArchived: false }).where(eq(projects.id, input.id));

      // Activity log
      const [project] = await db.select().from(projects).where(eq(projects.id, input.id)).limit(1);
      const household = await getHouseholdById(input.householdId);
      const lang = ((household?.language || "de") as "de" | "en" | "es" | "fr" | "zh" | "tr" | "ar");
      const memberName = await getMemberName(input.memberId);
      await createActivityLog({
        householdId: input.householdId,
        memberId: input.memberId,
        activityType: "project",
        action: "projectUnarchived",
        description: projectUnarchived(lang, project?.name ?? `#${input.id}`, memberName),
        relatedItemId: input.id,
      });

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

      const prerequisites = input.dependencies
        .filter((dependency) => dependency.type === "prerequisite")
        .map((dependency) => dependency.taskId);
      const followups = input.dependencies
        .filter((dependency) => dependency.type === "followup")
        .map((dependency) => dependency.taskId);
      const dependencies = await validateDependencyGraph(
        db, input.householdId, input.currentTaskId, prerequisites, followups,
      );
      await insertBidirectionalDependencies(
        db, input.currentTaskId, dependencies.prerequisites, dependencies.followups,
      );

      return { success: true };
    }),
});
// ─── Plan-Integration ──────────────────────────────────────────────────────────
// Diese Prozeduren werden dem projectsRouter nachträglich hinzugefügt.
// Da TypeScript keine direkte Erweiterung von router()-Objekten erlaubt,
// exportieren wir einen separaten planProjectsRouter.

/**
 * Löst einen VAR-String in eine Dezimalzahl auf.
 * Wenn der Wert ein VAR-Name ist (z.B. "VARGitterLänge"), wird der Wert
 * aus der Variablen-Map geholt und als Dezimalzahl zurückgegeben.
 * Wenn der Wert bereits eine Zahl ist, wird sie direkt zurückgegeben.
 * Wenn nicht auflösbar, wird null zurückgegeben.
 */
/** Ersetzt alle VARName-Tokens in einem Text durch berechnete Werte */
function resolveVarText(
  text: string | null | undefined,
  _variables: PlanVariable[]
): string | null {
  return text ?? null;
}

function resolveVarQuantity(
  quantity: string | null | undefined,
  variables: PlanVariable[]
): string | null {
  return resolveProjectVariableQuantity(quantity, variables);
}

export const planProjectsRouter = router({
  /** Projekt aus einer Plankiste-Vorlage erstellen */
  createFromTemplate: protectedProcedure
    .input(z.object({
      householdId: z.number(),
      memberId: z.number(),
      templateId: z.number(),
      name: z.string().optional(),
      description: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = (await getDb())!;
      const [template] = await db.select().from(planTemplates).where(eq(planTemplates.id, input.templateId));
      if (!template) throw new Error("Vorlage nicht gefunden");
      const shoppingItemRows = await db.select().from(planTemplateShoppingItems)
        .where(eq(planTemplateShoppingItems.templateId, input.templateId))
        .orderBy(asc(planTemplateShoppingItems.sortOrder));
      const taskItemRows = await db.select().from(planTemplateTaskItems)
        .where(eq(planTemplateTaskItems.templateId, input.templateId))
        .orderBy(asc(planTemplateTaskItems.sortOrder));
      const [result] = await db.insert(projectsExtended).values({
        name: input.name ?? template.name,
        description: input.description ?? template.description ?? undefined,
        status: "planning",
        isNeighborhoodProject: false,
        createdBy: input.memberId,
        planTemplateId: input.templateId,
        planPhases: (template.phases ?? []) as PlanPhase[],
        planVariables: (template.variables ?? []) as PlanVariable[],
        enableVariables: template.enableVariables,
        planShoppingItems: shoppingItemRows.map((item, idx) => ({
          id: item.id,
          name: item.name,
          quantity: item.quantity ?? undefined,
          unitId: item.unitId ?? undefined,
          categoryId: item.categoryId ?? undefined,
          notes: item.notes ?? undefined,
          phaseId: (item as any).phaseId ?? undefined,
          sortOrder: item.sortOrder ?? idx,
        })) as ProjectPlanShoppingItem[],
        planTaskItems: taskItemRows.map((item, idx) => ({
          id: item.id,
          name: item.name,
          description: item.description ?? undefined,
          phaseId: item.phaseId ?? undefined,
          sortOrder: item.sortOrder ?? idx,
          repeatType: item.frequency ?? undefined,
          repeatInterval: item.repeatInterval ?? undefined,
          repeatUnit: item.repeatUnit ?? undefined,
          daysOffset: item.dueDaysFromStart ?? undefined,
          prerequisites: (item.prerequisiteItemIds ?? []).map((p: any) => typeof p === "object" ? p.id : p),
          followups: (item.followupItemIds ?? []).map((f: any) => typeof f === "object" ? f.id : f),
        })) as ProjectPlanTaskItem[],
      });
      const projectId = Number(result.insertId);
      await db.insert(projectHouseholds).values({ projectId, householdId: input.householdId });
      const household = await getHouseholdById(input.householdId);
      const lang = ((household?.language || "de") as "de" | "en" | "es" | "fr" | "zh" | "tr" | "ar");
      const memberName = await getMemberName(input.memberId);
      await createActivityLog({
        householdId: input.householdId,
        memberId: input.memberId,
        activityType: "project",
        action: "projectCreated",
        description: projectCreated(lang, template.name, memberName),
        relatedItemId: projectId,
      });
      return { projectId };
    }),

  /** Plan-Daten eines Projekts aktualisieren (Variablen, Phasen, Items) */
  updatePlanData: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      planPhases: z.any().optional(),
      planVariables: z.any().optional(),
      planShoppingItems: z.any().optional(),
      planTaskItems: z.any().optional(),
      enableVariables: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = (await getDb())!;
      const updateData: Record<string, any> = {};
      if (input.planPhases !== undefined) updateData.planPhases = input.planPhases;
      if (input.planVariables !== undefined) updateData.planVariables = input.planVariables;
      if (input.planShoppingItems !== undefined) updateData.planShoppingItems = input.planShoppingItems;
      if (input.planTaskItems !== undefined) updateData.planTaskItems = input.planTaskItems;
      if (input.enableVariables !== undefined) updateData.enableVariables = input.enableVariables;
      await db.update(projectsExtended).set(updateData).where(eq(projectsExtended.id, input.projectId));
      return { success: true };
    }),

  /** Projekt starten: Aufgaben und Einkäufe aus dem Plan übertragen */
  /** Projekt starten: Aufgaben und Einkäufe aus dem Plan übertragen */
  startProject: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      householdId: z.number(),
      memberId: z.number(),
      startDate: z.string().optional(),
      phasesToStart: z.array(z.string()).optional(),
      variableValues: z.record(z.string(), z.string()).optional(),
    }))
    .mutation(async ({ input }) => {
      const db = (await getDb())!;
      const [project] = await db.select().from(projectsExtended).where(eq(projectsExtended.id, input.projectId));
      if (!project) throw new Error("Projekt nicht gefunden");
      const startDate = input.startDate ? new Date(input.startDate) : new Date();
      const variables = (project.planVariables ?? []) as PlanVariable[];
      let updatedVariables = variables;
      if (input.variableValues && Object.keys(input.variableValues).length > 0) {
        updatedVariables = variables.map(v => {
          const newVal = input.variableValues![v.name];
          return newVal !== undefined ? { ...v, value: newVal } as PlanVariable : v;
        }) as PlanVariable[];
        await db.update(projectsExtended).set({ planVariables: updatedVariables as PlanVariable[] }).where(eq(projectsExtended.id, input.projectId));
      }
      const phases = (project.planPhases ?? []) as Array<{ id: string; name: string; color: string; order: number; status?: string }>;
      const phasesToStart = input.phasesToStart ?? null;
      const updatedPhases = phases.map(ph => ({
        ...ph,
        status: ((phasesToStart === null || phasesToStart.includes(ph.id)) ? "active" : (ph.status ?? "pending")) as "active" | "completed" | "pending",
      }));
      if (phases.length > 0) {
        await db.update(projectsExtended).set({ planPhases: updatedPhases as any }).where(eq(projectsExtended.id, input.projectId));
      }
      const taskItemsList = (project.planTaskItems ?? []) as ProjectPlanTaskItem[];
      const shoppingItemsList = (project.planShoppingItems ?? []) as ProjectPlanShoppingItem[];
      const createdTaskIds: number[] = [];
      const createdShoppingIds: number[] = [];
      for (const item of taskItemsList) {
        const phaseId = (item as any).phaseId;
        if (phasesToStart !== null && phaseId && !phasesToStart.includes(phaseId)) continue;
        // Übertragung beim initialen Projektstart
        let dueDate: Date | undefined;
        if (item.daysOffset != null) {
          dueDate = new Date(startDate);
          dueDate.setDate(dueDate.getDate() + item.daysOffset);
        }
        const [res] = await db.insert(tasks).values({
          householdId: input.householdId,
          name: resolveVarText(item.name, updatedVariables) ?? item.name,
          description: resolveVarText(item.description, updatedVariables),
          assignedTo: [],
          frequency: (item.repeatType as any) ?? "once",
          repeatInterval: item.repeatInterval ?? null,
          repeatUnit: (item.repeatUnit as any) ?? null,
          durationDays: 0,
          durationMinutes: 0,
          enableRotation: false,
          dueDate: dueDate,
          isCompleted: false,
          createdBy: input.memberId,
          projectIds: [input.projectId],
        });
        createdTaskIds.push(Number(res.insertId));
      }
      for (const item of shoppingItemsList) {
        const phaseId = (item as any).phaseId;
        if (phasesToStart !== null && phaseId && !phasesToStart.includes(phaseId)) continue;
        const [res] = await db.insert(shoppingItems).values({
          householdId: input.householdId,
          name: item.name,
          categoryId: item.categoryId ?? null,
          quantity: resolveVarQuantity(item.quantity, updatedVariables),
          unitId: item.unitId ?? null,
          notes: item.notes ?? null,
          addedBy: input.memberId,
          isCompleted: false,
        });
        createdShoppingIds.push(Number(res.insertId));
      }
      if (createdShoppingIds.length > 0) {
        await db.update(shoppingItems).set({ projectId: input.projectId }).where(inArray(shoppingItems.id, createdShoppingIds));
      }
      await db.update(projectsExtended).set({ status: "active", startDate: startDate }).where(eq(projectsExtended.id, input.projectId));
      const household = await getHouseholdById(input.householdId);
      const lang = ((household?.language || "de") as "de" | "en" | "es" | "fr" | "zh" | "tr" | "ar");
      const memberName = await getMemberName(input.memberId);
      await createActivityLog({
        householdId: input.householdId,
        memberId: input.memberId,
        activityType: "project",
        action: "projectStatusChanged",
        description: projectStatusChanged(lang, project.name, "active", memberName),
        relatedItemId: input.projectId,
      });
      return { createdTaskIds, createdShoppingIds };
    }),

  /** Weitere Phase eines laufenden Projekts starten */
  startPhase: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      householdId: z.number(),
      memberId: z.number(),
      phaseId: z.string(),
      startDate: z.string().optional(),
      variableValues: z.record(z.string(), z.string()).optional(),
    }))
    .mutation(async ({ input }) => {
      const db = (await getDb())!;
      const [project] = await db.select().from(projectsExtended).where(eq(projectsExtended.id, input.projectId));
      if (!project) throw new Error("Projekt nicht gefunden");
      const startDate = input.startDate ? new Date(input.startDate) : new Date();
      const variables = (project.planVariables ?? []) as PlanVariable[];
      let updatedVariables = variables;
      if (input.variableValues && Object.keys(input.variableValues).length > 0) {
        updatedVariables = variables.map(v => {
          const newVal = input.variableValues![v.name];
          return newVal !== undefined ? { ...v, value: newVal } as PlanVariable : v;
        }) as PlanVariable[];
        await db.update(projectsExtended).set({ planVariables: updatedVariables as PlanVariable[] }).where(eq(projectsExtended.id, input.projectId));
      }
      const phases = (project.planPhases ?? []) as Array<{ id: string; name: string; color: string; order: number; status?: string }>;
      const updatedPhases = phases.map(ph => ph.id === input.phaseId ? { ...ph, status: "active" as const } : ph);
      await db.update(projectsExtended).set({ planPhases: updatedPhases as any }).where(eq(projectsExtended.id, input.projectId));
      const taskItemsList = (project.planTaskItems ?? []) as ProjectPlanTaskItem[];
      const shoppingItemsList = (project.planShoppingItems ?? []) as ProjectPlanShoppingItem[];
      const createdTaskIds: number[] = [];
      const createdShoppingIds: number[] = [];
      for (const item of taskItemsList) {
        if ((item as any).phaseId !== input.phaseId) continue;
        // Übertragung beim späteren Phasenstart
        let dueDate: Date | undefined;
        if (item.daysOffset != null) {
          dueDate = new Date(startDate);
          dueDate.setDate(dueDate.getDate() + item.daysOffset);
        }
        const [res] = await db.insert(tasks).values({
          householdId: input.householdId,
          name: resolveVarText(item.name, updatedVariables) ?? item.name,
          description: resolveVarText(item.description, updatedVariables),
          assignedTo: [],
          frequency: (item.repeatType as any) ?? "once",
          repeatInterval: item.repeatInterval ?? null,
          repeatUnit: (item.repeatUnit as any) ?? null,
          durationDays: 0,
          durationMinutes: 0,
          enableRotation: false,
          dueDate: dueDate,
          isCompleted: false,
          createdBy: input.memberId,
          projectIds: [input.projectId],
        });
        createdTaskIds.push(Number(res.insertId));
      }
      for (const item of shoppingItemsList) {
        if ((item as any).phaseId !== input.phaseId) continue;
        const [res] = await db.insert(shoppingItems).values({
          householdId: input.householdId,
          name: item.name,
          categoryId: item.categoryId ?? null,
          quantity: resolveVarQuantity(item.quantity, updatedVariables),
          unitId: item.unitId ?? null,
          notes: item.notes ?? null,
          addedBy: input.memberId,
          isCompleted: false,
        });
        createdShoppingIds.push(Number(res.insertId));
      }
      if (createdShoppingIds.length > 0) {
        await db.update(shoppingItems).set({ projectId: input.projectId }).where(inArray(shoppingItems.id, createdShoppingIds));
      }
      return { createdTaskIds, createdShoppingIds };
    }),

  /** Eingabe-Variablen eines Projekts zurücksetzen (Werte löschen, Grenzen behalten) */
  resetInputVariables: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .mutation(async ({ input }) => {
      const db = (await getDb())!;
      const [project] = await db.select().from(projectsExtended).where(eq(projectsExtended.id, input.projectId));
      if (!project) throw new Error("Projekt nicht gefunden");
      const variables = (project.planVariables ?? []) as PlanVariable[];
      // Eingabe-Variablen: keine Definition aus anderen Variablen (kein VAR im value)
      const resetVars = variables.map(v => {
        const isInputVar = !v.value || !v.value.includes("VAR");
        if (isInputVar) {
          return { ...v, value: undefined }; // Wert löschen, min/max/locked bleiben
        }
        return v;
      });
      await db.update(projectsExtended).set({ planVariables: resetVars }).where(eq(projectsExtended.id, input.projectId));
      return { success: true, resetCount: resetVars.filter((v, i) => v.value === undefined && variables[i].value !== undefined).length };
    }),

  /** Erweitertes Projekt-Objekt mit Plan-Daten laden */
  getWithPlanData: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ input }) => {
      const db = (await getDb())!;
      const [project] = await db.select().from(projectsExtended).where(eq(projectsExtended.id, input.projectId));
      return project ?? null;
    }),

  /** Aktuelle Variablen mehrerer Projekte für reine Anzeigezwecke laden */
  getVariablesForProjects: protectedProcedure
    .input(z.object({ projectIds: z.array(z.number()).max(24) }))
    .query(async ({ input }) => {
      if (input.projectIds.length === 0) return {};
      const db = (await getDb())!;
      const rows = await db.select({ id: projectsExtended.id, variables: projectsExtended.planVariables })
        .from(projectsExtended)
        .where(inArray(projectsExtended.id, input.projectIds));
      return Object.fromEntries(rows.map((row) => [row.id, row.variables ?? []]));
    }),
});
