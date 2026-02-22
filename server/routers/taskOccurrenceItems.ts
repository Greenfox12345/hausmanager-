import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { taskOccurrenceItems, inventoryItems, tasks } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";

/**
 * Task Occurrence Items Router
 * Manages inventory items linked to specific task occurrences
 */
export const taskOccurrenceItemsRouter = router({
  /**
   * Get all items for a specific task (grouped by occurrence)
   */
  getTaskOccurrenceItems: protectedProcedure
    .input(
      z.object({
        taskId: z.number(),
      })
    )
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database connection failed" });

      // Get all items for this task with inventory item details
      const items = await db
        .select({
          id: taskOccurrenceItems.id,
          taskId: taskOccurrenceItems.taskId,
          occurrenceNumber: taskOccurrenceItems.occurrenceNumber,
          inventoryItemId: taskOccurrenceItems.inventoryItemId,
          borrowStartDate: taskOccurrenceItems.borrowStartDate,
          borrowEndDate: taskOccurrenceItems.borrowEndDate,
          borrowStatus: taskOccurrenceItems.borrowStatus,
          borrowRequestId: taskOccurrenceItems.borrowRequestId,
          notes: taskOccurrenceItems.notes,
          createdAt: taskOccurrenceItems.createdAt,
          updatedAt: taskOccurrenceItems.updatedAt,
          // Inventory item details
          itemName: inventoryItems.name,
          itemDetails: inventoryItems.details,
          itemPhotoUrls: inventoryItems.photoUrls,
          itemCategoryId: inventoryItems.categoryId,
        })
        .from(taskOccurrenceItems)
        .leftJoin(inventoryItems, eq(taskOccurrenceItems.inventoryItemId, inventoryItems.id))
        .where(eq(taskOccurrenceItems.taskId, input.taskId))
        .orderBy(taskOccurrenceItems.occurrenceNumber);

      return items;
    }),

  /**
   * Add an item to a specific task occurrence
   */
  addItemToOccurrence: protectedProcedure
    .input(
      z.object({
        taskId: z.number(),
        occurrenceNumber: z.number(),
        inventoryItemId: z.number(),
        borrowStartDate: z.string().optional(), // ISO date string
        borrowEndDate: z.string().optional(), // ISO date string
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database connection failed" });

      // Verify task exists and user has access
      const [task] = await db
        .select()
        .from(tasks)
        .where(eq(tasks.id, input.taskId))
        .limit(1);

      if (!task) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Task not found" });
      }

      // Verify inventory item exists
      const [item] = await db
        .select()
        .from(inventoryItems)
        .where(eq(inventoryItems.id, input.inventoryItemId))
        .limit(1);

      if (!item) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Inventory item not found" });
      }

      // Check if item is already added to this occurrence
      const [existing] = await db
        .select()
        .from(taskOccurrenceItems)
        .where(
          and(
            eq(taskOccurrenceItems.taskId, input.taskId),
            eq(taskOccurrenceItems.occurrenceNumber, input.occurrenceNumber),
            eq(taskOccurrenceItems.inventoryItemId, input.inventoryItemId)
          )
        )
        .limit(1);

      if (existing) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Item already added to this occurrence" });
      }

      // Add item to occurrence
      const [result] = await db.insert(taskOccurrenceItems).values({
        taskId: input.taskId,
        occurrenceNumber: input.occurrenceNumber,
        inventoryItemId: input.inventoryItemId,
        borrowStartDate: input.borrowStartDate ? new Date(input.borrowStartDate) : null,
        borrowEndDate: input.borrowEndDate ? new Date(input.borrowEndDate) : null,
        borrowStatus: "pending",
        notes: input.notes || null,
      });

      return {
        success: true,
        itemId: result.insertId,
        message: "Item erfolgreich hinzugefügt",
      };
    }),

  /**
   * Remove an item from a task occurrence
   */
  removeItemFromOccurrence: protectedProcedure
    .input(
      z.object({
        itemId: z.number(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database connection failed" });

      // Delete the item
      await db.delete(taskOccurrenceItems).where(eq(taskOccurrenceItems.id, input.itemId));

      return {
        success: true,
        message: "Item erfolgreich entfernt",
      };
    }),

  /**
   * Update borrow details for an occurrence item
   */
  updateOccurrenceItemBorrow: protectedProcedure
    .input(
      z.object({
        itemId: z.number(),
        borrowStartDate: z.string().optional(),
        borrowEndDate: z.string().optional(),
        borrowStatus: z.enum(["pending", "borrowed", "returned", "overdue"]).optional(),
        borrowRequestId: z.number().optional().nullable(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database connection failed" });

      // Build update object
      const updateData: any = {};
      if (input.borrowStartDate !== undefined) {
        updateData.borrowStartDate = input.borrowStartDate ? new Date(input.borrowStartDate) : null;
      }
      if (input.borrowEndDate !== undefined) {
        updateData.borrowEndDate = input.borrowEndDate ? new Date(input.borrowEndDate) : null;
      }
      if (input.borrowStatus !== undefined) {
        updateData.borrowStatus = input.borrowStatus;
      }
      if (input.borrowRequestId !== undefined) {
        updateData.borrowRequestId = input.borrowRequestId;
      }
      if (input.notes !== undefined) {
        updateData.notes = input.notes;
      }

      // Update the item
      await db
        .update(taskOccurrenceItems)
        .set(updateData)
        .where(eq(taskOccurrenceItems.id, input.itemId));

      return {
        success: true,
        message: "Ausleih-Details aktualisiert",
      };
    }),
});
