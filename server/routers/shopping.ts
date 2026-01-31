import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import {
  getShoppingItems,
  createShoppingItem,
  updateShoppingItem,
  deleteShoppingItem,
  getShoppingCategories,
  createShoppingCategory,
  updateShoppingCategory,
  deleteShoppingCategory,
  createActivityLog,
  linkItemsToTask,
  unlinkItemsFromTask,
} from "../db";

export const shoppingRouter = router({
  // Get all shopping items for a household
  list: publicProcedure
    .input(z.object({ householdId: z.number() }))
    .query(async ({ input }) => {
      return await getShoppingItems(input.householdId);
    }),

  // Add new shopping item
  add: publicProcedure
    .input(
      z.object({
        householdId: z.number(),
        memberId: z.number(),
        name: z.string().min(1),
        categoryId: z.number(),
        details: z.string().optional(),
        photoUrls: z.array(z.string()).optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const itemId = await createShoppingItem({
        householdId: input.householdId,
        name: input.name,
        categoryId: input.categoryId,
        details: input.details,
        photoUrls: input.photoUrls,
        notes: input.notes,
        addedBy: input.memberId,
      });

      // Log activity
      await createActivityLog({
        householdId: input.householdId,
        memberId: input.memberId,
        activityType: "shopping",
        action: "added",
        description: `Added shopping item: ${input.name}`,
        relatedItemId: itemId,
      });

      return { itemId };
    }),

  // Update shopping item
  update: publicProcedure
    .input(
      z.object({
        itemId: z.number(),
        householdId: z.number(),
        memberId: z.number(),
        name: z.string().optional(),
        categoryId: z.number().optional(),
        details: z.string().optional(),
        photoUrls: z.array(z.string()).optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { itemId, householdId, memberId, ...updates } = input;
      
      await updateShoppingItem(itemId, updates);

      await createActivityLog({
        householdId,
        memberId,
        activityType: "shopping",
        action: "updated",
        description: `Updated shopping item`,
        relatedItemId: itemId,
      });

      return { success: true };
    }),

  // Toggle item completion
  toggleComplete: publicProcedure
    .input(
      z.object({
        itemId: z.number(),
        householdId: z.number(),
        memberId: z.number(),
        isCompleted: z.boolean(),
      })
    )
    .mutation(async ({ input }) => {
      await updateShoppingItem(input.itemId, {
        isCompleted: input.isCompleted,
        completedBy: input.isCompleted ? input.memberId : null,
        completedAt: input.isCompleted ? new Date() : null,
      });

      // Activity log removed - only log when completing shopping via dialog

      return { success: true };
    }),

  // Delete shopping item
  delete: publicProcedure
    .input(
      z.object({
        itemId: z.number(),
        householdId: z.number(),
        memberId: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      await deleteShoppingItem(input.itemId);

      await createActivityLog({
        householdId: input.householdId,
        memberId: input.memberId,
        activityType: "shopping",
        action: "deleted",
        description: `Deleted shopping item`,
        relatedItemId: input.itemId,
      });

      return { success: true };
    }),

  // Complete shopping with comment and photos
  completeShopping: publicProcedure
    .input(
      z.object({
        householdId: z.number(),
        memberId: z.number(),
        itemIds: z.array(z.number()),
        comment: z.string().optional(),
        photoUrls: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ input }) => {
      // Get item names for description
      const items = await getShoppingItems(input.householdId);
      const completedItemNames = items
        .filter((item) => input.itemIds.includes(item.id))
        .map((item) => item.name);

      // Delete completed items
      for (const itemId of input.itemIds) {
        await deleteShoppingItem(itemId);
      }

      // Create single activity log entry for entire shopping
      const description = `Einkauf abgeschlossen: ${completedItemNames.join(", ")}`;
      await createActivityLog({
        householdId: input.householdId,
        memberId: input.memberId,
        activityType: "shopping",
        action: "completed_batch",
        description,
        comment: input.comment,
        photoUrls: input.photoUrls,
        metadata: {
          itemCount: input.itemIds.length,
          items: completedItemNames,
        },
      });

      return { success: true };
    }),

  // Category management
  listCategories: publicProcedure
    .input(z.object({ householdId: z.number() }))
    .query(async ({ input }) => {
      return await getShoppingCategories(input.householdId);
    }),

  createCategory: publicProcedure
    .input(
      z.object({
        householdId: z.number(),
        memberId: z.number(),
        name: z.string().min(1),
        color: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const categoryId = await createShoppingCategory({
        householdId: input.householdId,
        name: input.name,
        color: input.color,
      });

      await createActivityLog({
        householdId: input.householdId,
        memberId: input.memberId,
        activityType: "shopping",
        action: "added",
        description: `Created shopping category: ${input.name}`,
      });

      return { categoryId };
    }),

  renameCategory: publicProcedure
    .input(
      z.object({
        categoryId: z.number(),
        householdId: z.number(),
        memberId: z.number(),
        name: z.string().min(1),
        color: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
      })
    )
    .mutation(async ({ input }) => {
      await updateShoppingCategory(input.categoryId, { 
        name: input.name,
        color: input.color,
      });

      await createActivityLog({
        householdId: input.householdId,
        memberId: input.memberId,
        activityType: "shopping",
        action: "updated",
        description: `Renamed shopping category to: ${input.name}`,
      });

      return { success: true };
    }),

  deleteCategory: publicProcedure
    .input(
      z.object({
        categoryId: z.number(),
        householdId: z.number(),
        memberId: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      await deleteShoppingCategory(input.categoryId);

      await createActivityLog({
        householdId: input.householdId,
        memberId: input.memberId,
        activityType: "shopping",
        action: "deleted",
        description: `Deleted shopping category`,
      });

      return { success: true };
    }),

  // Link shopping items to a task
  linkItemsToTask: publicProcedure
    .input(
      z.object({
        itemIds: z.array(z.number()),
        taskId: z.number(),
        householdId: z.number(),
        memberId: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      await linkItemsToTask(input.itemIds, input.taskId);

      await createActivityLog({
        householdId: input.householdId,
        memberId: input.memberId,
        activityType: "shopping",
        action: "linked",
        description: `Linked ${input.itemIds.length} shopping items to task`,
      });

      return { success: true };
    }),

  // Unlink shopping items from a task
  unlinkItemsFromTask: publicProcedure
    .input(
      z.object({
        itemIds: z.array(z.number()),
        householdId: z.number(),
        memberId: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      await unlinkItemsFromTask(input.itemIds);

      await createActivityLog({
        householdId: input.householdId,
        memberId: input.memberId,
        activityType: "shopping",
        action: "unlinked",
        description: `Unlinked ${input.itemIds.length} shopping items from task`,
      });

      return { success: true };
    }),
});
