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
  addInventoryItem,
  getHouseholdById,
} from "../db";
import {
  shoppingItemAdded,
  shoppingItemUpdated,
  shoppingItemDeleted,
  shoppingBatchCompleted,
  shoppingCategoryAdded,
  shoppingCategoryUpdated,
  shoppingCategoryDeleted,
  shoppingTaskLinked,
  shoppingTaskUnlinked,
} from "../activityTexts";

type Lang = "de" | "en" | "es" | "fr" | "zh" | "tr";

async function getHouseholdLang(householdId: number): Promise<Lang> {
  const hh = await getHouseholdById(householdId);
  const l = hh?.language ?? "de";
  return (l === "en" || l === "es" || l === "fr" || l === "zh" || l === "tr") ? (l as Lang) : "de";
}

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
        photoUrls: z.array(z.object({ url: z.string(), filename: z.string() })).optional(),
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

      const lang = await getHouseholdLang(input.householdId);
      await createActivityLog({
        householdId: input.householdId,
        memberId: input.memberId,
        activityType: "shopping",
        action: "added",
        description: shoppingItemAdded(lang, input.name),
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
        photoUrls: z.array(z.object({ url: z.string(), filename: z.string() })).optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { itemId, householdId, memberId, ...updates } = input;

      // Fetch current item name for a meaningful log entry
      const items = await getShoppingItems(householdId);
      const item = items.find((i) => i.id === itemId);
      const itemName = item?.name ?? String(itemId);

      await updateShoppingItem(itemId, updates);

      const lang = await getHouseholdLang(householdId);
      await createActivityLog({
        householdId,
        memberId,
        activityType: "shopping",
        action: "updated",
        description: shoppingItemUpdated(lang, itemName),
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
        itemName: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      // Fetch item name before deletion
      const items = await getShoppingItems(input.householdId);
      const item = items.find((i) => i.id === input.itemId);
      const itemName = input.itemName ?? item?.name ?? String(input.itemId);

      await deleteShoppingItem(input.itemId);

      const lang = await getHouseholdLang(input.householdId);
      await createActivityLog({
        householdId: input.householdId,
        memberId: input.memberId,
        activityType: "shopping",
        action: "deleted",
        description: shoppingItemDeleted(lang, itemName),
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
        photoUrls: z.array(z.object({ url: z.string(), filename: z.string() })).optional(),
        itemsToInventory: z.array(z.object({
          itemId: z.number(),
          name: z.string(),
          categoryId: z.number(),
          details: z.string().optional(),
          photoUrls: z.array(z.object({ url: z.string(), filename: z.string() })).optional(),
          ownershipType: z.enum(["personal", "household"]),
          ownerIds: z.array(z.number()).optional(),
        })).optional(),
      })
    )
    .mutation(async ({ input }) => {
      // Get item names for description
      const items = await getShoppingItems(input.householdId);
      const completedItemNames = items
        .filter((item) => input.itemIds.includes(item.id))
        .map((item) => item.name);

      // Transfer items to inventory if requested
      if (input.itemsToInventory && input.itemsToInventory.length > 0) {
        for (const invItem of input.itemsToInventory) {
          await addInventoryItem({
            householdId: input.householdId,
            memberId: input.memberId,
            name: invItem.name,
            categoryId: invItem.categoryId,
            details: invItem.details,
            photoUrls: invItem.photoUrls,
            ownershipType: invItem.ownershipType,
            ownerIds: invItem.ownerIds,
          });
        }
      }

      // Delete completed items
      for (const itemId of input.itemIds) {
        await deleteShoppingItem(itemId);
      }

      const lang = await getHouseholdLang(input.householdId);
      const description = shoppingBatchCompleted(lang, input.itemIds.length);

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
          inventoryCount: input.itemsToInventory?.length || 0,
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

      const lang = await getHouseholdLang(input.householdId);
      await createActivityLog({
        householdId: input.householdId,
        memberId: input.memberId,
        activityType: "shopping",
        action: "added",
        description: shoppingCategoryAdded(lang, input.name),
      });

      return { categoryId };
    }),

  renameCategory: publicProcedure
    .input(
      z.object({
        categoryId: z.number(),
        householdId: z.number(),
        memberId: z.number(),
        oldName: z.string().optional(),
        name: z.string().min(1),
        color: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
      })
    )
    .mutation(async ({ input }) => {
      // Fetch old name if not provided
      let oldName = input.oldName;
      if (!oldName) {
        const cats = await getShoppingCategories(input.householdId);
        oldName = cats.find((c) => c.id === input.categoryId)?.name ?? String(input.categoryId);
      }

      await updateShoppingCategory(input.categoryId, {
        name: input.name,
        color: input.color,
      });

      const lang = await getHouseholdLang(input.householdId);
      await createActivityLog({
        householdId: input.householdId,
        memberId: input.memberId,
        activityType: "shopping",
        action: "updated",
        description: shoppingCategoryUpdated(lang, oldName, input.name),
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
      // Fetch category name before deletion
      const cats = await getShoppingCategories(input.householdId);
      const cat = cats.find((c) => c.id === input.categoryId);
      const catName = cat?.name ?? String(input.categoryId);

      await deleteShoppingCategory(input.categoryId);

      const lang = await getHouseholdLang(input.householdId);
      await createActivityLog({
        householdId: input.householdId,
        memberId: input.memberId,
        activityType: "shopping",
        action: "deleted",
        description: shoppingCategoryDeleted(lang, catName),
      });

      return { success: true };
    }),

  // Link shopping items to a task
  linkItemsToTask: publicProcedure
    .input(
      z.object({
        itemIds: z.array(z.number()),
        taskId: z.number(),
        taskName: z.string().optional(),
        householdId: z.number(),
        memberId: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      await linkItemsToTask(input.itemIds, input.taskId);

      const lang = await getHouseholdLang(input.householdId);
      const taskName = input.taskName ?? `#${input.taskId}`;
      const items = await getShoppingItems(input.householdId);
      const linkedNames = items.filter((i) => input.itemIds.includes(i.id)).map((i) => i.name);
      const itemLabel = linkedNames.length > 0 ? linkedNames.join(", ") : `${input.itemIds.length}`;

      await createActivityLog({
        householdId: input.householdId,
        memberId: input.memberId,
        activityType: "shopping",
        action: "linked",
        description: shoppingTaskLinked(lang, itemLabel, taskName),
      });

      return { success: true };
    }),

  // Unlink shopping items from a task
  unlinkItemsFromTask: publicProcedure
    .input(
      z.object({
        itemIds: z.array(z.number()),
        taskName: z.string().optional(),
        householdId: z.number(),
        memberId: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      await unlinkItemsFromTask(input.itemIds);

      const lang = await getHouseholdLang(input.householdId);
      const taskName = input.taskName ?? "–";
      const items = await getShoppingItems(input.householdId);
      const unlinkedNames = items.filter((i) => input.itemIds.includes(i.id)).map((i) => i.name);
      const itemLabel = unlinkedNames.length > 0 ? unlinkedNames.join(", ") : `${input.itemIds.length}`;

      await createActivityLog({
        householdId: input.householdId,
        memberId: input.memberId,
        activityType: "shopping",
        action: "unlinked",
        description: shoppingTaskUnlinked(lang, itemLabel, taskName),
      });

      return { success: true };
    }),

  // Get shopping items linked to a specific task
  getLinkedItems: publicProcedure
    .input(z.object({ taskId: z.number() }))
    .query(async ({ input }) => {
      const { getLinkedShoppingItems } = await import("../db");
      return await getLinkedShoppingItems(input.taskId);
    }),
});
