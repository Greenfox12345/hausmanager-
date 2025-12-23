import { z } from "zod";
import { eq, and, desc } from "drizzle-orm";
import { publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { notifications, notificationSettings } from "../../drizzle/schema";

export const notificationsRouter = router({
  // Get notifications for a member
  getNotifications: publicProcedure
    .input(
      z.object({
        memberId: z.number(),
        householdId: z.number(),
        unreadOnly: z.boolean().optional(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      let query = db
        .select()
        .from(notifications)
        .where(
          and(
            eq(notifications.memberId, input.memberId),
            eq(notifications.householdId, input.householdId)
          )
        )
        .orderBy(desc(notifications.createdAt));

      const results = await query;

      if (input.unreadOnly) {
        return results.filter((n) => !n.isRead);
      }

      return results;
    }),

  // Get unread count
  getUnreadCount: publicProcedure
    .input(
      z.object({
        memberId: z.number(),
        householdId: z.number(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const results = await db
        .select()
        .from(notifications)
        .where(
          and(
            eq(notifications.memberId, input.memberId),
            eq(notifications.householdId, input.householdId),
            eq(notifications.isRead, false)
          )
        );

      return { count: results.length };
    }),

  // Mark notification as read
  markAsRead: publicProcedure
    .input(z.object({ notificationId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await db
        .update(notifications)
        .set({
          isRead: true,
          readAt: new Date(),
        })
        .where(eq(notifications.id, input.notificationId));

      return { success: true };
    }),

  // Mark all as read
  markAllAsRead: publicProcedure
    .input(
      z.object({
        memberId: z.number(),
        householdId: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await db
        .update(notifications)
        .set({
          isRead: true,
          readAt: new Date(),
        })
        .where(
          and(
            eq(notifications.memberId, input.memberId),
            eq(notifications.householdId, input.householdId),
            eq(notifications.isRead, false)
          )
        );

      return { success: true };
    }),

  // Delete notification
  deleteNotification: publicProcedure
    .input(z.object({ notificationId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await db
        .delete(notifications)
        .where(eq(notifications.id, input.notificationId));

      return { success: true };
    }),

  // Get notification settings
  getSettings: publicProcedure
    .input(z.object({ memberId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const settings = await db
        .select()
        .from(notificationSettings)
        .where(eq(notificationSettings.memberId, input.memberId))
        .limit(1);

      // Return default settings if none exist
      if (!settings[0]) {
        return {
          taskAssigned: true,
          taskCompleted: true,
          taskDueSoon: true,
          taskOverdue: true,
          editProposal: true,
          dependencyProposal: true,
          proposalApproved: true,
          proposalRejected: true,
          projectUpdate: true,
        };
      }

      return settings[0];
    }),

  // Update notification settings
  updateSettings: publicProcedure
    .input(
      z.object({
        memberId: z.number(),
        taskAssigned: z.boolean().optional(),
        taskCompleted: z.boolean().optional(),
        taskDueSoon: z.boolean().optional(),
        taskOverdue: z.boolean().optional(),
        editProposal: z.boolean().optional(),
        dependencyProposal: z.boolean().optional(),
        proposalApproved: z.boolean().optional(),
        proposalRejected: z.boolean().optional(),
        projectUpdate: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const { memberId, ...settings } = input;

      // Check if settings exist
      const existing = await db
        .select()
        .from(notificationSettings)
        .where(eq(notificationSettings.memberId, memberId))
        .limit(1);

      if (existing[0]) {
        // Update existing settings
        await db
          .update(notificationSettings)
          .set(settings)
          .where(eq(notificationSettings.memberId, memberId));
      } else {
        // Create new settings
        await db.insert(notificationSettings).values({
          memberId,
          ...settings,
        });
      }

      return { success: true };
    }),
});
