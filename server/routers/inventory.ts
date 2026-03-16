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
} from "../db";
import { getDb } from "../db";
import { households } from "../../drizzle/schema";
import { inArray } from "drizzle-orm";

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
      return await addInventoryItem(input);
    }),

  update: protectedProcedure
    .input(
      z.object({
        itemId: z.number(),
        name: z.string().optional(),
        details: z.string().optional(),
        categoryId: z.number().optional(),
        photoUrls: z.array(z.object({ url: z.string(), filename: z.string() })).optional(),
        ownershipType: z.enum(["personal", "household"]).optional(),
        ownerIds: z.array(z.number()).optional(),
      })
    )
    .mutation(async ({ input }) => {
      return await updateInventoryItem(input);
    }),

  delete: protectedProcedure
    .input(z.object({ itemId: z.number() }))
    .mutation(async ({ input }) => {
      return await deleteInventoryItem(input.itemId);
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
      const rows = await db.select({ id: households.id, name: households.name })
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
