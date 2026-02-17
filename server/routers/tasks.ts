import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { publicProcedure, router } from "../_core/trpc";
import {
  getTasks,
  createTask,
  updateTask,
  deleteTask,
  createActivityLog,
  getHouseholdMembers,
  createTaskRotationExclusions,
  getDb,
  getHouseholdById,
  getAllHouseholds,
} from "../db";
import { notifyTaskAssigned, notifyTaskCompleted } from "../notificationHelpers";
import { taskRotationExclusions, activityHistory, projects } from "../../drizzle/schema";
import { inArray } from "drizzle-orm";

// ─── German label helpers ───────────────────────────────────────────────────

const frequencyLabels: Record<string, string> = {
  once: "Einmalig",
  daily: "Täglich",
  weekly: "Wöchentlich",
  monthly: "Monatlich",
  custom: "Benutzerdefiniert",
};

const repeatUnitLabels: Record<string, string> = {
  days: "Tage",
  weeks: "Wochen",
  months: "Monate",
};

const permissionLabels: Record<string, string> = {
  full: "Vollzugriff",
  milestones_reminders: "Meilensteine & Erinnerungen",
  view_only: "Nur Ansicht",
};

function formatDate(d: Date | string | null | undefined): string {
  if (!d) return "–";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function formatDateTime(d: Date | string | null | undefined): string {
  if (!d) return "–";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("de-DE", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

/**
 * Resolve member IDs to a comma-separated name string.
 * Returns "–" when the list is empty/null.
 */
function memberIdsToNames(
  ids: number[] | null | undefined,
  members: { id: number; memberName: string }[],
): string {
  if (!ids || !Array.isArray(ids) || ids.length === 0) return "–";
  const names = ids
    .map((id) => members.find((m) => m.id === id)?.memberName ?? `#${id}`)
    .join(", ");
  return names || "–";
}

/**
 * Resolve project IDs to a comma-separated name string.
 */
function projectIdsToNames(
  ids: number[] | null | undefined,
  projectList: { id: number; name: string }[],
): string {
  if (!ids || !Array.isArray(ids) || ids.length === 0) return "–";
  const names = ids
    .map((id) => projectList.find((p) => p.id === id)?.name ?? `#${id}`)
    .join(", ");
  return names || "–";
}

/**
 * Resolve household IDs to a comma-separated name string.
 */
function householdIdsToNames(
  ids: number[] | null | undefined,
  householdList: { id: number; name: string }[],
): string {
  if (!ids || !Array.isArray(ids) || ids.length === 0) return "–";
  const names = ids
    .map((id) => householdList.find((h) => h.id === id)?.name ?? `#${id}`)
    .join(", ");
  return names || "–";
}

// Normalise arrays for comparison (null / undefined / [] all become [])
function normaliseArr(v: any): number[] {
  if (!v) return [];
  if (Array.isArray(v)) return [...v].sort((a, b) => a - b);
  return [v];
}

function arraysEqual(a: number[], b: number[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((v, i) => v === b[i]);
}

/**
 * Build a German description of all field-level changes between old and new task values.
 * Returns an array of change description strings and a metadata object.
 */
async function buildUpdateChanges(
  currentTask: any,
  updates: Record<string, any>,
  dueDatetime: Date | undefined,
  householdId: number,
): Promise<{ changes: string[]; metadata: Record<string, any> }> {
  const changes: string[] = [];
  const metadata: Record<string, any> = { fieldChanges: {} };

  // Lazy-load lookup data only when needed
  let _members: { id: number; memberName: string }[] | null = null;
  let _projectList: { id: number; name: string }[] | null = null;
  let _householdList: { id: number; name: string }[] | null = null;

  async function getMembers() {
    if (!_members) {
      // Collect all household IDs we might need members from
      const allHhIds = new Set<number>();
      allHhIds.add(householdId);
      const sharedOld = normaliseArr(currentTask.sharedHouseholdIds);
      const sharedNew = normaliseArr(updates.sharedHouseholdIds);
      [...sharedOld, ...sharedNew].forEach((id) => allHhIds.add(id));
      if (currentTask.householdId) allHhIds.add(currentTask.householdId);

      const memberSets = await Promise.all(
        Array.from(allHhIds).map((hhId) => getHouseholdMembers(hhId)),
      );
      const memberMap = new Map<number, { id: number; memberName: string }>();
      memberSets.flat().forEach((m) => memberMap.set(m.id, { id: m.id, memberName: m.memberName }));
      _members = Array.from(memberMap.values());
    }
    return _members;
  }

  async function getProjectList() {
    if (!_projectList) {
      const db = await getDb();
      if (db) {
        const allProjects = await db.select({ id: projects.id, name: projects.name }).from(projects);
        _projectList = allProjects;
      } else {
        _projectList = [];
      }
    }
    return _projectList;
  }

  async function getHouseholdList() {
    if (!_householdList) {
      _householdList = (await getAllHouseholds()).map((h) => ({ id: h.id, name: h.name }));
    }
    return _householdList;
  }

  // ── Name ──
  if (updates.name !== undefined && updates.name !== currentTask.name) {
    changes.push(`Name geändert von '${currentTask.name}' zu '${updates.name}'`);
    metadata.fieldChanges.name = { old: currentTask.name, new: updates.name };
  }

  // ── Description ──
  if (updates.description !== undefined && updates.description !== (currentTask.description ?? "")) {
    const oldDesc = currentTask.description || "(leer)";
    const newDesc = updates.description || "(leer)";
    changes.push(`Beschreibung geändert von '${oldDesc}' zu '${newDesc}'`);
    metadata.fieldChanges.description = { old: currentTask.description, new: updates.description };
  }

  // ── Assigned To ──
  if (updates.assignedTo !== undefined) {
    const oldArr = normaliseArr(currentTask.assignedTo);
    const newArr = normaliseArr(updates.assignedTo);
    if (!arraysEqual(oldArr, newArr)) {
      const members = await getMembers();
      const oldNames = memberIdsToNames(oldArr.length > 0 ? oldArr : null, members);
      const newNames = memberIdsToNames(newArr.length > 0 ? newArr : null, members);
      changes.push(`Verantwortliche geändert von '${oldNames}' zu '${newNames}'`);
      metadata.fieldChanges.assignedTo = { old: oldArr, new: newArr, oldNames, newNames };
    }
  }

  // ── Due Date ──
  if (dueDatetime !== undefined) {
    const oldDate = currentTask.dueDate ? formatDateTime(currentTask.dueDate) : "–";
    const newDate = formatDateTime(dueDatetime);
    if (oldDate !== newDate) {
      changes.push(`Fälligkeitsdatum geändert von '${oldDate}' zu '${newDate}'`);
      metadata.fieldChanges.dueDate = {
        old: currentTask.dueDate?.toString(),
        new: dueDatetime.toISOString(),
      };
    }
  }

  // ── Frequency ──
  if (updates.frequency !== undefined && updates.frequency !== currentTask.frequency) {
    const oldLabel = frequencyLabels[currentTask.frequency] ?? currentTask.frequency;
    const newLabel = frequencyLabels[updates.frequency] ?? updates.frequency;
    changes.push(`Häufigkeit geändert von '${oldLabel}' zu '${newLabel}'`);
    metadata.fieldChanges.frequency = { old: currentTask.frequency, new: updates.frequency };
  }

  // ── Repeat Interval ──
  if (updates.repeatInterval !== undefined && updates.repeatInterval !== currentTask.repeatInterval) {
    const oldVal = currentTask.repeatInterval ?? "–";
    changes.push(`Wiederholungsintervall geändert von '${oldVal}' zu '${updates.repeatInterval}'`);
    metadata.fieldChanges.repeatInterval = { old: currentTask.repeatInterval, new: updates.repeatInterval };
  }

  // ── Repeat Unit ──
  if (updates.repeatUnit !== undefined && updates.repeatUnit !== currentTask.repeatUnit) {
    const oldLabel = currentTask.repeatUnit ? (repeatUnitLabels[currentTask.repeatUnit] ?? currentTask.repeatUnit) : "–";
    const newLabel = repeatUnitLabels[updates.repeatUnit] ?? updates.repeatUnit;
    changes.push(`Wiederholungseinheit geändert von '${oldLabel}' zu '${newLabel}'`);
    metadata.fieldChanges.repeatUnit = { old: currentTask.repeatUnit, new: updates.repeatUnit };
  }

  // ── Enable Rotation ──
  if (updates.enableRotation !== undefined && updates.enableRotation !== currentTask.enableRotation) {
    const oldVal = currentTask.enableRotation ? "Ja" : "Nein";
    const newVal = updates.enableRotation ? "Ja" : "Nein";
    changes.push(`Rotation geändert von '${oldVal}' zu '${newVal}'`);
    metadata.fieldChanges.enableRotation = { old: currentTask.enableRotation, new: updates.enableRotation };
  }

  // ── Required Persons ──
  if (updates.requiredPersons !== undefined && updates.requiredPersons !== currentTask.requiredPersons) {
    const oldVal = currentTask.requiredPersons ?? "–";
    changes.push(`Benötigte Personen geändert von '${oldVal}' zu '${updates.requiredPersons}'`);
    metadata.fieldChanges.requiredPersons = { old: currentTask.requiredPersons, new: updates.requiredPersons };
  }

  // ── Project IDs ──
  if (updates.projectIds !== undefined) {
    const oldArr = normaliseArr(currentTask.projectIds);
    const newArr = normaliseArr(updates.projectIds);
    if (!arraysEqual(oldArr, newArr)) {
      const projectList = await getProjectList();
      const oldNames = projectIdsToNames(oldArr.length > 0 ? oldArr : null, projectList);
      const newNames = projectIdsToNames(newArr.length > 0 ? newArr : null, projectList);
      changes.push(`Projekte geändert von '${oldNames}' zu '${newNames}'`);
      metadata.fieldChanges.projectIds = { old: oldArr, new: newArr, oldNames, newNames };
    }
  }

  // ── Shared Household IDs ──
  if (updates.sharedHouseholdIds !== undefined) {
    const oldArr = normaliseArr(currentTask.sharedHouseholdIds);
    const newArr = normaliseArr(updates.sharedHouseholdIds);
    if (!arraysEqual(oldArr, newArr)) {
      const householdList = await getHouseholdList();
      const oldNames = householdIdsToNames(oldArr.length > 0 ? oldArr : null, householdList);
      const newNames = householdIdsToNames(newArr.length > 0 ? newArr : null, householdList);
      changes.push(`Geteilte Haushalte geändert von '${oldNames}' zu '${newNames}'`);
      metadata.fieldChanges.sharedHouseholdIds = { old: oldArr, new: newArr, oldNames, newNames };
    }
  }

  // ── Non-Responsible Permission ──
  if (updates.nonResponsiblePermission !== undefined && updates.nonResponsiblePermission !== currentTask.nonResponsiblePermission) {
    const oldLabel = permissionLabels[currentTask.nonResponsiblePermission] ?? currentTask.nonResponsiblePermission;
    const newLabel = permissionLabels[updates.nonResponsiblePermission] ?? updates.nonResponsiblePermission;
    changes.push(`Berechtigung geändert von '${oldLabel}' zu '${newLabel}'`);
    metadata.fieldChanges.nonResponsiblePermission = { old: currentTask.nonResponsiblePermission, new: updates.nonResponsiblePermission };
  }

  return { changes, metadata };
}

// ─── Router ─────────────────────────────────────────────────────────────────

export const tasksRouter = router({
  // Get all tasks for a household
  list: publicProcedure
    .input(z.object({ householdId: z.number() }))
    .query(async ({ input }) => {
      return await getTasks(input.householdId);
    }),

  // Add new task
  add: publicProcedure
    .input(
      z.object({
        householdId: z.number(),
        memberId: z.number(),
        name: z.string().min(1),
        description: z.string().optional(),
        assignedTo: z.array(z.number()).optional(), // Array of member IDs
        frequency: z.enum(["once", "daily", "weekly", "monthly", "custom"]).default("once"),
        customFrequencyDays: z.number().optional(),
        repeatInterval: z.number().optional(),
        repeatUnit: z.enum(["days", "weeks", "months"]).optional(),
        enableRotation: z.boolean().default(false),
        requiredPersons: z.number().optional(),
        excludedMembers: z.array(z.number()).optional(),
        dueDate: z.string().optional(),
        dueTime: z.string().optional(),
        projectIds: z.array(z.number()).optional(),
        sharedHouseholdIds: z.array(z.number()).optional(),
        nonResponsiblePermission: z.enum(["full", "milestones_reminders", "view_only"]).default("full"),
      })
    )
    .mutation(async ({ input }) => {
      // Combine date and time if both provided
      let dueDatetime: Date | undefined;
      if (input.dueDate) {
        if (input.dueTime) {
          const [year, month, day] = input.dueDate.split('-').map(Number);
          const [hours, minutes] = input.dueTime.split(':').map(Number);
          dueDatetime = new Date(year, month - 1, day, hours, minutes);
        } else {
          dueDatetime = new Date(input.dueDate);
        }
      }

      const taskId = await createTask({
        householdId: input.householdId,
        name: input.name,
        description: input.description,
        assignedTo: input.assignedTo,
        frequency: input.frequency,
        customFrequencyDays: input.customFrequencyDays,
        repeatInterval: input.repeatInterval,
        repeatUnit: input.repeatUnit,
        enableRotation: input.enableRotation,
        requiredPersons: input.requiredPersons,
        dueDate: dueDatetime,
        projectIds: input.projectIds || [],
        nonResponsiblePermission: input.nonResponsiblePermission,
        createdBy: input.memberId,
      });

      // Save rotation exclusions if provided
      if (input.excludedMembers && input.excludedMembers.length > 0) {
        await createTaskRotationExclusions(taskId, input.excludedMembers);
      }

      // Build detailed creation description
      const details: string[] = [];
      details.push(`Aufgabe erstellt: '${input.name}'`);
      if (input.description) details.push(`Beschreibung: ${input.description}`);
      if (dueDatetime) details.push(`Fällig am: ${formatDateTime(dueDatetime)}`);
      details.push(`Häufigkeit: ${frequencyLabels[input.frequency] ?? input.frequency}`);
      if (input.repeatInterval && input.repeatUnit) {
        details.push(`Wiederholung: alle ${input.repeatInterval} ${repeatUnitLabels[input.repeatUnit] ?? input.repeatUnit}`);
      }
      if (input.enableRotation) details.push("Rotation aktiviert");

      // Resolve assignee names
      if (input.assignedTo && input.assignedTo.length > 0) {
        const members = await getHouseholdMembers(input.householdId);
        const names = memberIdsToNames(input.assignedTo, members);
        details.push(`Verantwortliche: ${names}`);
      }

      const creationMetadata: Record<string, any> = {
        name: input.name,
        description: input.description,
        frequency: input.frequency,
        repeatInterval: input.repeatInterval,
        repeatUnit: input.repeatUnit,
        enableRotation: input.enableRotation,
        assignedTo: input.assignedTo,
        dueDate: dueDatetime?.toISOString(),
      };

      await createActivityLog({
        householdId: input.householdId,
        memberId: input.memberId,
        activityType: "task",
        action: "created",
        description: details.join(" | "),
        relatedItemId: taskId,
        metadata: creationMetadata,
      });

      // Send notification if task is assigned to someone
      if (input.assignedTo && input.assignedTo.length > 0) {
        for (const assigneeId of input.assignedTo) {
          if (assigneeId !== input.memberId) {
            await notifyTaskAssigned(
              input.householdId,
              assigneeId,
              taskId,
              input.name
            );
          }
        }
      }

      // Update sharedHouseholdIds in the task itself
      if (input.sharedHouseholdIds && input.sharedHouseholdIds.length > 0) {
        const db = await getDb();
        if (db) {
          const { tasks } = await import("../../drizzle/schema");
          await db.update(tasks)
            .set({ sharedHouseholdIds: input.sharedHouseholdIds })
            .where(eq(tasks.id, taskId));
        }
      }

      return { id: taskId };
    }),

  // Update task
  update: publicProcedure
    .input(
      z.object({
        taskId: z.number(),
        householdId: z.number(),
        memberId: z.number(),
        name: z.string().optional(),
        description: z.string().optional(),
        assignedTo: z.array(z.number()).optional(),
        frequency: z.enum(["once", "daily", "weekly", "monthly", "custom"]).optional(),
        customFrequencyDays: z.number().optional(),
        repeatInterval: z.number().optional(),
        repeatUnit: z.enum(["days", "weeks", "months"]).optional(),
        enableRotation: z.boolean().optional(),
        requiredPersons: z.number().optional(),
        excludedMembers: z.array(z.number()).optional(),
        dueDate: z.string().optional(),
        dueTime: z.string().optional(),
        projectIds: z.array(z.number()).optional(),
        sharedHouseholdIds: z.array(z.number()).optional(),
        nonResponsiblePermission: z.enum(["full", "milestones_reminders", "view_only"]).default("full"),
      })
    )
    .mutation(async ({ input }) => {
      const { taskId, householdId, memberId, dueDate, dueTime, ...updates } = input;

      // Get current task to compare old vs new values
      const tasksList = await getTasks(householdId);
      const currentTask = tasksList.find(t => t.id === taskId);

      if (!currentTask) {
        throw new Error("Task not found");
      }

      // Combine date and time if both provided
      let dueDatetime: Date | undefined;
      if (dueDate) {
        if (dueTime) {
          const [year, month, day] = dueDate.split('-').map(Number);
          const [hours, minutes] = dueTime.split(':').map(Number);
          dueDatetime = new Date(year, month - 1, day, hours, minutes);
        } else {
          dueDatetime = new Date(dueDate);
        }
      }

      // Normalize sharedHouseholdIds: empty array -> null for clean DB storage
      if (updates.sharedHouseholdIds !== undefined) {
        updates.sharedHouseholdIds = (updates.sharedHouseholdIds as number[]).length > 0
          ? updates.sharedHouseholdIds
          : null as any;
      }

      // Normalize projectIds: empty array -> null for clean DB storage
      if (updates.projectIds !== undefined) {
        updates.projectIds = (updates.projectIds as number[]).length > 0
          ? updates.projectIds
          : null as any;
      }

      // Build detailed change description BEFORE applying the update
      const { changes, metadata } = await buildUpdateChanges(
        currentTask,
        updates,
        dueDatetime,
        householdId,
      );

      // Update the task with all values in a single call
      await updateTask(taskId, {
        ...updates,
        dueDate: dueDatetime,
      });

      // Build description string
      const taskName = updates.name ?? currentTask.name;
      let description: string;
      if (changes.length === 0) {
        description = `Aufgabe '${taskName}' gespeichert (keine Änderungen)`;
      } else if (changes.length === 1) {
        description = `Aufgabe '${taskName}' bearbeitet: ${changes[0]}`;
      } else {
        description = `Aufgabe '${taskName}' bearbeitet: ${changes.join(" | ")}`;
      }

      await createActivityLog({
        householdId,
        memberId,
        activityType: "task",
        action: "updated",
        description,
        relatedItemId: taskId,
        metadata,
      });

      return { success: true };
    }),

  // Toggle task completion and handle rotation
  toggleComplete: publicProcedure
    .input(
      z.object({
        taskId: z.number(),
        householdId: z.number(),
        memberId: z.number(),
        isCompleted: z.boolean(),
      })
    )
    .mutation(async ({ input }) => {
      const tasksList = await getTasks(input.householdId);
      const task = tasksList.find(t => t.id === input.taskId);

      if (!task) {
        throw new Error("Task not found");
      }

      // Store original due date for activity log
      const originalDueDate = task.dueDate;

      // Check if task is recurring
      const isRecurring = task.repeatInterval && task.repeatUnit;

      if (input.isCompleted && isRecurring) {
        // For recurring tasks: move to next occurrence instead of marking as completed
        const currentDueDate = task.dueDate ? new Date(task.dueDate) : new Date();
        let nextDueDate = new Date(currentDueDate);

        if (task.repeatUnit === "days") {
          nextDueDate.setDate(nextDueDate.getDate() + (task.repeatInterval || 1));
        } else if (task.repeatUnit === "weeks") {
          nextDueDate.setDate(nextDueDate.getDate() + ((task.repeatInterval || 1) * 7));
        } else if (task.repeatUnit === "months") {
          nextDueDate.setMonth(nextDueDate.getMonth() + (task.repeatInterval || 1));
        }

        // Handle rotation if enabled (only for single assignee)
        let nextAssignee = task.assignedTo;
        if (task.enableRotation && task.assignedTo && Array.isArray(task.assignedTo) && task.assignedTo.length === 1) {
          const members = await getHouseholdMembers(input.householdId);
          const activeMembers = members.filter(m => m.isActive);

          if (activeMembers.length > 1) {
            const currentAssigneeId = task.assignedTo[0];
            const currentIndex = activeMembers.findIndex(m => m.id === currentAssigneeId);
            const nextIndex = (currentIndex + 1) % activeMembers.length;
            const nextMember = activeMembers[nextIndex];

            if (nextMember) {
              nextAssignee = [nextMember.id];

              await createActivityLog({
                householdId: input.householdId,
                memberId: input.memberId,
                activityType: "task",
                action: "rotated",
                description: `Aufgabe '${task.name}' rotiert: Nächste Verantwortliche ist ${nextMember.memberName}`,
                relatedItemId: input.taskId,
                metadata: {
                  previousAssignee: task.assignedTo,
                  nextAssignee: [nextMember.id],
                  nextAssigneeName: nextMember.memberName,
                },
              });
            }
          }
        }

        // Update task to next occurrence (NOT completed)
        await updateTask(input.taskId, {
          dueDate: nextDueDate,
          assignedTo: nextAssignee,
          isCompleted: false,
          completedBy: null,
          completedAt: null,
        });

        // Log completion of THIS occurrence with ORIGINAL due date
        await createActivityLog({
          householdId: input.householdId,
          memberId: input.memberId,
          activityType: "task",
          action: "completed",
          description: `Wiederkehrende Aufgabe '${task.name}' abgeschlossen (Termin: ${formatDate(originalDueDate)}). Nächster Termin: ${formatDate(nextDueDate)}`,
          relatedItemId: input.taskId,
          completedDate: originalDueDate || new Date(),
          metadata: {
            originalDueDate: originalDueDate?.toString(),
            nextDueDate: nextDueDate.toISOString(),
            taskName: task.name,
          },
        });
      } else {
        // For non-recurring tasks: normal completion logic
        await updateTask(input.taskId, {
          isCompleted: input.isCompleted,
          completedBy: input.isCompleted ? input.memberId : null,
          completedAt: input.isCompleted ? new Date() : null,
        });

        if (input.isCompleted) {
          await createActivityLog({
            householdId: input.householdId,
            memberId: input.memberId,
            activityType: "task",
            action: "completed",
            description: `Aufgabe '${task.name}' als erledigt markiert`,
            relatedItemId: input.taskId,
            metadata: { taskName: task.name },
          });
        } else {
          await createActivityLog({
            householdId: input.householdId,
            memberId: input.memberId,
            activityType: "task",
            action: "uncompleted",
            description: `Aufgabe '${task.name}' als unerledigt markiert`,
            relatedItemId: input.taskId,
            metadata: { taskName: task.name },
          });
        }
      }

      return { success: true };
    }),

  // Delete task
  delete: publicProcedure
    .input(
      z.object({
        taskId: z.number(),
        householdId: z.number(),
        memberId: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      // Get task name before deletion for the log
      const tasksList = await getTasks(input.householdId);
      const task = tasksList.find(t => t.id === input.taskId);
      const taskName = task?.name ?? `#${input.taskId}`;

      await deleteTask(input.taskId);

      await createActivityLog({
        householdId: input.householdId,
        memberId: input.memberId,
        activityType: "task",
        action: "deleted",
        description: `Aufgabe '${taskName}' gelöscht`,
        relatedItemId: input.taskId,
        metadata: { taskName },
      });

      return { success: true };
    }),

  // Complete task with comment and photos
  completeTask: publicProcedure
    .input(
      z.object({
        taskId: z.number(),
        householdId: z.number(),
        memberId: z.number(),
        comment: z.string().optional(),
        photoUrls: z.array(z.object({ url: z.string(), filename: z.string() })).optional(),
        fileUrls: z.array(z.object({ url: z.string(), filename: z.string() })).optional(),
        shoppingItemsToInventory: z.array(z.object({
          itemId: z.number(),
          categoryId: z.number(),
          details: z.string().optional(),
          photoUrls: z.array(z.object({ url: z.string(), filename: z.string() })).optional(),
          ownershipType: z.enum(["personal", "household"]),
          ownerIds: z.array(z.number()).optional(),
        })).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const tasksList = await getTasks(input.householdId);
      const task = tasksList.find(t => t.id === input.taskId);

      if (!task) {
        throw new Error("Task not found");
      }

      // Save original due date before updating (for activity history)
      const originalDueDate = task.dueDate;

      // Mark task as completed
      await updateTask(input.taskId, {
        isCompleted: true,
        completedBy: input.memberId,
        completedAt: new Date(),
        completionPhotoUrls: input.photoUrls || [],
        completionFileUrls: input.fileUrls || [],
      });

      // Update due date if recurring
      if (task.frequency !== "once" && task.dueDate) {
        let nextDueDate = new Date(task.dueDate);

        switch (task.frequency) {
          case "daily":
            nextDueDate.setDate(nextDueDate.getDate() + 1);
            break;
          case "weekly":
            nextDueDate.setDate(nextDueDate.getDate() + 7);
            break;
          case "monthly":
            nextDueDate.setMonth(nextDueDate.getMonth() + 1);
            break;
          case "custom":
            if (task.repeatInterval && task.repeatUnit) {
              switch (task.repeatUnit) {
                case "days":
                  nextDueDate.setDate(nextDueDate.getDate() + task.repeatInterval);
                  break;
                case "weeks":
                  nextDueDate.setDate(nextDueDate.getDate() + (task.repeatInterval * 7));
                  break;
                case "months":
                  nextDueDate.setMonth(nextDueDate.getMonth() + task.repeatInterval);
                  break;
              }
            } else if (task.customFrequencyDays) {
              nextDueDate.setDate(nextDueDate.getDate() + task.customFrequencyDays);
            }
            break;
        }

        await updateTask(input.taskId, {
          dueDate: nextDueDate,
          isCompleted: false,
          completedBy: null,
          completedAt: null,
        });
      }

      // Handle rotation if enabled (only for single assignee)
      if (task.enableRotation && task.assignedTo && Array.isArray(task.assignedTo) && task.assignedTo.length === 1) {
        const members = await getHouseholdMembers(input.householdId);
        const activeMembers = members.filter(m => m.isActive);

        // Get excluded members from task_rotation_exclusions table
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const exclusions = await db.select()
          .from(taskRotationExclusions)
          .where(eq(taskRotationExclusions.taskId, input.taskId));

        const excludedMemberIds = new Set(exclusions.map(e => e.memberId));

        // Filter out excluded members
        const eligibleMembers = activeMembers.filter(m => !excludedMemberIds.has(m.id));

        if (eligibleMembers.length > 0) {
          const currentAssigneeId = task.assignedTo[0];
          const currentIndex = eligibleMembers.findIndex(m => m.id === currentAssigneeId);
          const nextIndex = (currentIndex + 1) % eligibleMembers.length;
          const nextMember = eligibleMembers[nextIndex];

          if (nextMember) {
            await updateTask(input.taskId, {
              assignedTo: [nextMember.id],
            });
          }
        }
      }

      // Build description with details
      const descParts: string[] = [`Aufgabe abgeschlossen: '${task.name}'`];
      if (input.comment) descParts.push(`Kommentar: ${input.comment}`);
      if (input.photoUrls && input.photoUrls.length > 0) {
        descParts.push(`${input.photoUrls.length} Foto(s) angehängt`);
      }
      if (input.fileUrls && input.fileUrls.length > 0) {
        descParts.push(`${input.fileUrls.length} Datei(en) angehängt`);
      }

      // Create activity log with original due date
      await createActivityLog({
        householdId: input.householdId,
        memberId: input.memberId,
        activityType: "task",
        action: "completed",
        description: descParts.join(" | "),
        relatedItemId: input.taskId,
        comment: input.comment,
        photoUrls: input.photoUrls,
        metadata: originalDueDate
          ? { originalDueDate: originalDueDate.toISOString(), taskName: task.name }
          : { taskName: task.name },
      });

      // Send notification to task creator if different from completer
      if (task.createdBy && task.createdBy !== input.memberId) {
        const members = await getHouseholdMembers(input.householdId);
        const completer = members.find(m => m.id === input.memberId);
        if (completer) {
          await notifyTaskCompleted(
            input.householdId,
            task.createdBy,
            input.taskId,
            task.name,
            completer.memberName
          );
        }
      }

      // Process linked shopping items
      const { getLinkedShoppingItems, deleteShoppingItem, addInventoryItem } = await import("../db");
      const linkedItems = await getLinkedShoppingItems(input.taskId);

      // Delete all linked shopping items from the list
      for (const item of linkedItems) {
        await deleteShoppingItem(item.id);
      }

      // Add selected items to inventory
      if (input.shoppingItemsToInventory && input.shoppingItemsToInventory.length > 0) {
        for (const inventoryData of input.shoppingItemsToInventory) {
          const originalItem = linkedItems.find(item => item.id === inventoryData.itemId);
          if (originalItem) {
            await addInventoryItem({
              householdId: input.householdId,
              memberId: input.memberId,
              name: originalItem.name,
              details: inventoryData.details,
              categoryId: inventoryData.categoryId,
              photoUrls: inventoryData.photoUrls,
              ownershipType: inventoryData.ownershipType,
              ownerIds: inventoryData.ownerIds,
            });
          }
        }
      }

      return { success: true };
    }),

  // Add milestone (intermediate goal)
  addMilestone: publicProcedure
    .input(
      z.object({
        taskId: z.number(),
        householdId: z.number(),
        memberId: z.number(),
        comment: z.string().optional(),
        photoUrls: z.array(z.object({ url: z.string(), filename: z.string() })).optional(),
        fileUrls: z.array(z.object({ url: z.string(), filename: z.string() })).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const tasksList = await getTasks(input.householdId);
      const task = tasksList.find(t => t.id === input.taskId);

      if (!task) {
        throw new Error("Task not found");
      }

      // Build detailed milestone description
      const descParts: string[] = [`Zwischensieg bei Aufgabe: '${task.name}'`];
      if (input.comment) descParts.push(`Kommentar: ${input.comment}`);
      if (input.photoUrls && input.photoUrls.length > 0) {
        descParts.push(`${input.photoUrls.length} Foto(s) angehängt`);
      }
      if (input.fileUrls && input.fileUrls.length > 0) {
        descParts.push(`${input.fileUrls.length} Datei(en) angehängt`);
      }

      await createActivityLog({
        householdId: input.householdId,
        memberId: input.memberId,
        activityType: "task",
        action: "milestone",
        description: descParts.join(" | "),
        relatedItemId: input.taskId,
        comment: input.comment,
        photoUrls: input.photoUrls,
        fileUrls: input.fileUrls,
        metadata: {
          taskName: task.name,
          hasComment: !!input.comment,
          photoCount: input.photoUrls?.length ?? 0,
          fileCount: input.fileUrls?.length ?? 0,
        },
      });

      return { success: true };
    }),

  // Send reminder
  sendReminder: publicProcedure
    .input(
      z.object({
        taskId: z.number(),
        householdId: z.number(),
        memberId: z.number(),
        comment: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const tasksList = await getTasks(input.householdId);
      const task = tasksList.find(t => t.id === input.taskId);

      if (!task) {
        throw new Error("Task not found");
      }

      const descParts: string[] = [`Erinnerung gesendet für Aufgabe: '${task.name}'`];
      if (input.comment) descParts.push(`Nachricht: ${input.comment}`);

      await createActivityLog({
        householdId: input.householdId,
        memberId: input.memberId,
        activityType: "task",
        action: "reminder",
        description: descParts.join(" | "),
        relatedItemId: input.taskId,
        comment: input.comment,
        metadata: { taskName: task.name },
      });

      return { success: true };
    }),

  // Batch delete tasks
  batchDelete: publicProcedure
    .input(
      z.object({
        taskIds: z.array(z.number()),
        householdId: z.number(),
        memberId: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      const deletedCount = await Promise.all(
        input.taskIds.map(async (taskId) => {
          try {
            await deleteTask(taskId);
            return 1;
          } catch (error) {
            console.error(`Failed to delete task ${taskId}:`, error);
            return 0;
          }
        })
      );

      const successCount = deletedCount.reduce((a: number, b: number) => a + b, 0);
      return { success: true, deletedCount: successCount };
    }),

  // Batch assign tasks
  batchAssign: publicProcedure
    .input(
      z.object({
        taskIds: z.array(z.number()),
        householdId: z.number(),
        memberId: z.number(),
        assignedTo: z.array(z.number()),
      })
    )
    .mutation(async ({ input }) => {
      const updatedCount = await Promise.all(
        input.taskIds.map(async (taskId) => {
          try {
            await updateTask(taskId, {
              assignedTo: input.assignedTo,
            });
            return 1;
          } catch (error) {
            console.error(`Failed to assign task ${taskId}:`, error);
            return 0;
          }
        })
      );

      const successCount = updatedCount.reduce((a: number, b: number) => a + b, 0);
      return { success: true, updatedCount: successCount };
    }),

  // Batch complete tasks
  batchComplete: publicProcedure
    .input(
      z.object({
        taskIds: z.array(z.number()),
        householdId: z.number(),
        memberId: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      const tasksList = await getTasks(input.householdId);
      const completedCount = await Promise.all(
        input.taskIds.map(async (taskId) => {
          try {
            const task = tasksList.find(t => t.id === taskId);
            if (!task) return 0;

            await updateTask(taskId, {
              isCompleted: true,
              completedBy: input.memberId,
              completedAt: new Date(),
            });

            await createActivityLog({
              householdId: input.householdId,
              memberId: input.memberId,
              activityType: "task",
              action: "completed",
              description: `Aufgabe '${task.name}' als erledigt markiert`,
              relatedItemId: taskId,
              metadata: { taskName: task.name },
            });

            return 1;
          } catch (error) {
            console.error(`Failed to complete task ${taskId}:`, error);
            return 0;
          }
        })
      );

      const successCount = completedCount.reduce((a: number, b: number) => a + b, 0);
      return { success: true, completedCount: successCount };
    }),

  // Undo completion of a recurring task occurrence
  undoRecurringCompletion: publicProcedure
    .input(
      z.object({
        taskId: z.number(),
        householdId: z.number(),
        memberId: z.number(),
        activityId: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Get the activity log entry to find original due date
      const activities = await db
        .select()
        .from(activityHistory)
        .where(
          and(
            eq(activityHistory.id, input.activityId),
            eq(activityHistory.householdId, input.householdId),
            eq(activityHistory.relatedItemId, input.taskId),
            eq(activityHistory.action, "completed")
          )
        )
        .limit(1);

      const activity = activities[0];
      if (!activity) {
        throw new Error("Activity log entry not found");
      }

      // Get original due date from metadata
      const actMeta = activity.metadata as { originalDueDate?: string } | null;
      const originalDueDate = actMeta?.originalDueDate
        ? new Date(actMeta.originalDueDate)
        : null;

      if (!originalDueDate) {
        throw new Error("Original due date not found in activity metadata");
      }

      // Get the task
      const tasksList = await getTasks(input.householdId);
      const task = tasksList.find((t: any) => t.id === input.taskId);

      if (!task) {
        throw new Error("Task not found");
      }

      // Check if task is recurring
      const isRecurring = task.repeatInterval && task.repeatUnit;
      if (!isRecurring) {
        throw new Error("Task is not recurring");
      }

      // Revert rotation if enabled
      let previousAssignee = task.assignedTo;
      if (task.enableRotation && task.assignedTo && Array.isArray(task.assignedTo) && task.assignedTo.length === 1) {
        const members = await getHouseholdMembers(input.householdId);
        const activeMembers = members.filter((m: any) => m.isActive);

        if (activeMembers.length > 1) {
          const currentAssigneeId = task.assignedTo[0];
          const currentIndex = activeMembers.findIndex(
            (m: any) => m.id === currentAssigneeId
          );
          const previousIndex =
            (currentIndex - 1 + activeMembers.length) % activeMembers.length;
          const previousMember = activeMembers[previousIndex];

          if (previousMember) {
            previousAssignee = [previousMember.id];
          }
        }
      }

      // Revert task to original due date and previous assignee
      await updateTask(input.taskId, {
        dueDate: originalDueDate,
        assignedTo: previousAssignee,
        isCompleted: false,
        completedBy: null,
        completedAt: null,
      });

      return { success: true };
    }),

  // Skip a specific occurrence of a recurring task
  skipOccurrence: publicProcedure
    .input(
      z.object({
        taskId: z.number(),
        householdId: z.number(),
        memberId: z.number(),
        dateToSkip: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const tasksList = await getTasks(input.householdId);
      const task = tasksList.find(t => t.id === input.taskId);

      if (!task) {
        throw new Error("Task not found");
      }

      // Add date to skippedDates array
      const currentSkippedDates = task.skippedDates || [];
      const updatedSkippedDates = [...currentSkippedDates, input.dateToSkip];

      await updateTask(input.taskId, {
        skippedDates: updatedSkippedDates,
      });

      const formattedDate = new Date(input.dateToSkip).toLocaleDateString('de-DE');
      await createActivityLog({
        householdId: input.householdId,
        memberId: input.memberId,
        activityType: "task",
        action: "skipped",
        description: `Termin übersprungen am ${formattedDate} für Aufgabe '${task.name}'`,
        relatedItemId: input.taskId,
        metadata: { skippedDate: input.dateToSkip, taskName: task.name },
      });

      return { success: true };
    }),

  // Restore a skipped occurrence of a recurring task
  restoreSkippedDate: publicProcedure
    .input(
      z.object({
        taskId: z.number(),
        householdId: z.number(),
        memberId: z.number(),
        dateToRestore: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const tasksList = await getTasks(input.householdId);
      const task = tasksList.find(t => t.id === input.taskId);

      if (!task) {
        throw new Error("Task not found");
      }

      // Remove date from skippedDates array
      const currentSkippedDates = task.skippedDates || [];
      const updatedSkippedDates = currentSkippedDates.filter(date => date !== input.dateToRestore);

      await updateTask(input.taskId, {
        skippedDates: updatedSkippedDates,
      });

      const formattedDate = new Date(input.dateToRestore).toLocaleDateString('de-DE');
      await createActivityLog({
        householdId: input.householdId,
        memberId: input.memberId,
        activityType: "task",
        action: "restored",
        description: `Übersprungener Termin am ${formattedDate} wiederhergestellt für Aufgabe '${task.name}'`,
        relatedItemId: input.taskId,
        metadata: { restoredDate: input.dateToRestore, taskName: task.name },
      });

      return { success: true };
    }),

  // Get shared households for a task
  getSharedHouseholds: publicProcedure
    .input(z.object({ taskId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      const { tasks, households } = await import("../../drizzle/schema");

      // Get the task's sharedHouseholdIds
      const task = await db.select({ sharedHouseholdIds: tasks.sharedHouseholdIds })
        .from(tasks)
        .where(eq(tasks.id, input.taskId))
        .limit(1);

      if (!task[0] || !task[0].sharedHouseholdIds || task[0].sharedHouseholdIds.length === 0) {
        return [];
      }

      // Get household names for the shared household IDs
      const shared = await db.select({
        id: households.id,
        name: households.name,
      })
        .from(households)
        .where(inArray(households.id, task[0].sharedHouseholdIds));

      return shared;
    }),
});
