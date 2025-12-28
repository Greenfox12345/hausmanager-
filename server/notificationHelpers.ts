import { getDb } from "./db";
import { notifications } from "../drizzle/schema";

/**
 * Notification Helper Functions
 * Used to create notifications for various events
 */

export type NotificationType =
  | "task_assigned"
  | "task_due"
  | "task_completed"
  | "comment_added"
  | "reminder"
  | "general";

interface CreateNotificationParams {
  householdId: number;
  memberId: number;
  type: NotificationType;
  title: string;
  message: string;
  relatedTaskId?: number;
  relatedProjectId?: number;
}

/**
 * Create a notification for a specific member
 */
export async function createNotification(params: CreateNotificationParams) {
  const {
    householdId,
    memberId,
    type,
    title,
    message,
    relatedTaskId,
    relatedProjectId,
  } = params;

  const db = await getDb();
  if (!db) {
    console.warn("[Notifications] Cannot create notification: database not available");
    return;
  }

  await db.insert(notifications).values({
    householdId,
    memberId,
    type,
    title,
    message,
    relatedTaskId: relatedTaskId || null,
    relatedProjectId: relatedProjectId || null,
    isRead: false,
    createdAt: new Date(),
  });
}

/**
 * Create task assignment notification
 */
export async function notifyTaskAssigned(
  householdId: number,
  memberId: number,
  taskId: number,
  taskTitle: string
) {
  await createNotification({
    householdId,
    memberId,
    type: "task_assigned",
    title: "Neue Aufgabe zugewiesen",
    message: `Ihnen wurde die Aufgabe "${taskTitle}" zugewiesen`,
    relatedTaskId: taskId,
  });
}

/**
 * Create task due notification
 */
export async function notifyTaskDue(
  householdId: number,
  memberId: number,
  taskId: number,
  taskTitle: string,
  daysUntilDue: number
) {
  const message =
    daysUntilDue === 0
      ? `Die Aufgabe "${taskTitle}" ist heute fällig!`
      : `Die Aufgabe "${taskTitle}" ist in ${daysUntilDue} Tag(en) fällig`;

  await createNotification({
    householdId,
    memberId,
    type: "task_due",
    title: "Aufgabe fällig",
    message,
    relatedTaskId: taskId,
  });
}

/**
 * Create task completion notification
 */
export async function notifyTaskCompleted(
  householdId: number,
  memberId: number,
  taskId: number,
  taskTitle: string,
  completedByName: string
) {
  await createNotification({
    householdId,
    memberId,
    type: "task_completed",
    title: "Aufgabe erledigt",
    message: `${completedByName} hat die Aufgabe "${taskTitle}" erledigt`,
    relatedTaskId: taskId,
  });
}

/**
 * Create comment notification
 */
export async function notifyCommentAdded(
  householdId: number,
  memberId: number,
  taskId: number,
  taskTitle: string,
  commenterName: string
) {
  await createNotification({
    householdId,
    memberId,
    type: "comment_added",
    title: "Neuer Kommentar",
    message: `${commenterName} hat einen Kommentar zu "${taskTitle}" hinzugefügt`,
    relatedTaskId: taskId,
  });
}

/**
 * Create general reminder notification
 */
export async function notifyReminder(
  householdId: number,
  memberId: number,
  title: string,
  message: string,
  relatedTaskId?: number
) {
  await createNotification({
    householdId,
    memberId,
    type: "reminder",
    title,
    message,
    relatedTaskId,
  });
}
