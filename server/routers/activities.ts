import { router, publicProcedure } from "../_core/trpc";
import { z } from "zod";
import { getActivityHistory, getActivityHistoryByTaskId } from "../db";

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
});
