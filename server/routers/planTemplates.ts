/**
 * planTemplates.ts – tRPC-Router für die Plankiste
 *
 * Enthält alle Prozeduren für:
 * - Vorlagen verwalten (CRUD)
 * - Vorlagen-Artikel verwalten (CRUD)
 * - Instanzen starten und verwalten
 * - Artikel in die Einkaufsliste übertragen
 */
import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import {
  planTemplates,
  planTemplateShoppingItems,
  planTemplateInstances,
  planInstanceShoppingItems,
  planTemplateTaskItems,
  planInstanceTaskItems,
  shoppingItems,
  shoppingCategories,
  itemUnits,
  householdMembers,
  tasks,
} from "../../drizzle/schema";
import { eq, and, asc, desc } from "drizzle-orm";
import { getDb, createActivityLog, getHouseholdById } from "../db";

type Lang = "de" | "en" | "es" | "fr" | "zh" | "tr" | "ar";
async function getLang(householdId: number): Promise<Lang> {
  const hh = await getHouseholdById(householdId);
  const l = hh?.language ?? "de";
  return (["en","es","fr","zh","tr","ar"].includes(l)) ? (l as Lang) : "de";
}

export const planTemplatesRouter = router({

  // ─── Vorlagen ────────────────────────────────────────────────────────────────

  /** Alle Vorlagen eines Haushalts abrufen */
  listTemplates: publicProcedure
    .input(z.object({ householdId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const templates = await db
        .select()
        .from(planTemplates)
        .where(and(
          eq(planTemplates.householdId, input.householdId),
          eq(planTemplates.isArchived, false)
        ))
        .orderBy(desc(planTemplates.updatedAt));

      // Für jede Vorlage die Anzahl der Artikel laden
      const result = await Promise.all(templates.map(async (t) => {
        const items = await db
          .select({ id: planTemplateShoppingItems.id })
          .from(planTemplateShoppingItems)
          .where(eq(planTemplateShoppingItems.templateId, t.id));
        return { ...t, itemCount: items.length };
      }));
      return result;
    }),

  /** Eine Vorlage mit allen Artikeln abrufen */
  getTemplate: publicProcedure
    .input(z.object({ templateId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;
      const [template] = await db
        .select()
        .from(planTemplates)
        .where(eq(planTemplates.id, input.templateId));
      if (!template) return null;

      const items = await db
        .select({
          id: planTemplateShoppingItems.id,
          templateId: planTemplateShoppingItems.templateId,
          name: planTemplateShoppingItems.name,
          categoryId: planTemplateShoppingItems.categoryId,
          quantity: planTemplateShoppingItems.quantity,
          unitId: planTemplateShoppingItems.unitId,
          notes: planTemplateShoppingItems.notes,
          sortOrder: planTemplateShoppingItems.sortOrder,
          createdAt: planTemplateShoppingItems.createdAt,
          categoryName: shoppingCategories.name,
          categoryColor: shoppingCategories.color,
          unitName: itemUnits.name,
          unitSymbol: itemUnits.symbol,
        })
        .from(planTemplateShoppingItems)
        .leftJoin(shoppingCategories, eq(planTemplateShoppingItems.categoryId, shoppingCategories.id))
        .leftJoin(itemUnits, eq(planTemplateShoppingItems.unitId, itemUnits.id))
        .where(eq(planTemplateShoppingItems.templateId, input.templateId))
        .orderBy(asc(planTemplateShoppingItems.sortOrder), asc(planTemplateShoppingItems.createdAt));

      return { ...template, items };
    }),

  /** Neue Vorlage erstellen */
  createTemplate: publicProcedure
    .input(z.object({
      householdId: z.number(),
      memberId: z.number(),
      name: z.string().min(1).max(255),
      description: z.string().optional(),
      type: z.enum(["shopping", "tasks", "project", "mixed"]).default("shopping"),
      tags: z.array(z.string()).optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB nicht verfügbar");
      const [result] = await db.insert(planTemplates).values({
        householdId: input.householdId,
        createdByMemberId: input.memberId,
        name: input.name,
        description: input.description ?? null,
        type: input.type,
        tags: input.tags ?? [],
      });
      const templateId = result.insertId;
      const lang = await getLang(input.householdId);
      const memberRow = await db.select({ memberName: householdMembers.memberName })
        .from(householdMembers).where(eq(householdMembers.id, input.memberId)).limit(1);
      const memberName = memberRow[0]?.memberName ?? `#${input.memberId}`;
      await createActivityLog({
        householdId: input.householdId,
        memberId: input.memberId,
        activityType: "other",
        action: "plan_template_created",
        description: lang === "en"
          ? `${memberName} created plan template "${input.name}"`
          : `${memberName} hat die Vorlage „${input.name}" erstellt`,
        metadata: { templateId, name: input.name },
      });
      return { templateId };
    }),

  /** Vorlage bearbeiten */
  updateTemplate: publicProcedure
    .input(z.object({
      templateId: z.number(),
      householdId: z.number(),
      memberId: z.number(),
      name: z.string().min(1).max(255).optional(),
      description: z.string().nullable().optional(),
      type: z.enum(["shopping", "tasks", "project", "mixed"]).optional(),
      tags: z.array(z.string()).optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB nicht verfügbar");
      const updates: Record<string, unknown> = {};
      if (input.name !== undefined) updates.name = input.name;
      if (input.description !== undefined) updates.description = input.description;
      if (input.type !== undefined) updates.type = input.type;
      if (input.tags !== undefined) updates.tags = input.tags;
      if (Object.keys(updates).length > 0) {
        await db.update(planTemplates).set(updates).where(eq(planTemplates.id, input.templateId));
      }
      return { success: true };
    }),

  /** Vorlage archivieren (Soft-Delete) */
  archiveTemplate: publicProcedure
    .input(z.object({
      templateId: z.number(),
      householdId: z.number(),
      memberId: z.number(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB nicht verfügbar");
      await db.update(planTemplates)
        .set({ isArchived: true })
        .where(eq(planTemplates.id, input.templateId));
      return { success: true };
    }),

  // ─── Vorlagen-Artikel ─────────────────────────────────────────────────────

  /** Artikel zur Vorlage hinzufügen */
  addTemplateItem: publicProcedure
    .input(z.object({
      templateId: z.number(),
      name: z.string().min(1).max(255),
      categoryId: z.number().nullable().optional(),
      quantity: z.number().nullable().optional(),
      unitId: z.number().nullable().optional(),
      notes: z.string().optional(),
      sortOrder: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB nicht verfügbar");
      // Nächste sortOrder ermitteln
      const existing = await db
        .select({ sortOrder: planTemplateShoppingItems.sortOrder })
        .from(planTemplateShoppingItems)
        .where(eq(planTemplateShoppingItems.templateId, input.templateId))
        .orderBy(desc(planTemplateShoppingItems.sortOrder))
        .limit(1);
      const nextSort = input.sortOrder ?? ((existing[0]?.sortOrder ?? -1) + 1);
      const [result] = await db.insert(planTemplateShoppingItems).values({
        templateId: input.templateId,
        name: input.name,
        categoryId: input.categoryId ?? null,
        quantity: input.quantity != null ? String(input.quantity) : null,
        unitId: input.unitId ?? null,
        notes: input.notes ?? null,
        sortOrder: nextSort,
      });
      return { itemId: result.insertId };
    }),

  /** Artikel in der Vorlage bearbeiten */
  updateTemplateItem: publicProcedure
    .input(z.object({
      itemId: z.number(),
      name: z.string().min(1).max(255).optional(),
      categoryId: z.number().nullable().optional(),
      quantity: z.number().nullable().optional(),
      unitId: z.number().nullable().optional(),
      notes: z.string().nullable().optional(),
      sortOrder: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB nicht verfügbar");
      const updates: Record<string, unknown> = {};
      if (input.name !== undefined) updates.name = input.name;
      if (input.categoryId !== undefined) updates.categoryId = input.categoryId;
      if (input.quantity !== undefined) updates.quantity = input.quantity != null ? String(input.quantity) : null;
      if (input.unitId !== undefined) updates.unitId = input.unitId;
      if (input.notes !== undefined) updates.notes = input.notes;
      if (input.sortOrder !== undefined) updates.sortOrder = input.sortOrder;
      if (Object.keys(updates).length > 0) {
        await db.update(planTemplateShoppingItems).set(updates).where(eq(planTemplateShoppingItems.id, input.itemId));
      }
      return { success: true };
    }),

  /** Artikel aus der Vorlage löschen */
  deleteTemplateItem: publicProcedure
    .input(z.object({ itemId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB nicht verfügbar");
      await db.delete(planTemplateShoppingItems).where(eq(planTemplateShoppingItems.id, input.itemId));
      return { success: true };
    }),

  // ─── Instanzen ────────────────────────────────────────────────────────────

  /** Alle Instanzen eines Haushalts abrufen (aktive zuerst) */
  listInstances: publicProcedure
    .input(z.object({ householdId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const instances = await db
        .select({
          id: planTemplateInstances.id,
          templateId: planTemplateInstances.templateId,
          householdId: planTemplateInstances.householdId,
          startedByMemberId: planTemplateInstances.startedByMemberId,
          label: planTemplateInstances.label,
          status: planTemplateInstances.status,
          startedAt: planTemplateInstances.startedAt,
          completedAt: planTemplateInstances.completedAt,
          templateName: planTemplates.name,
          templateType: planTemplates.type,
        })
        .from(planTemplateInstances)
        .leftJoin(planTemplates, eq(planTemplateInstances.templateId, planTemplates.id))
        .where(eq(planTemplateInstances.householdId, input.householdId))
        .orderBy(desc(planTemplateInstances.startedAt));

      // Für jede Instanz: Anzahl Artikel + Aufgaben und übertragene
      const result = await Promise.all(instances.map(async (inst) => {
        const shoppingItems2 = await db
          .select({ id: planInstanceShoppingItems.id, isTransferred: planInstanceShoppingItems.isTransferred })
          .from(planInstanceShoppingItems)
          .where(eq(planInstanceShoppingItems.instanceId, inst.id));
        const taskItems2 = await db
          .select({ id: planInstanceTaskItems.id, isTransferred: planInstanceTaskItems.isTransferred })
          .from(planInstanceTaskItems)
          .where(eq(planInstanceTaskItems.instanceId, inst.id));
        const allItems = [...shoppingItems2, ...taskItems2];
        return {
          ...inst,
          totalItems: allItems.length,
          transferredItems: allItems.filter(i => i.isTransferred).length,
          totalShoppingItems: shoppingItems2.length,
          transferredShoppingItems: shoppingItems2.filter(i => i.isTransferred).length,
          totalTaskItems: taskItems2.length,
          transferredTaskItems: taskItems2.filter(i => i.isTransferred).length,
        };
      }));
      return result;
    }),

  /** Eine Instanz mit allen Artikeln abrufen */
  getInstance: publicProcedure
    .input(z.object({ instanceId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;
      const [instance] = await db
        .select({
          id: planTemplateInstances.id,
          templateId: planTemplateInstances.templateId,
          householdId: planTemplateInstances.householdId,
          startedByMemberId: planTemplateInstances.startedByMemberId,
          label: planTemplateInstances.label,
          status: planTemplateInstances.status,
          startedAt: planTemplateInstances.startedAt,
          completedAt: planTemplateInstances.completedAt,
          templateName: planTemplates.name,
          templateType: planTemplates.type,
        })
        .from(planTemplateInstances)
        .leftJoin(planTemplates, eq(planTemplateInstances.templateId, planTemplates.id))
        .where(eq(planTemplateInstances.id, input.instanceId));
      if (!instance) return null;

      const items = await db
        .select({
          id: planInstanceShoppingItems.id,
          instanceId: planInstanceShoppingItems.instanceId,
          templateItemId: planInstanceShoppingItems.templateItemId,
          name: planInstanceShoppingItems.name,
          categoryId: planInstanceShoppingItems.categoryId,
          quantity: planInstanceShoppingItems.quantity,
          unitId: planInstanceShoppingItems.unitId,
          notes: planInstanceShoppingItems.notes,
          sortOrder: planInstanceShoppingItems.sortOrder,
          isTransferred: planInstanceShoppingItems.isTransferred,
          shoppingItemId: planInstanceShoppingItems.shoppingItemId,
          createdAt: planInstanceShoppingItems.createdAt,
          categoryName: shoppingCategories.name,
          categoryColor: shoppingCategories.color,
          unitName: itemUnits.name,
          unitSymbol: itemUnits.symbol,
        })
        .from(planInstanceShoppingItems)
        .leftJoin(shoppingCategories, eq(planInstanceShoppingItems.categoryId, shoppingCategories.id))
        .leftJoin(itemUnits, eq(planInstanceShoppingItems.unitId, itemUnits.id))
        .where(eq(planInstanceShoppingItems.instanceId, input.instanceId))
        .orderBy(asc(planInstanceShoppingItems.sortOrder), asc(planInstanceShoppingItems.createdAt));

      // Aufgaben-Items laden
      const taskItemsData = await db
        .select()
        .from(planInstanceTaskItems)
        .where(eq(planInstanceTaskItems.instanceId, input.instanceId))
        .orderBy(asc(planInstanceTaskItems.sortOrder));

      return { ...instance, items, taskItems: taskItemsData };
    }),

  /** Vorlage starten – erstellt eine neue Instanz mit kopierten Artikeln */
  startTemplate: publicProcedure
    .input(z.object({
      templateId: z.number(),
      householdId: z.number(),
      memberId: z.number(),
      label: z.string().optional(), // Optionaler Name, z.B. "Einkauf 14.07."
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB nicht verfügbar");

      // Vorlage und Artikel laden
      const [template] = await db.select().from(planTemplates).where(eq(planTemplates.id, input.templateId));
      if (!template) throw new Error("Vorlage nicht gefunden");
      const templateItems = await db
        .select()
        .from(planTemplateShoppingItems)
        .where(eq(planTemplateShoppingItems.templateId, input.templateId))
        .orderBy(asc(planTemplateShoppingItems.sortOrder));

      // Label generieren falls nicht angegeben
      const now = new Date();
      const dateStr = now.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
      const label = input.label ?? `${template.name} – ${dateStr}`;

      // Instanz anlegen
      const [instResult] = await db.insert(planTemplateInstances).values({
        templateId: input.templateId,
        householdId: input.householdId,
        startedByMemberId: input.memberId,
        label,
        status: "active",
      });
      const instanceId = instResult.insertId;

      // Artikel kopieren
      if (templateItems.length > 0) {
        await db.insert(planInstanceShoppingItems).values(
          templateItems.map((item) => ({
            instanceId,
            templateItemId: item.id,
            name: item.name,
            categoryId: item.categoryId,
            quantity: item.quantity,
            unitId: item.unitId,
            notes: item.notes,
            sortOrder: item.sortOrder,
          }))
        );
      }

      // Aufgaben-Items kopieren (falls vorhanden)
      const templateTaskItems = await db
        .select()
        .from(planTemplateTaskItems)
        .where(eq(planTemplateTaskItems.templateId, input.templateId))
        .orderBy(asc(planTemplateTaskItems.sortOrder));
      if (templateTaskItems.length > 0) {
        // Erst alle Items einfügen, dann Dependency-IDs remappen
        const templateToInstanceIdMap = new Map<number, number>();
        for (const item of templateTaskItems) {
          const [r] = await db.insert(planInstanceTaskItems).values({
            instanceId,
            templateItemId: item.id,
            name: item.name,
            description: item.description,
            assignedToMemberIds: item.assignedToMemberIds,
            dueDaysFromStart: item.dueDaysFromStart,
            frequency: item.frequency,
            customFrequencyDays: item.customFrequencyDays,
            repeatInterval: item.repeatInterval,
            repeatUnit: item.repeatUnit,
            durationDays: item.durationDays,
            durationMinutes: item.durationMinutes,
            enableRotation: item.enableRotation,
            requiredPersons: item.requiredPersons,
            prerequisiteItemIds: [],
            followupItemIds: [],
            sortOrder: item.sortOrder,
          });
          templateToInstanceIdMap.set(item.id, r.insertId);
        }
        // Dependency-IDs von Template-IDs auf Instanz-IDs remappen
        for (const item of templateTaskItems) {
          const instanceItemId = templateToInstanceIdMap.get(item.id)!;
          const prereqIds = ((item.prerequisiteItemIds as number[]) ?? []).map((tid) => templateToInstanceIdMap.get(tid)).filter(Boolean) as number[];
          const followIds = ((item.followupItemIds as number[]) ?? []).map((tid) => templateToInstanceIdMap.get(tid)).filter(Boolean) as number[];
          if (prereqIds.length > 0 || followIds.length > 0) {
            await db.update(planInstanceTaskItems)
              .set({ prerequisiteItemIds: prereqIds, followupItemIds: followIds })
              .where(eq(planInstanceTaskItems.id, instanceItemId));
          }
        }
      }
      // usageCount und lastUsedAt aktualisieren
      await db.update(planTemplates)
        .set({ usageCount: (template.usageCount ?? 0) + 1, lastUsedAt: now })
        .where(eq(planTemplates.id, input.templateId));

      // Activity-Log
      const lang = await getLang(input.householdId);
      const memberRow = await db.select({ memberName: householdMembers.memberName })
        .from(householdMembers).where(eq(householdMembers.id, input.memberId)).limit(1);
      const memberName = memberRow[0]?.memberName ?? `#${input.memberId}`;
      await createActivityLog({
        householdId: input.householdId,
        memberId: input.memberId,
        activityType: "other",
        action: "plan_instance_started",
        description: lang === "en"
          ? `${memberName} started plan "${label}" from template "${template.name}"`
          : `${memberName} hat den Plan „${label}" aus der Vorlage „${template.name}" gestartet`,
        metadata: { instanceId, templateId: input.templateId, label },
      });

      return { instanceId, label };
    }),

  /** Instanz abschließen */
  completeInstance: publicProcedure
    .input(z.object({
      instanceId: z.number(),
      householdId: z.number(),
      memberId: z.number(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB nicht verfügbar");
      await db.update(planTemplateInstances)
        .set({ status: "completed", completedAt: new Date() })
        .where(eq(planTemplateInstances.id, input.instanceId));
      return { success: true };
    }),

  /** Instanz stornieren */
  cancelInstance: publicProcedure
    .input(z.object({
      instanceId: z.number(),
      householdId: z.number(),
      memberId: z.number(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB nicht verfügbar");
      await db.update(planTemplateInstances)
        .set({ status: "cancelled" })
        .where(eq(planTemplateInstances.id, input.instanceId));
      return { success: true };
    }),

  // ─── Artikel übertragen ───────────────────────────────────────────────────

  /**
   * Einen oder mehrere Instanz-Artikel in die Einkaufsliste übertragen.
   * Erstellt shoppingItems-Einträge und markiert die Instanz-Artikel als übertragen.
   */
  transferItems: publicProcedure
    .input(z.object({
      instanceId: z.number(),
      householdId: z.number(),
      memberId: z.number(),
      items: z.array(z.object({
        instanceItemId: z.number(),
        name: z.string().min(1),
        categoryId: z.number().nullable().optional(),
        quantity: z.number().nullable().optional(),
        unitId: z.number().nullable().optional(),
        notes: z.string().nullable().optional(),
      })),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB nicht verfügbar");

      const createdIds: number[] = [];
      for (const item of input.items) {
        // shoppingItem anlegen
        const [res] = await db.insert(shoppingItems).values({
          householdId: input.householdId,
          name: item.name,
          categoryId: item.categoryId ?? null,
          quantity: item.quantity != null ? String(item.quantity) : null,
          unitId: item.unitId ?? null,
          notes: item.notes ?? null,
          addedBy: input.memberId,
          isCompleted: false,
        });
        const shoppingItemId = res.insertId;
        createdIds.push(shoppingItemId);

        // Instanz-Artikel als übertragen markieren
        await db.update(planInstanceShoppingItems)
          .set({ isTransferred: true, shoppingItemId })
          .where(eq(planInstanceShoppingItems.id, item.instanceItemId));
      }

      return { createdIds, count: createdIds.length };
    }),

  /** Übertragung eines Artikels rückgängig machen (shoppingItem löschen + isTransferred = false) */
  untransferItem: publicProcedure
    .input(z.object({
      instanceItemId: z.number(),
      shoppingItemId: z.number(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB nicht verfügbar");
      // shoppingItem löschen
      await db.delete(shoppingItems).where(eq(shoppingItems.id, input.shoppingItemId));
      // Instanz-Artikel zurücksetzen
      await db.update(planInstanceShoppingItems)
        .set({ isTransferred: false, shoppingItemId: null })
        .where(eq(planInstanceShoppingItems.id, input.instanceItemId));
      return { success: true };
    }),

  /** Instanz-Artikel manuell bearbeiten (Menge anpassen vor Übertragung) */
  updateInstanceItem: publicProcedure
    .input(z.object({
      instanceItemId: z.number(),
      quantity: z.number().nullable().optional(),
      notes: z.string().nullable().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB nicht verfügbar");
      const updates: Record<string, unknown> = {};
      if (input.quantity !== undefined) updates.quantity = input.quantity != null ? String(input.quantity) : null;
      if (input.notes !== undefined) updates.notes = input.notes;
      if (Object.keys(updates).length > 0) {
        await db.update(planInstanceShoppingItems).set(updates)
          .where(eq(planInstanceShoppingItems.id, input.instanceItemId));
      }
      return { success: true };
    }),

  /** Alle noch nicht übertragenen Artikel einer Instanz auf einmal übertragen */
  transferAllItems: publicProcedure
    .input(z.object({
      instanceId: z.number(),
      householdId: z.number(),
      memberId: z.number(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB nicht verfügbar");

      const pendingItems = await db
        .select()
        .from(planInstanceShoppingItems)
        .where(and(
          eq(planInstanceShoppingItems.instanceId, input.instanceId),
          eq(planInstanceShoppingItems.isTransferred, false)
        ));

      const createdIds: number[] = [];
      for (const item of pendingItems) {
        const [res] = await db.insert(shoppingItems).values({
          householdId: input.householdId,
          name: item.name,
          categoryId: item.categoryId ?? null,
          quantity: item.quantity ?? null,
          unitId: item.unitId ?? null,
          notes: item.notes ?? null,
          addedBy: input.memberId,
          isCompleted: false,
        });
        const shoppingItemId = res.insertId;
        createdIds.push(shoppingItemId);
        await db.update(planInstanceShoppingItems)
          .set({ isTransferred: true, shoppingItemId })
          .where(eq(planInstanceShoppingItems.id, item.id));
      }

      return { createdIds, count: createdIds.length };
    }),

  /** Aufgaben-Template-Items einer Vorlage abrufen */
  listTemplateTaskItems: publicProcedure
    .input(z.object({ templateId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(planTemplateTaskItems)
        .where(eq(planTemplateTaskItems.templateId, input.templateId))
        .orderBy(asc(planTemplateTaskItems.sortOrder));
    }),

  /** Aufgaben-Template-Item hinzufügen */
  addTemplateTaskItem: publicProcedure
    .input(z.object({
      templateId: z.number(),
      name: z.string().min(1),
      description: z.string().nullable().optional(),
      assignedToMemberIds: z.array(z.number()).optional(),
      dueDaysFromStart: z.number().nullable().optional(),
      frequency: z.enum(["once","daily","weekly","monthly","custom"]).default("once"),
      customFrequencyDays: z.number().nullable().optional(),
      repeatInterval: z.number().nullable().optional(),
      repeatUnit: z.enum(["days","weeks","months","irregular"]).nullable().optional(),
      durationDays: z.number().default(0),
      durationMinutes: z.number().default(0),
      enableRotation: z.boolean().default(false),
      requiredPersons: z.number().nullable().optional(),
      prerequisiteItemIds: z.array(z.number()).optional(),
      followupItemIds: z.array(z.number()).optional(),
      sortOrder: z.number().default(0),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB nicht verfügbar");
      const [res] = await db.insert(planTemplateTaskItems).values({
        templateId: input.templateId,
        name: input.name,
        description: input.description ?? null,
        assignedToMemberIds: input.assignedToMemberIds ?? [],
        dueDaysFromStart: input.dueDaysFromStart ?? null,
        frequency: input.frequency,
        customFrequencyDays: input.customFrequencyDays ?? null,
        repeatInterval: input.repeatInterval ?? null,
        repeatUnit: input.repeatUnit ?? null,
        durationDays: input.durationDays,
        durationMinutes: input.durationMinutes,
        enableRotation: input.enableRotation,
        requiredPersons: input.requiredPersons ?? null,
        prerequisiteItemIds: input.prerequisiteItemIds ?? [],
        followupItemIds: input.followupItemIds ?? [],
        sortOrder: input.sortOrder,
      });
      return { id: res.insertId };
    }),

  /** Aufgaben-Template-Item aktualisieren */
  updateTemplateTaskItem: publicProcedure
    .input(z.object({
      itemId: z.number(),
      name: z.string().min(1).optional(),
      description: z.string().nullable().optional(),
      assignedToMemberIds: z.array(z.number()).optional(),
      dueDaysFromStart: z.number().nullable().optional(),
      frequency: z.enum(["once","daily","weekly","monthly","custom"]).optional(),
      customFrequencyDays: z.number().nullable().optional(),
      repeatInterval: z.number().nullable().optional(),
      repeatUnit: z.enum(["days","weeks","months","irregular"]).nullable().optional(),
      durationDays: z.number().optional(),
      durationMinutes: z.number().optional(),
      enableRotation: z.boolean().optional(),
      requiredPersons: z.number().nullable().optional(),
      prerequisiteItemIds: z.array(z.number()).optional(),
      followupItemIds: z.array(z.number()).optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB nicht verfügbar");
      const { itemId, ...fields } = input;
      const update: Record<string, unknown> = {};
      if (fields.name !== undefined) update.name = fields.name;
      if (fields.description !== undefined) update.description = fields.description;
      if (fields.assignedToMemberIds !== undefined) update.assignedToMemberIds = fields.assignedToMemberIds;
      if (fields.dueDaysFromStart !== undefined) update.dueDaysFromStart = fields.dueDaysFromStart;
      if (fields.frequency !== undefined) update.frequency = fields.frequency;
      if (fields.customFrequencyDays !== undefined) update.customFrequencyDays = fields.customFrequencyDays;
      if (fields.repeatInterval !== undefined) update.repeatInterval = fields.repeatInterval;
      if (fields.repeatUnit !== undefined) update.repeatUnit = fields.repeatUnit;
      if (fields.durationDays !== undefined) update.durationDays = fields.durationDays;
      if (fields.durationMinutes !== undefined) update.durationMinutes = fields.durationMinutes;
      if (fields.enableRotation !== undefined) update.enableRotation = fields.enableRotation;
      if (fields.requiredPersons !== undefined) update.requiredPersons = fields.requiredPersons;
      if (fields.prerequisiteItemIds !== undefined) update.prerequisiteItemIds = fields.prerequisiteItemIds;
      if (fields.followupItemIds !== undefined) update.followupItemIds = fields.followupItemIds;
      if (Object.keys(update).length > 0) {
        await db.update(planTemplateTaskItems).set(update).where(eq(planTemplateTaskItems.id, itemId));
      }
      return { ok: true };
    }),

  /** Aufgaben-Template-Item löschen */
  deleteTemplateTaskItem: publicProcedure
    .input(z.object({ itemId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB nicht verfügbar");
      await db.delete(planTemplateTaskItems).where(eq(planTemplateTaskItems.id, input.itemId));
      return { ok: true };
    }),

  /** Aufgaben einer Instanz abrufen */
  listInstanceTaskItems: publicProcedure
    .input(z.object({ instanceId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(planInstanceTaskItems)
        .where(eq(planInstanceTaskItems.instanceId, input.instanceId))
        .orderBy(asc(planInstanceTaskItems.sortOrder));
    }),

  /**
   * Aufgaben einer Instanz in die Aufgaben-Seite übertragen.
   * Legt für jede ausgewählte Aufgabe einen echten tasks-Eintrag an.
   */
  transferTaskItems: publicProcedure
    .input(z.object({
      instanceId: z.number(),
      householdId: z.number(),
      memberId: z.number(),
      itemIds: z.array(z.number()),
      startDate: z.date().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB nicht verfügbar");
      const startDate = input.startDate ?? new Date();
      const createdIds: number[] = [];
      for (const itemId of input.itemIds) {
        const [item] = await db.select().from(planInstanceTaskItems)
          .where(and(eq(planInstanceTaskItems.id, itemId), eq(planInstanceTaskItems.instanceId, input.instanceId)));
        if (!item || item.isTransferred) continue;
        let dueDate: Date | null = null;
        if (item.dueDaysFromStart != null) {
          dueDate = new Date(startDate);
          dueDate.setDate(dueDate.getDate() + item.dueDaysFromStart);
        }
        const [res] = await db.insert(tasks).values({
          householdId: input.householdId,
          name: item.name,
          description: item.description ?? null,
          assignedTo: (item.assignedToMemberIds as number[]) ?? [],
          frequency: item.frequency,
          customFrequencyDays: item.customFrequencyDays ?? null,
          repeatInterval: item.repeatInterval ?? null,
          repeatUnit: item.repeatUnit ?? null,
          durationDays: item.durationDays ?? 0,
          durationMinutes: item.durationMinutes ?? 0,
          enableRotation: item.enableRotation ?? false,
          requiredPersons: item.requiredPersons ?? null,
          dueDate: dueDate ?? undefined,
          isCompleted: false,
          createdBy: input.memberId,
        });
        const taskId = res.insertId;
        createdIds.push(taskId);
        await db.update(planInstanceTaskItems)
          .set({ isTransferred: true, taskId })
          .where(eq(planInstanceTaskItems.id, itemId));
      }
      return { createdIds, count: createdIds.length };
    }),

  /** Alle noch nicht übertragenen Aufgaben einer Instanz übertragen */
  transferAllTaskItems: publicProcedure
    .input(z.object({
      instanceId: z.number(),
      householdId: z.number(),
      memberId: z.number(),
      startDate: z.date().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB nicht verfügbar");
      const pending = await db.select().from(planInstanceTaskItems)
        .where(and(
          eq(planInstanceTaskItems.instanceId, input.instanceId),
          eq(planInstanceTaskItems.isTransferred, false)
        ));
      const startDate = input.startDate ?? new Date();
      const createdIds: number[] = [];
      for (const item of pending) {
        let dueDate: Date | null = null;
        if (item.dueDaysFromStart != null) {
          dueDate = new Date(startDate);
          dueDate.setDate(dueDate.getDate() + item.dueDaysFromStart);
        }
        const [res] = await db.insert(tasks).values({
          householdId: input.householdId,
          name: item.name,
          description: item.description ?? null,
          assignedTo: (item.assignedToMemberIds as number[]) ?? [],
          frequency: item.frequency,
          customFrequencyDays: item.customFrequencyDays ?? null,
          repeatInterval: item.repeatInterval ?? null,
          repeatUnit: item.repeatUnit ?? null,
          durationDays: item.durationDays ?? 0,
          durationMinutes: item.durationMinutes ?? 0,
          enableRotation: item.enableRotation ?? false,
          requiredPersons: item.requiredPersons ?? null,
          dueDate: dueDate ?? undefined,
          isCompleted: false,
          createdBy: input.memberId,
        });
        const taskId = res.insertId;
        createdIds.push(taskId);
        await db.update(planInstanceTaskItems)
          .set({ isTransferred: true, taskId })
          .where(eq(planInstanceTaskItems.id, item.id));
      }
      return { createdIds, count: createdIds.length };
    }),

  /** Aufgaben-Transfer rückgängig machen */
  untransferTaskItem: publicProcedure
    .input(z.object({
      instanceItemId: z.number(),
      taskId: z.number(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB nicht verfügbar");
      // Task löschen
      await db.delete(tasks).where(eq(tasks.id, input.taskId));
      // Instanz-Item zurücksetzen
      await db.update(planInstanceTaskItems)
        .set({ isTransferred: false, taskId: null })
        .where(eq(planInstanceTaskItems.id, input.instanceItemId));
      return { ok: true };
    }),
});
