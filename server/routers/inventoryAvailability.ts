import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { borrowRequests } from "../../drizzle/schema";
import { and, eq, or, lte, gte } from "drizzle-orm";
import { getDb } from "../db";

export const inventoryAvailabilityRouter = router({
  /**
   * Check if an inventory item is available for borrowing in a given time period
   * Returns availability status and conflicting borrow requests if any
   */
  checkItemAvailability: protectedProcedure
    .input(z.object({
      inventoryItemId: z.number(),
      startDate: z.date().optional(),
      endDate: z.date().optional(),
    }))
    .query(async ({ input }) => {
      const { inventoryItemId, startDate, endDate } = input;

      // If no dates provided, check current availability
      const checkStart = startDate || new Date();
      const checkEnd = endDate || new Date();

      // Find active or approved borrow requests that overlap with the requested period
      const db = getDb();
      const conflictingBorrows = await db
        .select()
        .from(borrowRequests)
        .where(
          and(
            eq(borrowRequests.inventoryItemId, inventoryItemId),
            // Status is active or approved
            or(
              eq(borrowRequests.status, "active"),
              eq(borrowRequests.status, "approved")
            ),
            // Date ranges overlap: (start1 <= end2) AND (end1 >= start2)
            lte(borrowRequests.startDate, checkEnd),
            gte(borrowRequests.endDate, checkStart)
          )
        );

      // Determine availability status
      let status: "available" | "borrowed" | "partially_available";
      
      if (conflictingBorrows.length === 0) {
        status = "available";
      } else {
        // Check if entire period is blocked
        const isFullyBlocked = conflictingBorrows.some(borrow => 
          borrow.startDate <= checkStart && borrow.endDate >= checkEnd
        );
        
        status = isFullyBlocked ? "borrowed" : "partially_available";
      }

      return {
        status,
        conflictingBorrows: conflictingBorrows.map(borrow => ({
          id: borrow.id,
          startDate: borrow.startDate,
          endDate: borrow.endDate,
          status: borrow.status,
          borrowerMemberId: borrow.borrowerMemberId,
        })),
      };
    }),
});
