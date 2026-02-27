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
  getRotationSchedule,
  setRotationSchedule,
  extendRotationSchedule,
  shiftRotationSchedule,
  deleteRotationOccurrence,
  skipRotationOccurrence,
  moveRotationOccurrence,
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
        repeatUnit: z.enum(["days", "weeks", "months", "irregular"]).optional(),
        irregularRecurrence: z.boolean().optional(),
        monthlyRecurrenceMode: z.enum(["same_date", "same_weekday"]).optional(),
        monthlyWeekday: z.number().optional(),
        monthlyOccurrence: z.number().optional(),
        enableRotation: z.boolean().default(false),
        requiredPersons: z.number().optional(),
        excludedMembers: z.array(z.number()).optional(),
        dueDate: z.string().optional(),
        dueTime: z.string().optional(),
        durationDays: z.number().min(0).optional(),
        durationMinutes: z.number().min(0).max(1439).optional(), // 0-1439 (max 23:59)
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
          // Create UTC date to avoid timezone shifts
          dueDatetime = new Date(Date.UTC(year, month - 1, day, hours, minutes));
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
        irregularRecurrence: input.irregularRecurrence,
        monthlyRecurrenceMode: input.monthlyRecurrenceMode,
        enableRotation: input.enableRotation,
        requiredPersons: input.requiredPersons,
        dueDate: dueDatetime,
        durationDays: input.durationDays,
        durationMinutes: input.durationMinutes,
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
        monthlyRecurrenceMode: input.monthlyRecurrenceMode,
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
        repeatUnit: z.enum(["days", "weeks", "months", "irregular"]).optional(),
        irregularRecurrence: z.boolean().optional(),
        monthlyRecurrenceMode: z.enum(["same_date", "same_weekday"]).optional(),
        monthlyWeekday: z.number().optional(),
        monthlyOccurrence: z.number().optional(),
        enableRotation: z.boolean().optional(),
        requiredPersons: z.number().optional(),
        excludedMembers: z.array(z.number()).optional(),
        dueDate: z.string().optional(),
        dueTime: z.string().optional(),
        durationDays: z.number().min(0).optional(),
        durationMinutes: z.number().min(0).max(1439).optional(), // 0-1439 (max 23:59)
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
          // Create UTC date to avoid timezone shifts
          dueDatetime = new Date(Date.UTC(year, month - 1, day, hours, minutes));
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
          // Use monthlyRecurrenceMode if set
          const { getNextMonthlyOccurrence } = await import("../../shared/dateUtils");
          const mode = task.monthlyRecurrenceMode || "same_date";
          nextDueDate = getNextMonthlyOccurrence(currentDueDate, task.repeatInterval || 1, mode);
        }

        // Handle rotation if enabled
        let nextAssignee = task.assignedTo;
        if (task.enableRotation) {
          // Check if rotation schedule exists
          const schedule = await getRotationSchedule(input.taskId);
          
          if (schedule && schedule.length > 0) {
            // Use rotation schedule
            const nextOccurrence = schedule.find(occ => occ.occurrenceNumber === 1);
            
            if (nextOccurrence && nextOccurrence.members.length > 0) {
              // Get member IDs from schedule
              nextAssignee = nextOccurrence.members.map(m => m.memberId);
              
              // Get member names for logging
              const members = await getHouseholdMembers(input.householdId);
              const nextMemberNames = nextAssignee
                .map(id => members.find(m => m.id === id)?.memberName || `#${id}`)
                .join(", ");
              
              await createActivityLog({
                householdId: input.householdId,
                memberId: input.memberId,
                activityType: "task",
                action: "rotated",
                description: `Aufgabe '${task.name}' rotiert: Nächste Verantwortliche sind ${nextMemberNames}`,
                relatedItemId: input.taskId,
                metadata: {
                  previousAssignee: task.assignedTo,
                  nextAssignee,
                  nextAssigneeNames: nextMemberNames,
                },
              });
              
              // Shift schedule down (occurrence 2 becomes 1, etc.)
              await shiftRotationSchedule(input.taskId);
              
              // Check if we need to extend the schedule (less than 3 future occurrences)
              const updatedSchedule = await getRotationSchedule(input.taskId);
              if (updatedSchedule.length < 3 && task.requiredPersons) {
                // Get available members (excluding excluded ones)
                const db = await getDb();
                if (db) {
                  const { taskRotationExclusions } = await import("../../drizzle/schema");
                  const exclusions = await db.select().from(taskRotationExclusions)
                    .where(eq(taskRotationExclusions.taskId, input.taskId));
                  const excludedIds = exclusions.map(e => e.memberId);
                  
                  const members = await getHouseholdMembers(input.householdId);
                  const availableMembers = members.filter(m => m.isActive && !excludedIds.includes(m.id));
                  
                  // Add a new occurrence (simple round-robin for auto-extension)
                  const newOccurrenceNumber = updatedSchedule.length + 1;
                  const newMembers: { position: number; memberId: number }[] = [];
                  
                  for (let i = 0; i < task.requiredPersons; i++) {
                    if (availableMembers.length > 0) {
                      const memberIndex = (newOccurrenceNumber - 1 + i) % availableMembers.length;
                      newMembers.push({
                        position: i + 1,
                        memberId: availableMembers[memberIndex].id,
                      });
                    }
                  }
                  
                  if (newMembers.length > 0) {
                    await extendRotationSchedule(input.taskId, newOccurrenceNumber, newMembers);
                  }
                }
              }
            }
          } else if (task.assignedTo && Array.isArray(task.assignedTo) && task.assignedTo.length === 1) {
            // Fallback to old rotation logic (single assignee round-robin)
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
      console.log('[completeTask] Starting for taskId:', input.taskId);
      const tasksList = await getTasks(input.householdId);
      const task = tasksList.find(t => t.id === input.taskId);

      if (!task) {
        throw new Error("Task not found");
      }

      const isRecurring = task.frequency !== "once" || (task.repeatInterval && task.repeatUnit);
      console.log('[completeTask] Task found:', { id: task.id, name: task.name, frequency: task.frequency, isRecurring });

      // Save original due date before updating (for activity history)
      const originalDueDate = task.dueDate;

      // ===== 1. Load current occurrence details (Termin 1) for activity log =====
      let occurrenceDetails: {
        occurrenceNumber: number;
        members: { position: number; memberId: number }[];
        memberNames: string[];
        notes?: string;
        isSpecial?: boolean;
        specialName?: string;
        specialDate?: Date;
        items: { itemName: string; borrowStatus: string }[];
      } | null = null;

      const { getRotationSchedule, deleteRotationOccurrence } = await import("../db");
      
      if (isRecurring) {
        try {
          const schedule = await getRotationSchedule(input.taskId);
          // Find the first non-skipped occurrence
          const currentOcc = schedule.find(occ => !occ.isSkipped) || schedule[0];
          
          if (currentOcc) {
            // Get member names for this occurrence
            const allMembers = await getHouseholdMembers(input.householdId);
            const memberNames = currentOcc.members
              .map(m => allMembers.find(am => am.id === m.memberId)?.memberName || `Mitglied ${m.memberId}`)
              .filter(Boolean);

            // Get occurrence items
            const db = await getDb();
            let occItems: { itemName: string; borrowStatus: string }[] = [];
            if (db) {
              const { taskOccurrenceItems: toiTable, inventoryItems: invTable } = await import("../../drizzle/schema");
              const items = await db.select({
                itemName: invTable.name,
                borrowStatus: toiTable.borrowStatus,
              })
                .from(toiTable)
                .leftJoin(invTable, eq(toiTable.inventoryItemId, invTable.id))
                .where(
                  and(
                    eq(toiTable.taskId, input.taskId),
                    eq(toiTable.occurrenceNumber, currentOcc.occurrenceNumber)
                  )
                );
              occItems = items.map(i => ({ itemName: i.itemName || 'Unbekannt', borrowStatus: i.borrowStatus }));
            }

            occurrenceDetails = {
              occurrenceNumber: currentOcc.occurrenceNumber,
              members: currentOcc.members,
              memberNames,
              notes: currentOcc.notes,
              isSpecial: currentOcc.isSpecial,
              specialName: currentOcc.specialName,
              specialDate: currentOcc.specialDate,
              items: occItems,
            };
          }
        } catch (e) {
          console.error('[completeTask] Error loading occurrence details:', e);
        }
      }

      // ===== 2. Mark task as completed =====
      await updateTask(input.taskId, {
        isCompleted: true,
        completedBy: input.memberId,
        completedAt: new Date(),
        completionPhotoUrls: input.photoUrls || [],
        completionFileUrls: input.fileUrls || [],
      });

      // ===== 3. Update due date if recurring =====
      if (isRecurring && task.dueDate) {
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

      // ===== 4. Remove completed occurrence and shift remaining ones =====
      if (isRecurring && occurrenceDetails) {
        try {
          // Remove the completed occurrence (this also renumbers remaining ones)
          await deleteRotationOccurrence(input.taskId, occurrenceDetails.occurrenceNumber);
          console.log('[completeTask] Occurrence', occurrenceDetails.occurrenceNumber, 'removed and remaining shifted');

          // Shift task_occurrence_items: remove items for completed occurrence, renumber rest
          const db = await getDb();
          if (db) {
            const { taskOccurrenceItems: toiTable } = await import("../../drizzle/schema");
            
            // Delete items for the completed occurrence
            await db.delete(toiTable).where(
              and(
                eq(toiTable.taskId, input.taskId),
                eq(toiTable.occurrenceNumber, occurrenceDetails.occurrenceNumber)
              )
            );

            // Get remaining items and renumber them
            const remainingItems = await db.select().from(toiTable)
              .where(eq(toiTable.taskId, input.taskId))
              .orderBy(toiTable.occurrenceNumber);

            // Build a mapping of old occurrence numbers to new ones
            const occNumberSet = Array.from(new Set(remainingItems.map(i => i.occurrenceNumber))).sort((a, b) => a - b);
            const occMapping = new Map<number, number>();
            occNumberSet.forEach((oldNum, index) => {
              occMapping.set(oldNum, index + 1);
            });

            // Update occurrence numbers
            for (const item of remainingItems) {
              const newOccNum = occMapping.get(item.occurrenceNumber);
              if (newOccNum !== undefined && newOccNum !== item.occurrenceNumber) {
                await db.update(toiTable)
                  .set({ occurrenceNumber: newOccNum })
                  .where(eq(toiTable.id, item.id));
              }
            }
            console.log('[completeTask] Occurrence items shifted successfully');
          }
        } catch (e) {
          console.error('[completeTask] Error removing occurrence:', e);
        }
      }

      // ===== 5. Handle rotation if enabled (assign next person) =====
      if (task.enableRotation && task.assignedTo && Array.isArray(task.assignedTo) && task.assignedTo.length === 1) {
        try {
          // After occurrence removal, the new first occurrence has the next assignees
          // Update task.assignedTo to match the new first occurrence
          const updatedSchedule = await getRotationSchedule(input.taskId);
          const newFirstOcc = updatedSchedule.find(occ => !occ.isSkipped) || updatedSchedule[0];
          if (newFirstOcc && newFirstOcc.members.length > 0) {
            await updateTask(input.taskId, {
              assignedTo: newFirstOcc.members.map(m => m.memberId),
            });
          }
        } catch (e) {
          console.error('[completeTask] Error updating rotation assignee:', e);
          // Fallback: old rotation logic
          const members = await getHouseholdMembers(input.householdId);
          const activeMembers = members.filter(m => m.isActive);
          const db = await getDb();
          if (db) {
            const exclusions = await db.select()
              .from(taskRotationExclusions)
              .where(eq(taskRotationExclusions.taskId, input.taskId));
            const excludedMemberIds = new Set(exclusions.map(e => e.memberId));
            const eligibleMembers = activeMembers.filter(m => !excludedMemberIds.has(m.id));
            if (eligibleMembers.length > 0) {
              const currentAssigneeId = task.assignedTo[0];
              const currentIndex = eligibleMembers.findIndex(m => m.id === currentAssigneeId);
              const nextIndex = (currentIndex + 1) % eligibleMembers.length;
              const nextMember = eligibleMembers[nextIndex];
              if (nextMember) {
                await updateTask(input.taskId, { assignedTo: [nextMember.id] });
              }
            }
          }
        }
      }

      // ===== 6. Build activity log with occurrence details =====
      const descParts: string[] = [`Aufgabe abgeschlossen: '${task.name}'`];
      if (occurrenceDetails) {
        if (occurrenceDetails.specialName) {
          descParts.push(`Sondertermin: ${occurrenceDetails.specialName}`);
        }
        if (occurrenceDetails.memberNames.length > 0) {
          descParts.push(`Verantwortlich: ${occurrenceDetails.memberNames.join(', ')}`);
        }
        if (occurrenceDetails.notes) {
          descParts.push(`Notizen: ${occurrenceDetails.notes}`);
        }
        if (occurrenceDetails.items.length > 0) {
          descParts.push(`Gegenstände: ${occurrenceDetails.items.map(i => i.itemName).join(', ')}`);
        }
      }
      if (input.comment) descParts.push(`Kommentar: ${input.comment}`);
      if (input.photoUrls && input.photoUrls.length > 0) {
        descParts.push(`${input.photoUrls.length} Foto(s) angehängt`);
      }
      if (input.fileUrls && input.fileUrls.length > 0) {
        descParts.push(`${input.fileUrls.length} Datei(en) angehängt`);
      }

      // Create activity log with occurrence metadata
      let metadataObj: any = { taskName: task.name };
      if (originalDueDate) {
        try {
          const dueDateObj = originalDueDate instanceof Date ? originalDueDate : new Date(originalDueDate);
          metadataObj.originalDueDate = dueDateObj.toISOString();
        } catch (e) {
          metadataObj.originalDueDate = String(originalDueDate);
        }
      }
      if (occurrenceDetails) {
        metadataObj.occurrence = {
          number: occurrenceDetails.occurrenceNumber,
          memberNames: occurrenceDetails.memberNames,
          notes: occurrenceDetails.notes,
          isSpecial: occurrenceDetails.isSpecial,
          specialName: occurrenceDetails.specialName,
          specialDate: occurrenceDetails.specialDate ? (occurrenceDetails.specialDate instanceof Date ? occurrenceDetails.specialDate.toISOString() : String(occurrenceDetails.specialDate)) : undefined,
          items: occurrenceDetails.items,
        };
      }
      await createActivityLog({
        householdId: input.householdId,
        memberId: input.memberId,
        activityType: "task",
        action: "completed",
        description: descParts.join(" | "),
        relatedItemId: input.taskId,
        comment: input.comment,
        photoUrls: input.photoUrls,
        metadata: metadataObj,
      });

      // ===== 7. Send notification (non-fatal) =====
      try {
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
      } catch (notifError) {
        console.error('[completeTask] Notification error (non-fatal):', notifError);
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

  // Get rotation schedule for a task
  getRotationSchedule: publicProcedure
    .input(z.object({ taskId: z.number() }))
    .query(async ({ input }) => {
      return await getRotationSchedule(input.taskId);
    }),

  // Set rotation schedule for a task
  setRotationSchedule: publicProcedure
    .input(
      z.object({
        taskId: z.number(),
        schedule: z.array(
          z.object({
            occurrenceNumber: z.number(),
            members: z.array(
              z.object({
                position: z.number(),
                memberId: z.number(),
              })
            ),
            notes: z.string().optional(),
            isSkipped: z.boolean().optional(),
            isSpecial: z.boolean().optional(),
            specialName: z.string().optional(),
            calculatedDate: z.date().optional(),
            specialDate: z.date().optional(),
          })
        ),
      })
    )
    .mutation(async ({ input }) => {
      console.log('🔍 Server received rotation schedule:', JSON.stringify(input.schedule, null, 2));
      return await setRotationSchedule(input.taskId, input.schedule);
    }),

  // Extend rotation schedule by adding one more occurrence
  extendRotationSchedule: publicProcedure
    .input(
      z.object({
        taskId: z.number(),
        occurrenceNumber: z.number(),
        members: z.array(
          z.object({
            position: z.number(),
            memberId: z.number(),
          })
        ),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      return await extendRotationSchedule(
        input.taskId,
        input.occurrenceNumber,
        input.members,
        input.notes
      );
    }),

  // Delete a specific occurrence from rotation schedule
  deleteRotationOccurrence: publicProcedure
    .input(
      z.object({
        taskId: z.number(),
        occurrenceNumber: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      return await deleteRotationOccurrence(input.taskId, input.occurrenceNumber);
    }),

  // Skip/mark an occurrence as skipped
  skipRotationOccurrence: publicProcedure
    .input(
      z.object({
        taskId: z.number(),
        occurrenceNumber: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      return await skipRotationOccurrence(input.taskId, input.occurrenceNumber);
    }),

  // Move an occurrence up or down in the schedule
  moveRotationOccurrence: publicProcedure
    .input(
      z.object({
        taskId: z.number(),
        occurrenceNumber: z.number(),
        direction: z.enum(['up', 'down']),
      })
    )
    .mutation(async ({ input }) => {
      return await moveRotationOccurrence(
        input.taskId,
        input.occurrenceNumber,
        input.direction
      );
    }),
});
