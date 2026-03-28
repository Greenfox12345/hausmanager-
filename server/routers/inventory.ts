import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  getInventoryItems,
  getInventoryItemById,
  addInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
  getSharedInventoryItems,
  setInventoryItemVisibility,
  getInventoryItemAllowedHouseholds,
  getConnectedHouseholdIds,
  createActivityLog,
  getHouseholdById,
  getHouseholdMemberById,
} from "../db";
import { getDb } from "../db";
import { households } from "../../drizzle/schema";
import { inArray } from "drizzle-orm";
import {
  inventoryItemAdded,
  inventoryItemUpdated,
  inventoryItemDeleted,
} from "../activityTexts";

type Lang = "de" | "en" | "es" | "fr" | "zh" | "tr" | "ar";

async function getHouseholdLang(householdId: number): Promise<Lang> {
  const hh = await getHouseholdById(householdId);
  const l = hh?.language ?? "de";
  return (l === "en" || l === "es" || l === "fr" || l === "zh" || l === "tr" || l === "ar") ? (l as Lang) : "de";
}

export const inventoryRouter = router({
  list: protectedProcedure
    .input(z.object({ householdId: z.number() }))
    .query(async ({ input }) => {
      return await getInventoryItems(input.householdId);
    }),

  getById: protectedProcedure
    .input(z.object({ itemId: z.number() }))
    .query(async ({ input }) => {
      return await getInventoryItemById(input.itemId);
    }),

  add: protectedProcedure
    .input(
      z.object({
        householdId: z.number(),
        memberId: z.number(),
        name: z.string(),
        details: z.string().optional(),
        categoryId: z.number(),
        photoUrls: z.array(z.object({ url: z.string(), filename: z.string() })).optional(),
        ownershipType: z.enum(["personal", "household"]),
        ownerIds: z.array(z.number()).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const result = await addInventoryItem(input);

      // Fetch member name and household language for the log entry
      const [member, lang] = await Promise.all([
        getHouseholdMemberById(input.memberId),
        getHouseholdLang(input.householdId),
      ]);
      const memberName = member?.memberName ?? "Unbekannt";

      // Fetch category name for a more detailed log entry
      const item = await getInventoryItemById(result.id);
      const categoryName = item?.categoryName ?? undefined;

      await createActivityLog({
        householdId: input.householdId,
        memberId: input.memberId,
        activityType: "inventory",
        action: "added",
        description: inventoryItemAdded(lang, input.name, categoryName),
        relatedItemId: result.id,
      });

      return result;
    }),

  update: protectedProcedure
    .input(
      z.object({
        itemId: z.number(),
        householdId: z.number(),
        memberId: z.number(),
        name: z.string().optional(),
        details: z.string().optional(),
        categoryId: z.number().optional(),
        photoUrls: z.array(z.object({ url: z.string(), filename: z.string() })).optional(),
        ownershipType: z.enum(["personal", "household"]).optional(),
        ownerIds: z.array(z.number()).optional(),
        visibility: z.enum(["private", "connected", "selected"]).optional(),
        allowedHouseholdIds: z.array(z.number()).optional(),
      })
    )
    .mutation(async ({ input }) => {
      // Fetch item before update for name and change tracking
      const existingItem = await getInventoryItemById(input.itemId);
      const itemName = existingItem?.name ?? String(input.itemId);

      const result = await updateInventoryItem(input);

      // Update visibility atomically in the same mutation to avoid race conditions
      if (input.visibility !== undefined) {
        await setInventoryItemVisibility({
          itemId: input.itemId,
          visibility: input.visibility,
          allowedHouseholdIds:
            input.visibility === "selected" ? (input.allowedHouseholdIds ?? []) : [],
        });
      }

      // Build change summary
      const changeParts: string[] = [];
      if (input.name && input.name !== existingItem?.name) changeParts.push(`Name: „${existingItem?.name}" → „${input.name}"`);
      if (input.details !== undefined) changeParts.push("Beschreibung aktualisiert");
      if (input.categoryId !== undefined && input.categoryId !== existingItem?.categoryId) changeParts.push("Kategorie geändert");
      if (input.ownershipType !== undefined && input.ownershipType !== existingItem?.ownershipType) changeParts.push(`Eigentum: ${input.ownershipType}`);
      if (input.visibility !== undefined) changeParts.push(`Sichtbarkeit: ${input.visibility}`);
      if (input.photoUrls !== undefined) changeParts.push("Fotos aktualisiert");
      const changes = changeParts.length > 0 ? changeParts.join(", ") : undefined;

      const [member, lang] = await Promise.all([
        getHouseholdMemberById(input.memberId),
        getHouseholdLang(input.householdId),
      ]);
      const memberName = member?.memberName ?? "Unbekannt";

      await createActivityLog({
        householdId: input.householdId,
        memberId: input.memberId,
        activityType: "inventory",
        action: "updated",
        description: inventoryItemUpdated(lang, itemName, changes),
        relatedItemId: input.itemId,
      });

      return result;
    }),

  delete: protectedProcedure
    .input(
      z.object({
        itemId: z.number(),
        householdId: z.number(),
        memberId: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      // Fetch item before deletion for name
      const existingItem = await getInventoryItemById(input.itemId);
      const itemName = existingItem?.name ?? String(input.itemId);

      const result = await deleteInventoryItem(input.itemId);

      const [member, lang] = await Promise.all([
        getHouseholdMemberById(input.memberId),
        getHouseholdLang(input.householdId),
      ]);
      const memberName = member?.memberName ?? "Unbekannt";

      await createActivityLog({
        householdId: input.householdId,
        memberId: input.memberId,
        activityType: "inventory",
        action: "deleted",
        description: inventoryItemDeleted(lang, itemName),
        relatedItemId: input.itemId,
      });

      return result;
    }),

  /**
   * Get items shared by connected households that are visible to the requesting household
   */
  listShared: protectedProcedure
    .input(z.object({ householdId: z.number() }))
    .query(async ({ input }) => {
      return await getSharedInventoryItems(input.householdId);
    }),

  /**
   * Set visibility of an inventory item (private / connected / selected)
   */
  setVisibility: protectedProcedure
    .input(
      z.object({
        itemId: z.number(),
        visibility: z.enum(["private", "connected", "selected"]),
        allowedHouseholdIds: z.array(z.number()).optional(),
      })
    )
    .mutation(async ({ input }) => {
      return await setInventoryItemVisibility(input);
    }),

  /**
   * Get the allowed household IDs for a specific item (for 'selected' visibility)
   */
  getAllowedHouseholds: protectedProcedure
    .input(z.object({ itemId: z.number() }))
    .query(async ({ input }) => {
      return await getInventoryItemAllowedHouseholds(input.itemId);
    }),

  /**
   * Get connected households (accepted connections) for the current household
   * Returns household id + name for use in visibility selection UI
   */
  getConnectedHouseholds: protectedProcedure
    .input(z.object({ householdId: z.number() }))
    .query(async ({ input }) => {
      const connectedIds = await getConnectedHouseholdIds(input.householdId);
      if (connectedIds.length === 0) return [];
      const db = await getDb();
      if (!db) return [];
      const rows = await db
        .select({ id: households.id, name: households.name })
        .from(households)
        .where(inArray(households.id, connectedIds));
      return rows;
    }),

  /**
   * Get all items visible to a household (own + shared), grouped by household.
   * Used in task item selection dialogs.
   */
  listAll: protectedProcedure
    .input(z.object({ householdId: z.number() }))
    .query(async ({ input }) => {
      const [ownItems, sharedItems] = await Promise.all([
        getInventoryItems(input.householdId),
        getSharedInventoryItems(input.householdId),
      ]);
      return {
        own: ownItems,
        shared: sharedItems,
      };
    }),
});
