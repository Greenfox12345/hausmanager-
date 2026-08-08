import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { planBagItems, planBagShares, planTemplates, planTemplateShoppingItems, planTemplateTaskItems } from "../../drizzle/schema";
import type { PlanBagSnapshot } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";
import crypto from "crypto";

// ─── Snapshot-Helfer ──────────────────────────────────────────────────────────

async function buildSnapshot(templateId: number): Promise<PlanBagSnapshot | null> {
  const db = (await getDb())!;
  const [template] = await db.select().from(planTemplates).where(eq(planTemplates.id, templateId));
  if (!template) return null;

  const shoppingItems = await db.select().from(planTemplateShoppingItems)
    .where(eq(planTemplateShoppingItems.templateId, templateId));

  const taskItems = await db.select().from(planTemplateTaskItems)
    .where(eq(planTemplateTaskItems.templateId, templateId));

  const taskNameMap: Record<number, string> = {};
  for (const t of taskItems) taskNameMap[t.id] = t.name;

  return {
    name: template.name,
    description: template.description,
    type: template.type as "shopping" | "tasks" | "mixed",
    phases: (template.phases as PlanBagSnapshot["phases"]) ?? undefined,
    variables: (template.variables as PlanBagSnapshot["variables"]) ?? undefined,
    enableVariables: template.enableVariables ?? false,
    shoppingItems: shoppingItems.map(i => ({
      name: i.name,
      quantity: i.quantity ?? null,
      unitSymbol: null,
      unitName: null,
      notes: i.notes ?? null,
      categoryName: null,
      categoryColor: null,
      phaseId: (i as any).phaseId ?? null,
      sortOrder: i.sortOrder ?? 0,
    })),
    taskItems: taskItems.map(t => {
      const prereqArr = ((t.prerequisiteItemIds as Array<{id: number; gapDays?: number} | number>) ?? []);
      const followupArr = ((t.followupItemIds as Array<{id: number; gapDays?: number} | number>) ?? []);
      const prereqs = prereqArr.map(p => {
        const id = typeof p === "number" ? p : p?.id;
        const gapDays = typeof p === "number" ? undefined : p?.gapDays;
        return { name: taskNameMap[id] ?? String(id), gapDays };
      });
      const followups = followupArr.map(p => {
        const id = typeof p === "number" ? p : p?.id;
        const gapDays = typeof p === "number" ? undefined : p?.gapDays;
        return { name: taskNameMap[id] ?? String(id), gapDays };
      });
      return {
        name: t.name,
        description: t.description ?? null,
        dueDaysFromStart: t.dueDaysFromStart ?? null,
        frequency: t.frequency ?? "once",
        customFrequencyDays: t.customFrequencyDays ?? null,
        repeatInterval: t.repeatInterval ?? null,
        repeatUnit: t.repeatUnit ?? null,
        durationDays: t.durationDays ?? 0,
        durationMinutes: t.durationMinutes ?? 0,
        enableRotation: t.enableRotation ?? false,
        requiredPersons: t.requiredPersons ?? null,
        prerequisiteNames: prereqs.map(p => p.name),
        followupNames: followups.map(p => p.name),
        gapDaysMap: Object.fromEntries([
          ...prereqs.filter(p => p.gapDays).map(p => [p.name, p.gapDays!]),
          ...followups.filter(p => p.gapDays).map(p => [p.name, p.gapDays!]),
        ]),
        phaseId: (t as any).phaseId ?? null,
        sortOrder: t.sortOrder ?? 0,
      };
    }),
    originalTemplateId: template.id,
    originalHouseholdId: template.householdId,
    snapshotAt: new Date().toISOString(),
  };
}

async function importSnapshot(snapshot: PlanBagSnapshot, householdId: number, memberId: number): Promise<number> {
  const db = (await getDb())!;
  const [result] = await db.insert(planTemplates).values({
    householdId,
    name: snapshot.name,
    description: snapshot.description ?? null,
    type: snapshot.type,
    phases: (snapshot.phases as any) ?? null,
    variables: (snapshot.variables as any) ?? null,
    enableVariables: snapshot.enableVariables ?? false,
    createdByMemberId: memberId,
  });
  const templateId = (result as any).insertId as number;

  if (snapshot.shoppingItems && snapshot.shoppingItems.length > 0) {
    for (const item of snapshot.shoppingItems) {
      await db.insert(planTemplateShoppingItems).values({
        templateId,
        name: item.name,
        quantity: item.quantity ?? null,
        notes: item.notes ?? null,
        sortOrder: item.sortOrder ?? 0,
      });
    }
  }

  const taskNameToId: Record<string, number> = {};
  if (snapshot.taskItems && snapshot.taskItems.length > 0) {
    for (const task of snapshot.taskItems) {
      const [taskResult] = await db.insert(planTemplateTaskItems).values({
        templateId,
        name: task.name,
        description: task.description ?? null,
        dueDaysFromStart: task.dueDaysFromStart ?? null,
        frequency: (task.frequency as any) ?? "once",
        customFrequencyDays: task.customFrequencyDays ?? null,
        repeatInterval: task.repeatInterval ?? null,
        repeatUnit: (task.repeatUnit as any) ?? null,
        durationDays: task.durationDays ?? 0,
        durationMinutes: task.durationMinutes ?? 0,
        enableRotation: task.enableRotation ?? false,
        requiredPersons: task.requiredPersons ?? null,
        phaseId: task.phaseId ?? null,
        sortOrder: task.sortOrder ?? 0,
      });
      taskNameToId[task.name] = (taskResult as any).insertId as number;
    }

    for (const task of snapshot.taskItems) {
      const taskId = taskNameToId[task.name];
      if (!taskId) continue;
      const prereqs = (task.prerequisiteNames ?? [])
        .map(name => ({ id: taskNameToId[name] ?? 0, gapDays: task.gapDaysMap?.[name] }))
        .filter(p => p.id > 0);
      const followups = (task.followupNames ?? [])
        .map(name => ({ id: taskNameToId[name] ?? 0, gapDays: task.gapDaysMap?.[name] }))
        .filter(f => f.id > 0);
      if (prereqs.length > 0 || followups.length > 0) {
        await db.update(planTemplateTaskItems)
          .set({ prerequisiteItemIds: prereqs, followupItemIds: followups })
          .where(eq(planTemplateTaskItems.id, taskId));
      }
    }
  }

  return templateId;
}

// ─── Router ───────────────────────────────────────────────────────────────────

export const planBagRouter = router({
  addToBag: protectedProcedure
    .input(z.object({ templateId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const snapshot = await buildSnapshot(input.templateId);
      if (!snapshot) throw new Error("Vorlage nicht gefunden");
      const db = (await getDb())!;
      await db.insert(planBagItems).values({ userId: ctx.user.id, snapshot });
      return { ok: true };
    }),

  listBag: protectedProcedure
    .query(async ({ ctx }) => {
      const db = (await getDb())!;
      const items = await db.select().from(planBagItems)
        .where(eq(planBagItems.userId, ctx.user.id));
      const result = await Promise.all(items.map(async item => {
        const shares = await db.select().from(planBagShares)
          .where(eq(planBagShares.bagItemId, item.id));
        return { ...item, shares };
      }));
      return result;
    }),

  removeFromBag: protectedProcedure
    .input(z.object({ bagItemId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = (await getDb())!;
      await db.delete(planBagItems)
        .where(and(eq(planBagItems.id, input.bagItemId), eq(planBagItems.userId, ctx.user.id)));
      return { ok: true };
    }),

  updateSnapshot: protectedProcedure
    .input(z.object({ bagItemId: z.number(), templateId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const snapshot = await buildSnapshot(input.templateId);
      if (!snapshot) throw new Error("Vorlage nicht gefunden");
      const db = (await getDb())!;
      await db.update(planBagItems)
        .set({ snapshot, updatedAt: new Date() })
        .where(and(eq(planBagItems.id, input.bagItemId), eq(planBagItems.userId, ctx.user.id)));
      return { ok: true };
    }),

  importFromBag: protectedProcedure
    .input(z.object({ bagItemId: z.number(), householdId: z.number(), memberId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = (await getDb())!;
      const [item] = await db.select().from(planBagItems)
        .where(eq(planBagItems.id, input.bagItemId));
      if (!item) throw new Error("Plansack-Eintrag nicht gefunden");
      const templateId = await importSnapshot(item.snapshot as PlanBagSnapshot, input.householdId, input.memberId);
      return { ok: true, templateId };
    }),

  createShareLink: protectedProcedure
    .input(z.object({ bagItemId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = (await getDb())!;
      const [item] = await db.select().from(planBagItems)
        .where(and(eq(planBagItems.id, input.bagItemId), eq(planBagItems.userId, ctx.user.id)));
      if (!item) throw new Error("Nicht gefunden");
      const token = crypto.randomBytes(24).toString("base64url");
      await db.insert(planBagShares).values({ bagItemId: input.bagItemId, token });
      return { token };
    }),

  deleteShareLink: protectedProcedure
    .input(z.object({ shareId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = (await getDb())!;
      const [share] = await db.select().from(planBagShares).where(eq(planBagShares.id, input.shareId));
      if (!share) throw new Error("Nicht gefunden");
      const [item] = await db.select().from(planBagItems)
        .where(and(eq(planBagItems.id, share.bagItemId), eq(planBagItems.userId, ctx.user.id)));
      if (!item) throw new Error("Keine Berechtigung");
      await db.delete(planBagShares).where(eq(planBagShares.id, input.shareId));
      return { ok: true };
    }),

  getSharedTemplate: publicProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ input }) => {
      const db = (await getDb())!;
      const [share] = await db.select().from(planBagShares).where(eq(planBagShares.token, input.token));
      if (!share) throw new Error("Link nicht gefunden");
      if (share.expiresAt && share.expiresAt < new Date()) throw new Error("Link abgelaufen");
      const [item] = await db.select().from(planBagItems).where(eq(planBagItems.id, share.bagItemId));
      if (!item) throw new Error("Vorlage nicht mehr verfügbar");
      return { snapshot: item.snapshot as PlanBagSnapshot, shareId: share.id };
    }),

  importFromShare: protectedProcedure
    .input(z.object({ token: z.string(), householdId: z.number(), memberId: z.number() }))
    .mutation(async ({ input }) => {
      const db = (await getDb())!;
      const [share] = await db.select().from(planBagShares).where(eq(planBagShares.token, input.token));
      if (!share) throw new Error("Link nicht gefunden");
      if (share.expiresAt && share.expiresAt < new Date()) throw new Error("Link abgelaufen");
      const [item] = await db.select().from(planBagItems).where(eq(planBagItems.id, share.bagItemId));
      if (!item) throw new Error("Vorlage nicht mehr verfügbar");
      const templateId = await importSnapshot(item.snapshot as PlanBagSnapshot, input.householdId, input.memberId);
      return { ok: true, templateId };
    }),
});
