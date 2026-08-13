import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { getDb, getHouseholdById, getTasks } from "../db";
import { notifications, notificationPreferences } from "../../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";
import { notifyTaskDue } from "../notificationHelpers";
import { getDaysUntilDue, isWithinDndWindow } from "../../shared/notificationRules";

type NotificationLanguage = "de" | "en" | "es" | "fr" | "tr" | "zh" | "ar";

export const notificationsRouter = router({
  /**
   * List all notifications for a member
   */
  list: publicProcedure
    .input(z.object({ householdId: z.number(), memberId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const result = await db
        .select()
        .from(notifications)
        .where(
          and(
            eq(notifications.householdId, input.householdId),
            eq(notifications.memberId, input.memberId)
          )
        )
        .orderBy(desc(notifications.createdAt));

      return result;
    }),

  /**
   * Get unread notification count
   */
  getUnreadCount: publicProcedure
    .input(z.object({ householdId: z.number(), memberId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return 0;

      const result = await db
        .select()
        .from(notifications)
        .where(
          and(
            eq(notifications.householdId, input.householdId),
            eq(notifications.memberId, input.memberId),
            eq(notifications.isRead, false)
          )
        );

      return result.length;
    }),

  /**
   * Mark notification as read
   */
  markAsRead: publicProcedure
    .input(
      z.object({
        householdId: z.number(),
        memberId: z.number(),
        notificationId: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await db
        .update(notifications)
        .set({ isRead: true })
        .where(
          and(
            eq(notifications.id, input.notificationId),
            eq(notifications.householdId, input.householdId),
            eq(notifications.memberId, input.memberId)
          )
        );

      return { success: true };
    }),

  /**
   * Mark all notifications as read
   */
  markAllAsRead: publicProcedure
    .input(z.object({ householdId: z.number(), memberId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await db
        .update(notifications)
        .set({ isRead: true })
        .where(
          and(
            eq(notifications.householdId, input.householdId),
            eq(notifications.memberId, input.memberId),
            eq(notifications.isRead, false)
          )
        );

      return { success: true };
    }),

  /**
   * Delete notification
   */
  deleteNotification: publicProcedure
    .input(
      z.object({
        householdId: z.number(),
        memberId: z.number(),
        notificationId: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await db
        .delete(notifications)
        .where(
          and(
            eq(notifications.id, input.notificationId),
            eq(notifications.householdId, input.householdId),
            eq(notifications.memberId, input.memberId)
          )
        );

      return { success: true };
    }),

  /**
   * Create notification
   */
  create: publicProcedure
    .input(
      z.object({
        householdId: z.number(),
        memberId: z.number(),
        type: z.enum(["task_assigned", "task_due", "task_completed", "comment_added", "reminder", "general"]),
        title: z.string(),
        message: z.string(),
        relatedTaskId: z.number().optional(),
        relatedProjectId: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const [notification] = await db.insert(notifications).values({
        householdId: input.householdId,
        memberId: input.memberId,
        type: input.type,
        title: input.title,
        message: input.message,
        relatedTaskId: input.relatedTaskId,
        relatedProjectId: input.relatedProjectId,
        isRead: false,
      });

      return notification;
    }),

  /**
   * Get notification preferences
   */
  getPreferences: publicProcedure
    .input(
      z.object({
        householdId: z.number(),
        memberId: z.number(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const prefs = await db
        .select()
        .from(notificationPreferences)
        .where(
          and(
            eq(notificationPreferences.householdId, input.householdId),
            eq(notificationPreferences.memberId, input.memberId)
          )
        )
        .limit(1);

      // Return default preferences if none exist
      if (prefs.length === 0) {
        return {
          enableTaskAssigned: true,
          enableTaskDue: true,
          enableTaskCompleted: true,
          enableComments: true,
          enableBrowserPush: false,
          taskDueReminderDays: 1,
          dndStartTime: null,
          dndEndTime: null,
        };
      }

      return prefs[0];
    }),

  /**
   * Update notification preferences
   */
  updatePreferences: publicProcedure
    .input(
      z.object({
        householdId: z.number(),
        memberId: z.number(),
        enableTaskAssigned: z.boolean().optional(),
        enableTaskDue: z.boolean().optional(),
        enableTaskCompleted: z.boolean().optional(),
        enableComments: z.boolean().optional(),
        enableBrowserPush: z.boolean().optional(),
        taskDueReminderDays: z.number().int().min(0).max(30).optional(),
        dndStartTime: z.string().nullable().optional(),
        dndEndTime: z.string().nullable().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Check if preferences exist
      const existing = await db
        .select()
        .from(notificationPreferences)
        .where(
          and(
            eq(notificationPreferences.householdId, input.householdId),
            eq(notificationPreferences.memberId, input.memberId)
          )
        )
        .limit(1);

      const updateData: any = {};
      if (input.enableTaskAssigned !== undefined) updateData.enableTaskAssigned = input.enableTaskAssigned;
      if (input.enableTaskDue !== undefined) updateData.enableTaskDue = input.enableTaskDue;
      if (input.enableTaskCompleted !== undefined) updateData.enableTaskCompleted = input.enableTaskCompleted;
      if (input.enableComments !== undefined) updateData.enableComments = input.enableComments;
      if (input.enableBrowserPush !== undefined) updateData.enableBrowserPush = input.enableBrowserPush;
      if (input.taskDueReminderDays !== undefined) updateData.taskDueReminderDays = input.taskDueReminderDays;
      if (input.dndStartTime !== undefined) updateData.dndStartTime = input.dndStartTime;
      if (input.dndEndTime !== undefined) updateData.dndEndTime = input.dndEndTime;

      if (existing.length > 0) {
        // Update existing preferences
        await db
          .update(notificationPreferences)
          .set(updateData)
          .where(
            and(
              eq(notificationPreferences.householdId, input.householdId),
              eq(notificationPreferences.memberId, input.memberId)
            )
          );
      } else {
        // Insert new preferences
        await db.insert(notificationPreferences).values({
          householdId: input.householdId,
          memberId: input.memberId,
          ...updateData,
        });
      }

      return { success: true };
    }),

  /**
   * Lightweight reminder check: runs when a household member opens the app.
   * Each task occurrence is protected by a dedupeKey, so repeated opens do not
   * create duplicate in-app notifications.
   */
  checkDueTasksOnAppOpen: publicProcedure
    .input(z.object({ householdId: z.number(), memberId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const [preferences] = await db.select()
        .from(notificationPreferences)
        .where(and(
          eq(notificationPreferences.householdId, input.householdId),
          eq(notificationPreferences.memberId, input.memberId),
        ))
        .limit(1);

      const reminderDays = preferences?.taskDueReminderDays ?? 1;
      if (preferences?.enableTaskDue === false) return { created: 0, skipped: "disabled" as const };
      if (isWithinDndWindow(preferences?.dndStartTime ?? null, preferences?.dndEndTime ?? null)) {
        return { created: 0, skipped: "quiet-hours" as const };
      }

      const household = await getHouseholdById(input.householdId);
      const language = (["de", "en", "es", "fr", "tr", "zh", "ar"].includes(household?.language ?? "de")
        ? household?.language
        : "de") as NotificationLanguage;
      const tasks = await getTasks(input.householdId);
      let created = 0;

      for (const task of tasks) {
        if (task.isCompleted || !task.dueDate) continue;
        const assignedTo = Array.isArray(task.assignedTo) ? task.assignedTo : [];
        if (!assignedTo.includes(input.memberId)) continue;

        const dueDate = new Date(task.dueDate);
        const daysUntilDue = getDaysUntilDue(dueDate);
        if (daysUntilDue < 0 || daysUntilDue > reminderDays) continue;

        const dateKey = `${dueDate.getFullYear()}-${String(dueDate.getMonth() + 1).padStart(2, "0")}-${String(dueDate.getDate()).padStart(2, "0")}`;
        const dedupeKey = `task-due:${task.id}:${dateKey}`;
        const before = await db.select({ id: notifications.id })
          .from(notifications)
          .where(and(
            eq(notifications.householdId, input.householdId),
            eq(notifications.memberId, input.memberId),
            eq(notifications.dedupeKey, dedupeKey),
          ))
          .limit(1);
        if (before.length > 0) continue;

        await notifyTaskDue(
          input.householdId,
          input.memberId,
          task.id,
          task.name,
          daysUntilDue,
          Boolean(task.repeatInterval && task.repeatUnit),
          language,
          dedupeKey,
        );
        created += 1;
      }

      return { created, skipped: null };
    }),
});
