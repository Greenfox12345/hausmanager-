/**
 * Shared helper for completing a recurring task occurrence.
 *
 * Both `toggleComplete` (simple checkbox) and `completeTask` (with comment/photos)
 * delegate the recurring-task logic here so the behaviour stays identical.
 *
 * What this function does:
 *  1. Calculate the next due date (days / weeks / months / custom)
 *  2. Run the skip-chain: advance nextDueDate past any occurrenceNotes.isSkipped entries
 *  3. Remove the completed occurrence from the rotation schedule and renumber
 *  4. Clean up rotation-schedule entries that are marked isSkipped
 *  5. Ensure at least MIN_REAL_OCCURRENCES (3) real entries remain in the DB
 *  6. Update task.assignedTo to match the new first occurrence
 *
 * Returns the new nextDueDate so callers can persist it.
 */

import { eq, and } from "drizzle-orm";
import {
  getDb,
  getHouseholdMembers,
  getRotationSchedule,
  extendRotationSchedule,
  shiftRotationSchedule,
  deleteRotationOccurrence,
  calcOccurrenceNumber,
  getSkippedOccurrenceNumbers,
  clearSkippedOccurrencesUpTo,
  getRealRotationSchedule,
  updateTask,
} from "../db";
import { taskRotationExclusions } from "../../drizzle/schema";

const MIN_REAL_OCCURRENCES = 3;

export interface RecurringCompletionResult {
  nextDueDate: Date;
  /** The occurrence that was just completed (for activity log) */
  occurrenceDetails: OccurrenceDetails | null;
}

export interface OccurrenceDetails {
  occurrenceNumber: number;
  members: { position: number; memberId: number }[];
  memberNames: string[];
  notes?: string;
  isSpecial?: boolean;
  specialName?: string;
  specialDate?: Date;
  items: { itemName: string; borrowStatus: string }[];
}

/** Minimal task shape needed by this helper */
export interface TaskForCompletion {
  id: number;
  dueDate: Date | null;
  repeatInterval: number | null;
  repeatUnit: string | null;
  monthlyRecurrenceMode: string | null;
  frequency: string | null;
  customFrequencyDays: number | null;
  enableRotation: boolean | null;
  requiredPersons: number | null;
  assignedTo: number[] | null;
}

/** Advance a date by one interval */
async function advanceByInterval(d: Date, task: TaskForCompletion): Promise<Date> {
  const next = new Date(d);
  if (task.repeatUnit === "days") {
    next.setDate(next.getDate() + (task.repeatInterval || 1));
    return next;
  }
  if (task.repeatUnit === "weeks") {
    next.setDate(next.getDate() + (task.repeatInterval || 1) * 7);
    return next;
  }
  if (task.repeatUnit === "months") {
    const { getNextMonthlyOccurrence } = await import("../../shared/dateUtils");
    return getNextMonthlyOccurrence(next, task.repeatInterval || 1, (task.monthlyRecurrenceMode as "same_date" | "same_weekday") || "same_date");
  }
  // Fallback: frequency field
  switch (task.frequency) {
    case "daily":
      next.setDate(next.getDate() + 1);
      return next;
    case "weekly":
      next.setDate(next.getDate() + 7);
      return next;
    case "monthly": {
      const { getNextMonthlyOccurrence } = await import("../../shared/dateUtils");
      return getNextMonthlyOccurrence(next, 1, (task.monthlyRecurrenceMode as "same_date" | "same_weekday") || "same_date");
    }
    case "custom":
      if (task.customFrequencyDays) {
        next.setDate(next.getDate() + task.customFrequencyDays);
      }
      return next;
  }
  return next;
}

/**
 * Core logic shared by toggleComplete and completeTask.
 *
 * @param task           The task being completed (minimal shape)
 * @param householdId    For member lookups
 * @param completedOccurrenceNumber  The occurrence number that was just completed
 *                       (pass null if not known / no rotation schedule)
 */
export async function handleRecurringCompletion(
  task: TaskForCompletion,
  householdId: number,
  completedOccurrenceNumber: number | null,
): Promise<{ nextDueDate: Date }> {
  const currentDueDate = task.dueDate instanceof Date ? task.dueDate : new Date(task.dueDate!);

  // ── 1. Calculate raw next due date ──────────────────────────────────────────
  let nextDueDate = await advanceByInterval(currentDueDate, task);

  // ── 2. Skip-chain ───────────────────────────────────────────────────────────
  const skippedOccNums = await getSkippedOccurrenceNumbers(task.id);
  let highestConsumedOccNum = 0;
  let maxSkipIter = 500;
  while (maxSkipIter-- > 0) {
    const occNum = calcOccurrenceNumber(task, nextDueDate);
    if (occNum !== null && skippedOccNums.has(occNum)) {
      highestConsumedOccNum = Math.max(highestConsumedOccNum, occNum);
      nextDueDate = await advanceByInterval(nextDueDate, task);
    } else {
      break;
    }
  }
  if (highestConsumedOccNum > 0) {
    await clearSkippedOccurrencesUpTo(task.id, highestConsumedOccNum);
  }

  // ── 3. Remove completed occurrence & renumber ────────────────────────────────
  const occNumToDelete = completedOccurrenceNumber ?? 1;
  await deleteRotationOccurrence(task.id, occNumToDelete);

  // Renumber taskOccurrenceItems
  const db = await getDb();
  if (db) {
    const { taskOccurrenceItems: toiTable } = await import("../../drizzle/schema");
    await db.delete(toiTable).where(
      and(eq(toiTable.taskId, task.id), eq(toiTable.occurrenceNumber, occNumToDelete))
    );
    const remainingItems = await db.select().from(toiTable)
      .where(eq(toiTable.taskId, task.id))
      .orderBy(toiTable.occurrenceNumber);
    const occNumberSet = Array.from(new Set(remainingItems.map(i => i.occurrenceNumber))).sort((a, b) => a - b);
    const occMapping = new Map<number, number>();
    occNumberSet.forEach((oldNum, index) => occMapping.set(oldNum, index + 1));
    for (const item of remainingItems) {
      const newOccNum = occMapping.get(item.occurrenceNumber);
      if (newOccNum !== undefined && newOccNum !== item.occurrenceNumber) {
        await db.update(toiTable).set({ occurrenceNumber: newOccNum }).where(eq(toiTable.id, item.id));
      }
    }
  }

  // ── 4. Clean up rotation-schedule entries marked isSkipped ──────────────────
  let scheduleAfterDelete = await getRotationSchedule(task.id);
  let maxRotIter = 50;
  while (scheduleAfterDelete.length > 0 && scheduleAfterDelete[0].isSkipped && maxRotIter-- > 0) {
    await deleteRotationOccurrence(task.id, scheduleAfterDelete[0].occurrenceNumber);
    scheduleAfterDelete = await getRotationSchedule(task.id);
  }

  // ── 5. Ensure at least MIN_REAL_OCCURRENCES real entries remain ──────────────
  if (task.requiredPersons) {
    const db2 = await getDb();
    if (db2) {
      const exclusions = await db2.select().from(taskRotationExclusions)
        .where(eq(taskRotationExclusions.taskId, task.id));
      const excludedIds = new Set(exclusions.map(e => e.memberId));
      const members = await getHouseholdMembers(householdId);
      const availableMembers = members.filter(m => m.isActive && !excludedIds.has(m.id));

      let safetyCounter = 0;
      while (safetyCounter++ < 10) {
        const realSchedule = await getRealRotationSchedule(task.id);
        if (realSchedule.length >= MIN_REAL_OCCURRENCES) break;

        const newOccurrenceNumber = realSchedule.length > 0
          ? Math.max(...realSchedule.map(r => r.occurrenceNumber)) + 1
          : 1;
        const newMembers: { position: number; memberId: number }[] = [];

        for (let i = 0; i < task.requiredPersons; i++) {
          if (availableMembers.length > 0) {
            const lastRealOcc = realSchedule[realSchedule.length - 1];
            const lastMember = lastRealOcc?.members?.[0];
            const lastIdx = lastMember ? availableMembers.findIndex(m => m.id === lastMember.memberId) : -1;
            const memberIndex = (lastIdx + 1 + i) % availableMembers.length;
            newMembers.push({ position: i + 1, memberId: availableMembers[memberIndex < 0 ? 0 : memberIndex].id });
          }
        }

        if (newMembers.length > 0) {
          await extendRotationSchedule(task.id, newOccurrenceNumber, newMembers);
        } else {
          break;
        }
      }
    }
  }

  // ── 6. Update task.assignedTo to match new first occurrence ─────────────────
  try {
    const updatedSchedule = await getRotationSchedule(task.id);
    const newFirstOcc = updatedSchedule.find(occ => !occ.isSkipped) || updatedSchedule[0];
    if (newFirstOcc && newFirstOcc.members.length > 0) {
      await updateTask(task.id, { assignedTo: newFirstOcc.members.map(m => m.memberId) });
    }
  } catch {
    // Non-fatal: assignedTo update failed, task still moves to next occurrence
  }

  return { nextDueDate };
}
