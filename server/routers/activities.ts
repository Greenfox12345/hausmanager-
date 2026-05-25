import { router, publicProcedure } from "../_core/trpc";
import { z } from "zod";
import { getActivityHistory, getActivityHistoryByTaskId, getDb } from "../db";
import { activityHistory } from "../../drizzle/schema";
import { and, eq } from "drizzle-orm";

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
