import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { itemUnits } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";

/** Localised default unit names per language code */
const DEFAULT_UNIT_NAMES: Record<string, Array<{ name: string; symbol: string; sortOrder: number }>> = {
  de: [
    { name: "Stück",      symbol: "St.", sortOrder: 0 },
    { name: "Kilogramm",  symbol: "kg",  sortOrder: 1 },
    { name: "Gramm",      symbol: "g",   sortOrder: 2 },
    { name: "Liter",      symbol: "l",   sortOrder: 3 },
    { name: "Milliliter", symbol: "ml",  sortOrder: 4 },
    { name: "Meter",      symbol: "m",   sortOrder: 5 },
    { name: "Zentimeter", symbol: "cm",  sortOrder: 6 },
    { name: "Packung",    symbol: "",    sortOrder: 7 },
  ],
  en: [
    { name: "Piece",      symbol: "pc",  sortOrder: 0 },
    { name: "Kilogram",   symbol: "kg",  sortOrder: 1 },
    { name: "Gram",       symbol: "g",   sortOrder: 2 },
    { name: "Liter",      symbol: "l",   sortOrder: 3 },
    { name: "Milliliter", symbol: "ml",  sortOrder: 4 },
    { name: "Meter",      symbol: "m",   sortOrder: 5 },
    { name: "Centimeter", symbol: "cm",  sortOrder: 6 },
    { name: "Pack",       symbol: "",    sortOrder: 7 },
  ],
  es: [
    { name: "Pieza",      symbol: "pz",  sortOrder: 0 },
    { name: "Kilogramo",  symbol: "kg",  sortOrder: 1 },
    { name: "Gramo",      symbol: "g",   sortOrder: 2 },
    { name: "Litro",      symbol: "l",   sortOrder: 3 },
    { name: "Mililitro",  symbol: "ml",  sortOrder: 4 },
    { name: "Metro",      symbol: "m",   sortOrder: 5 },
    { name: "Centímetro",  symbol: "cm",  sortOrder: 6 },
    { name: "Paquete",    symbol: "",    sortOrder: 7 },
  ],
  fr: [
    { name: "Pièce",      symbol: "pc",  sortOrder: 0 },
    { name: "Kilogramme", symbol: "kg",  sortOrder: 1 },
    { name: "Gramme",     symbol: "g",   sortOrder: 2 },
    { name: "Litre",      symbol: "l",   sortOrder: 3 },
    { name: "Millilitre", symbol: "ml",  sortOrder: 4 },
    { name: "Mètre",      symbol: "m",   sortOrder: 5 },
    { name: "Centimètre", symbol: "cm",  sortOrder: 6 },
    { name: "Paquet",     symbol: "",    sortOrder: 7 },
  ],
  tr: [
    { name: "Adet",       symbol: "ad",  sortOrder: 0 },
    { name: "Kilogram",   symbol: "kg",  sortOrder: 1 },
    { name: "Gram",       symbol: "g",   sortOrder: 2 },
    { name: "Litre",      symbol: "l",   sortOrder: 3 },
    { name: "Mililitre",  symbol: "ml",  sortOrder: 4 },
    { name: "Metre",      symbol: "m",   sortOrder: 5 },
    { name: "Santimetre", symbol: "cm",  sortOrder: 6 },
    { name: "Paket",      symbol: "",    sortOrder: 7 },
  ],
  ar: [
    { name: "قطعة",       symbol: "",    sortOrder: 0 },
    { name: "كيلوغرام",   symbol: "kg",  sortOrder: 1 },
    { name: "غرام",       symbol: "g",   sortOrder: 2 },
    { name: "لتر",        symbol: "l",   sortOrder: 3 },
    { name: "ملليلتر",    symbol: "ml",  sortOrder: 4 },
    { name: "متر",        symbol: "m",   sortOrder: 5 },
    { name: "سنتيمتر",   symbol: "cm",  sortOrder: 6 },
    { name: "عبوة",       symbol: "",    sortOrder: 7 },
  ],
  zh: [
    { name: "件",        symbol: "",    sortOrder: 0 },
    { name: "千克",       symbol: "kg",  sortOrder: 1 },
    { name: "克",        symbol: "g",   sortOrder: 2 },
    { name: "升",        symbol: "l",   sortOrder: 3 },
    { name: "毫升",       symbol: "ml",  sortOrder: 4 },
    { name: "米",        symbol: "m",   sortOrder: 5 },
    { name: "厘米",       symbol: "cm",  sortOrder: 6 },
    { name: "包",        symbol: "",    sortOrder: 7 },
  ],
};

/** Fallback to German if language not found */
function getDefaultUnits(language?: string) {
  const lang = (language ?? "de").split("-")[0].toLowerCase();
  return DEFAULT_UNIT_NAMES[lang] ?? DEFAULT_UNIT_NAMES["de"];
}

/** Default units seeded for every new household (German, for backwards compat) */
export const DEFAULT_UNITS = DEFAULT_UNIT_NAMES["de"];

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
    .input(z.object({ householdId: z.number(), language: z.string().optional() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) return { seeded: 0 };

      const existing = await db
        .select({ id: itemUnits.id })
        .from(itemUnits)
        .where(eq(itemUnits.householdId, input.householdId));

      if (existing.length > 0) return { seeded: 0 };

      const units = getDefaultUnits(input.language);

      await db.insert(itemUnits).values(
        units.map((u) => ({
          householdId: input.householdId,
          name: u.name,
          symbol: u.symbol,
          sortOrder: u.sortOrder,
          isDefault: true,
        }))
      );

      return { seeded: units.length };
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
