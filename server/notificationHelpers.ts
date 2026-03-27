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

export type NotifLang = "de" | "en" | "es" | "fr";

interface CreateNotificationParams {
  householdId: number;
  memberId: number;
  type: NotificationType;
  title: string;
  message: string;
  relatedTaskId?: number;
  relatedProjectId?: number;
}

/** Simple multilingual helper */
function nt(lang: NotifLang, de: string, en: string, es: string, fr: string): string {
  if (lang === "en") return en;
  if (lang === "es") return es;
  if (lang === "fr") return fr;
  return de;
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
  taskTitle: string,
  lang: NotifLang = "de"
) {
  await createNotification({
    householdId,
    memberId,
    type: "task_assigned",
    title: nt(lang,
      "Neue Aufgabe zugewiesen",
      "New task assigned",
      "Nueva tarea asignada",
      "Nouvelle tâche assignée"
    ),
    message: nt(lang,
      `Ihnen wurde die Aufgabe "${taskTitle}" zugewiesen`,
      `You have been assigned the task "${taskTitle}"`,
      `Se le ha asignado la tarea "${taskTitle}"`,
      `La tâche « ${taskTitle} » vous a été assignée`
    ),
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
  daysUntilDue: number,
  isRecurring?: boolean,
  lang: NotifLang = "de"
) {
  const title = isRecurring
    ? nt(lang, "Termin anstehend", "Upcoming occurrence", "Cita próxima", "Rendez-vous à venir")
    : nt(lang, "Aufgabe fällig", "Task due", "Tarea pendiente", "Tâche à rendre");

  let message: string;
  if (daysUntilDue === 0) {
    message = isRecurring
      ? nt(lang,
          `Der nächste Termin für "${taskTitle}" ist heute!`,
          `The next occurrence of "${taskTitle}" is today!`,
          `¡La próxima cita para "${taskTitle}" es hoy!`,
          `Le prochain rendez-vous pour « ${taskTitle} » est aujourd'hui !`
        )
      : nt(lang,
          `Die Aufgabe "${taskTitle}" ist heute fällig!`,
          `The task "${taskTitle}" is due today!`,
          `¡La tarea "${taskTitle}" vence hoy!`,
          `La tâche « ${taskTitle} » est à rendre aujourd'hui !`
        );
  } else {
    message = isRecurring
      ? nt(lang,
          `Der nächste Termin für "${taskTitle}" ist in ${daysUntilDue} Tag(en)`,
          `The next occurrence of "${taskTitle}" is in ${daysUntilDue} day(s)`,
          `La próxima cita para "${taskTitle}" es en ${daysUntilDue} día(s)`,
          `Le prochain rendez-vous pour « ${taskTitle} » est dans ${daysUntilDue} jour(s)`
        )
      : nt(lang,
          `Die Aufgabe "${taskTitle}" ist in ${daysUntilDue} Tag(en) fällig`,
          `The task "${taskTitle}" is due in ${daysUntilDue} day(s)`,
          `La tarea "${taskTitle}" vence en ${daysUntilDue} día(s)`,
          `La tâche « ${taskTitle} » est à rendre dans ${daysUntilDue} jour(s)`
        );
  }

  await createNotification({
    householdId,
    memberId,
    type: "task_due",
    title,
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
  completedByName: string,
  lang: NotifLang = "de"
) {
  await createNotification({
    householdId,
    memberId,
    type: "task_completed",
    title: nt(lang,
      "Aufgabe erledigt",
      "Task completed",
      "Tarea completada",
      "Tâche terminée"
    ),
    message: nt(lang,
      `${completedByName} hat die Aufgabe "${taskTitle}" erledigt`,
      `${completedByName} completed the task "${taskTitle}"`,
      `${completedByName} completó la tarea "${taskTitle}"`,
      `${completedByName} a terminé la tâche « ${taskTitle} »`
    ),
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
  commenterName: string,
  lang: NotifLang = "de"
) {
  await createNotification({
    householdId,
    memberId,
    type: "comment_added",
    title: nt(lang,
      "Neuer Kommentar",
      "New comment",
      "Nuevo comentario",
      "Nouveau commentaire"
    ),
    message: nt(lang,
      `${commenterName} hat einen Kommentar zu "${taskTitle}" hinzugefügt`,
      `${commenterName} added a comment to "${taskTitle}"`,
      `${commenterName} añadió un comentario a "${taskTitle}"`,
      `${commenterName} a ajouté un commentaire à « ${taskTitle} »`
    ),
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
