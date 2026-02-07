import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import {
  getCalendarEventsByHousehold,
  getBorrowRequestById,
  getInventoryItemById,
} from "../db";

export const calendarRouter = router({
  // Get all calendar events for a household
  getEvents: publicProcedure
    .input(
      z.object({
        householdId: z.number(),
        eventType: z.enum(["all", "task", "borrow_start", "borrow_return", "reminder", "other"]).optional(),
      })
    )
    .query(async ({ input }) => {
      const events = await getCalendarEventsByHousehold(input.householdId);
      
      // Filter by event type if specified
      const filteredEvents = input.eventType && input.eventType !== "all"
        ? events.filter(e => e.eventType === input.eventType)
        : events;

      // Enrich events with related data
      const enrichedEvents = await Promise.all(
        filteredEvents.map(async (event) => {
          let relatedData = null;

          if (event.relatedBorrowId) {
            const borrowRequest = await getBorrowRequestById(event.relatedBorrowId);
            if (borrowRequest) {
              const item = await getInventoryItemById(borrowRequest.inventoryItemId);
              relatedData = {
                borrowRequest,
                item,
              };
            }
          }

          return {
            ...event,
            relatedData,
          };
        })
      );

      return enrichedEvents;
    }),
});
