import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import {
  getCalendarEventsByHousehold,
  getBorrowRequestById,
  getInventoryItemById,
  getCalendarEventById,
  createCalendarEvent,
  deleteCalendarEvent,
  createActivityLog,
  getHouseholdById,
} from "../db";
import {
  calendarEventCreated,
  calendarEventUpdated,
  calendarEventDeleted,
  calendarEventCompleted,
} from "../activityTexts";
import { calendarEvents, householdMembers } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { getDb } from "../db";
import { format } from "date-fns";

/** Resolve member name for a given householdMembers.id */
async function getMemberName(memberId: number): Promise<string> {
  const db = await getDb();
  if (!db) return "Unknown";
  const [m] = await db
    .select({ memberName: householdMembers.memberName })
    .from(householdMembers)
    .where(eq(householdMembers.id, memberId))
    .limit(1);
  return m?.memberName ?? "Unknown";
}

/** Format a Date for log messages */
function fmtDate(date: Date | string): string {
  try {
    return format(new Date(date), "dd.MM.yyyy");
  } catch {
    return String(date);
  }
}

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

  // Create a manual calendar event
  createEvent: protectedProcedure
    .input(
      z.object({
        householdId: z.number(),
        memberId: z.number(),
        title: z.string().min(1),
        description: z.string().optional(),
        startDate: z.string(), // ISO string
        endDate: z.string().optional(),
        eventType: z.enum(["task", "borrow_start", "borrow_return", "reminder", "other"]).default("other"),
        icon: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const eventId = await createCalendarEvent({
        householdId: input.householdId,
        title: input.title,
        description: input.description,
        startDate: new Date(input.startDate),
        endDate: input.endDate ? new Date(input.endDate) : undefined,
        eventType: input.eventType,
        icon: input.icon,
        createdBy: input.memberId,
      });

      // Activity log
      const household = await getHouseholdById(input.householdId);
      const lang = ((household?.language ?? "de") as "de" | "en" | "es" | "fr" | "zh" | "tr");
      const memberName = await getMemberName(input.memberId);
      await createActivityLog({
        householdId: input.householdId,
        memberId: input.memberId,
        activityType: "calendar",
        action: "calendarEventCreated",
        description: calendarEventCreated(lang, input.title, memberName, fmtDate(input.startDate)),
        relatedItemId: Number(eventId),
      });

      return { eventId: Number(eventId) };
    }),

  // Update a manual calendar event
  updateEvent: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        householdId: z.number(),
        memberId: z.number(),
        title: z.string().min(1).optional(),
        description: z.string().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        icon: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Fetch existing event for change tracking
      const existing = await getCalendarEventById(input.id);

      const { id, householdId, memberId, startDate, endDate, ...rest } = input;
      const updateData: Record<string, unknown> = { ...rest };
      if (startDate) updateData.startDate = new Date(startDate);
      if (endDate) updateData.endDate = new Date(endDate);

      await db.update(calendarEvents).set(updateData).where(eq(calendarEvents.id, id));

      // Build change summary
      const changeParts: string[] = [];
      if (input.title && existing && input.title !== existing.title) {
        changeParts.push(`Titel: „${existing.title}" → „${input.title}"`);
      }
      if (startDate && existing && fmtDate(startDate) !== fmtDate(existing.startDate)) {
        changeParts.push(`Datum: ${fmtDate(existing.startDate)} → ${fmtDate(startDate)}`);
      }
      if (input.description !== undefined && existing && input.description !== existing.description) {
        changeParts.push(`Beschreibung geändert`);
      }

      // Activity log
      const household = await getHouseholdById(householdId);
      const lang = ((household?.language ?? "de") as "de" | "en" | "es" | "fr" | "zh" | "tr");
      const memberName = await getMemberName(memberId);
      const eventTitle = input.title ?? existing?.title ?? `#${id}`;
      await createActivityLog({
        householdId,
        memberId,
        activityType: "calendar",
        action: "calendarEventUpdated",
        description: calendarEventUpdated(lang, eventTitle, memberName, changeParts.length > 0 ? changeParts.join(", ") : undefined),
        relatedItemId: id,
      });

      return { success: true };
    }),

  // Delete a manual calendar event
  deleteEvent: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        householdId: z.number(),
        memberId: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      // Fetch title before deletion
      const existing = await getCalendarEventById(input.id);
      const eventTitle = existing?.title ?? `#${input.id}`;

      await deleteCalendarEvent(input.id);

      // Activity log
      const household = await getHouseholdById(input.householdId);
      const lang = ((household?.language ?? "de") as "de" | "en" | "es" | "fr" | "zh" | "tr");
      const memberName = await getMemberName(input.memberId);
      await createActivityLog({
        householdId: input.householdId,
        memberId: input.memberId,
        activityType: "calendar",
        action: "calendarEventDeleted",
        description: calendarEventDeleted(lang, eventTitle, memberName),
      });

      return { success: true };
    }),

  // Mark a calendar event as completed
  completeEvent: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        householdId: z.number(),
        memberId: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await db.update(calendarEvents)
        .set({ isCompleted: true, completedAt: new Date() })
        .where(eq(calendarEvents.id, input.id));

      // Activity log
      const existing = await getCalendarEventById(input.id);
      const eventTitle = existing?.title ?? `#${input.id}`;
      const household = await getHouseholdById(input.householdId);
      const lang = ((household?.language ?? "de") as "de" | "en" | "es" | "fr" | "zh" | "tr");
      const memberName = await getMemberName(input.memberId);
      await createActivityLog({
        householdId: input.householdId,
        memberId: input.memberId,
        activityType: "calendar",
        action: "calendarEventCompleted",
        description: calendarEventCompleted(lang, eventTitle, memberName),
        relatedItemId: input.id,
      });

      return { success: true };
    }),
});
