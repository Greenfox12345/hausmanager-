import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  getInventoryItems,
  getInventoryItemById,
  addInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
} from "../db";

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
        photoUrls: z.array(z.string()).optional(),
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
        photoUrls: z.array(z.string()).optional(),
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
});
