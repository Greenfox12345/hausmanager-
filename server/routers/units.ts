import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { itemUnits } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";

/** Default units seeded for every new household */
export const DEFAULT_UNITS: Array<{ name: string; symbol: string; sortOrder: number }> = [
  { name: "Stück", symbol: "St.", sortOrder: 0 },
  { name: "Kilogramm", symbol: "kg", sortOrder: 1 },
  { name: "Gramm", symbol: "g", sortOrder: 2 },
  { name: "Meter", symbol: "m", sortOrder: 3 },
  { name: "Zentimeter", symbol: "cm", sortOrder: 4 },
];

export const unitsRouter = router({
  /** List all units for a household, ordered by sortOrder */
  list: publicProcedure
    .input(z.object({ householdId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      return db
        .select()
        .from(itemUnits)
        .where(eq(itemUnits.householdId, input.householdId))
        .orderBy(itemUnits.sortOrder, itemUnits.name);
    }),

  /** Seed default units for a household (idempotent – skips if already seeded) */
  seedDefaults: publicProcedure
    .input(z.object({ householdId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) return { seeded: 0 };

      const existing = await db
        .select({ id: itemUnits.id })
        .from(itemUnits)
        .where(eq(itemUnits.householdId, input.householdId));

      if (existing.length > 0) return { seeded: 0 };

      await db.insert(itemUnits).values(
        DEFAULT_UNITS.map((u) => ({
          householdId: input.householdId,
          name: u.name,
          symbol: u.symbol,
          sortOrder: u.sortOrder,
          isDefault: true,
        }))
      );

      return { seeded: DEFAULT_UNITS.length };
    }),

  /** Add a custom unit */
  add: publicProcedure
    .input(
      z.object({
        householdId: z.number(),
        name: z.string().min(1).max(50),
        symbol: z.string().max(10).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Determine next sortOrder
      const existing = await db
        .select({ sortOrder: itemUnits.sortOrder })
        .from(itemUnits)
        .where(eq(itemUnits.householdId, input.householdId))
        .orderBy(itemUnits.sortOrder);

      const maxSort = existing.length > 0
        ? Math.max(...existing.map((e) => e.sortOrder))
        : -1;

      const [result] = await db.insert(itemUnits).values({
        householdId: input.householdId,
        name: input.name,
        symbol: input.symbol ?? null,
        sortOrder: maxSort + 1,
        isDefault: false,
      });

      return { id: Number(result.insertId) };
    }),

  /** Update an existing unit */
  update: publicProcedure
    .input(
      z.object({
        id: z.number(),
        householdId: z.number(),
        name: z.string().min(1).max(50).optional(),
        symbol: z.string().max(10).nullable().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const updates: Record<string, any> = {};
      if (input.name !== undefined) updates.name = input.name;
      if (input.symbol !== undefined) updates.symbol = input.symbol;

      if (Object.keys(updates).length > 0) {
        await db
          .update(itemUnits)
          .set(updates)
          .where(
            and(
              eq(itemUnits.id, input.id),
              eq(itemUnits.householdId, input.householdId)
            )
          );
      }

      return { success: true };
    }),

  /** Delete a unit (only allowed if not in use – frontend should warn) */
  delete: publicProcedure
    .input(z.object({ id: z.number(), householdId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await db
        .delete(itemUnits)
        .where(
          and(
            eq(itemUnits.id, input.id),
            eq(itemUnits.householdId, input.householdId)
          )
        );

      return { success: true };
    }),
});
