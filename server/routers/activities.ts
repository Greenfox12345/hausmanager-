import { router, publicProcedure } from "../_core/trpc";
import { z } from "zod";
import { getActivityHistory, getActivityHistoryByTaskId, getDb } from "../db";
import { activityHistory, householdMembers } from "../../drizzle/schema";
import { and, desc, eq, gt, ne } from "drizzle-orm";
import { getActivityBaseline, normalizeReadThrough } from "../../shared/activityVisitRules";

export const activitiesRouter = router({
  // Get all activities for a household
  list: publicProcedure
    .input(z.object({ 
      householdId: z.number(),
      limit: z.number().optional().default(50)
    }))
    .query(async ({ input }) => {
      return await getActivityHistory(input.householdId, input.limit);
    }),

  // Get activities for a specific task
  getByTaskId: publicProcedure
    .input(z.object({
      taskId: z.number(),
      householdId: z.number()
    }))
    .query(async ({ input }) => {
      return await getActivityHistoryByTaskId(input.taskId, input.householdId);
    }),

  /**
   * Liefert Aktivitäten anderer Mitglieder seit dem letzten bestätigten Besuch.
   * Der readThrough-Zeitpunkt wird vor dem Laden festgelegt, damit parallel
   * entstehende Aktivitäten beim nächsten Besuch nicht verloren gehen.
   */
  getNewSinceLastVisit: publicProcedure
    .input(z.object({ householdId: z.number(), memberId: z.number(), limit: z.number().min(1).max(50).optional().default(20) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const [member] = await db.select()
        .from(householdMembers)
        .where(and(eq(householdMembers.id, input.memberId), eq(householdMembers.householdId, input.householdId)))
        .limit(1);
      if (!member) throw new Error("Household member not found");

      const readThrough = new Date();
      const since = getActivityBaseline(member.lastActivityViewedAt, member.createdAt);
      const activities = await db.select()
        .from(activityHistory)
        .where(and(
          eq(activityHistory.householdId, input.householdId),
          ne(activityHistory.memberId, input.memberId),
          gt(activityHistory.createdAt, since),
        ))
        .orderBy(desc(activityHistory.createdAt))
        .limit(input.limit);
      return { activities, since, readThrough };
    }),

  /** Besuch erst bestätigen, nachdem die Übersicht im Client angezeigt wurde. */
  markActivitiesViewed: publicProcedure
    .input(z.object({ householdId: z.number(), memberId: z.number(), readThrough: z.date() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const safeReadThrough = normalizeReadThrough(input.readThrough);
      await db.update(householdMembers)
        .set({ lastActivityViewedAt: safeReadThrough })
        .where(and(eq(householdMembers.id, input.memberId), eq(householdMembers.householdId, input.householdId)));
      return { success: true };
    }),

  // Delete a specific activity entry
  deleteById: publicProcedure
    .input(z.object({
      activityId: z.number(),
      householdId: z.number(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.delete(activityHistory).where(
        and(
          eq(activityHistory.id, input.activityId),
          eq(activityHistory.householdId, input.householdId)
        )
      );
      return { success: true };
    }),
});
