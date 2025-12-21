import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import {
  getShoppingItems,
  createShoppingItem,
  updateShoppingItem,
  deleteShoppingItem,
  createActivityLog,
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
        category: z.enum(["Lebensmittel", "Haushalt", "Pflege", "Sonstiges"]),
        quantity: z.string().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const itemId = await createShoppingItem({
        householdId: input.householdId,
        name: input.name,
        category: input.category,
        quantity: input.quantity,
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
        category: z.enum(["Lebensmittel", "Haushalt", "Pflege", "Sonstiges"]).optional(),
        quantity: z.string().optional(),
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
});
