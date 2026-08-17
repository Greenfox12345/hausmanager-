import { TRPCError } from "@trpc/server";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { balanceEntries, householdBalanceSettings, households } from "../../drizzle/schema";
import { canModifyBalanceEntry } from "../../shared/balanceRules";
import { summarizeBalanceEntries } from "../../shared/balanceSummary";
import { createActivityLog, getDb, getHouseholdMemberById, getHouseholdMembers } from "../db";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";

const entryTypeSchema = z.enum(["payment", "work"]);
const sourceTypeSchema = z.enum(["manual", "task", "milestone", "shopping"]);

function validateEffort(entryType: "payment" | "work", amount?: number | null, minutes?: number | null) {
  if (entryType === "payment" && (!amount || amount <= 0)) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Für eine Zahlung ist ein Betrag größer als 0 erforderlich." });
  }
  if (entryType === "work" && (!minutes || !Number.isInteger(minutes) || minutes <= 0)) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Für Arbeitszeit sind volle Minuten größer als 0 erforderlich." });
  }
}

async function assertActiveMember(householdId: number, memberId: number) {
  const member = await getHouseholdMemberById(memberId);
  if (!member || member.householdId !== householdId || !member.isActive) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Mitglied gehört nicht zu diesem Haushalt." });
  }
  return member;
}

async function allowSelectedMember(householdId: number, recordedByMemberId: number, selectedMemberId: number) {
  const selectedMember = await assertActiveMember(householdId, selectedMemberId);
  if (selectedMemberId === recordedByMemberId) return selectedMember;
  const db = await getDb();
  const settings = db
    ? (await db.select().from(householdBalanceSettings).where(eq(householdBalanceSettings.householdId, householdId)).limit(1))[0]
    : undefined;
  if (!settings?.allowOtherMemberSelection) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Dieser Haushalt erlaubt keine Auswahl anderer Mitglieder für Bilanzaufwände." });
  }
  return selectedMember;
}

function formatEntry(entryType: "payment" | "work", amount: unknown, minutes: unknown) {
  if (entryType === "payment") return `${Number(amount).toLocaleString("de-DE", { style: "currency", currency: "EUR" })} bezahlt`;
  const totalMinutes = Number(minutes);
  const hours = Math.floor(totalMinutes / 60);
  const restMinutes = totalMinutes % 60;
  return `${hours > 0 ? `${hours} Std. ` : ""}${restMinutes} Min. gearbeitet`;
}

export const balanceRouter = router({
  getSettings: publicProcedure
    .input(z.object({ householdId: z.number(), memberId: z.number() }))
    .query(async ({ input }) => {
      await assertActiveMember(input.householdId, input.memberId);
      const db = await getDb();
      if (!db) throw new Error("Datenbank nicht verfügbar");
      const settings = (await db.select().from(householdBalanceSettings).where(eq(householdBalanceSettings.householdId, input.householdId)).limit(1))[0];
      return { allowOtherMemberSelection: settings?.allowOtherMemberSelection ?? false };
    }),

  setAllowOtherMemberSelection: protectedProcedure
    .input(z.object({ householdId: z.number(), allowOtherMemberSelection: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Datenbank nicht verfügbar");
      const household = (await db.select().from(households).where(eq(households.id, input.householdId)).limit(1))[0];
      if (!household) throw new TRPCError({ code: "NOT_FOUND", message: "Haushalt nicht gefunden." });
      if (household.createdBy !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN", message: "Nur der Haushaltsersteller kann diese Einstellung ändern." });
      await db.insert(householdBalanceSettings).values({
        householdId: input.householdId,
        allowOtherMemberSelection: input.allowOtherMemberSelection,
      }).onDuplicateKeyUpdate({ set: { allowOtherMemberSelection: input.allowOtherMemberSelection } });
      return { success: true };
    }),

  list: publicProcedure
    .input(z.object({ householdId: z.number(), memberId: z.number(), limit: z.number().int().min(1).max(200).default(100) }))
    .query(async ({ input }) => {
      await assertActiveMember(input.householdId, input.memberId);
      const db = await getDb();
      if (!db) throw new Error("Datenbank nicht verfügbar");
      return db.select().from(balanceEntries)
        .where(eq(balanceEntries.householdId, input.householdId))
        .orderBy(desc(balanceEntries.occurredAt), desc(balanceEntries.id))
        .limit(input.limit);
    }),

  summary: publicProcedure
    .input(z.object({ householdId: z.number(), memberId: z.number() }))
    .query(async ({ input }) => {
      await assertActiveMember(input.householdId, input.memberId);
      const db = await getDb();
      if (!db) throw new Error("Datenbank nicht verfügbar");
      const [entries, members] = await Promise.all([
        db.select().from(balanceEntries).where(eq(balanceEntries.householdId, input.householdId)),
        getHouseholdMembers(input.householdId),
      ]);
      return summarizeBalanceEntries(entries, members);
    }),

  create: publicProcedure
    .input(z.object({
      householdId: z.number(),
      recordedByMemberId: z.number(),
      memberId: z.number().optional(),
      entryType: entryTypeSchema,
      amount: z.number().positive().max(9999999).optional(),
      minutes: z.number().int().positive().max(24 * 60).optional(),
      description: z.string().trim().min(1).max(2000),
      sourceType: sourceTypeSchema.default("manual"),
      sourceId: z.number().int().positive().optional(),
      occurredAt: z.coerce.date().optional(),
    }))
    .mutation(async ({ input }) => {
      await assertActiveMember(input.householdId, input.recordedByMemberId);
      const responsibleMember = await allowSelectedMember(input.householdId, input.recordedByMemberId, input.memberId ?? input.recordedByMemberId);
      validateEffort(input.entryType, input.amount, input.minutes);
      const db = await getDb();
      if (!db) throw new Error("Datenbank nicht verfügbar");
      const [created] = await db.insert(balanceEntries).values({
        householdId: input.householdId,
        memberId: responsibleMember.id,
        memberName: responsibleMember.memberName,
        recordedByMemberId: input.recordedByMemberId,
        entryType: input.entryType,
        amount: input.entryType === "payment" ? String(input.amount) : null,
        minutes: input.entryType === "work" ? input.minutes : null,
        description: input.description,
        sourceType: input.sourceType,
        sourceId: input.sourceId ?? null,
        occurredAt: input.occurredAt ?? new Date(),
      });
      const entryId = Number((created as any).insertId);
      await createActivityLog({
        householdId: input.householdId,
        memberId: input.recordedByMemberId,
        activityType: "other",
        action: "balance_entry_created",
        description: `${responsibleMember.memberName} hat ${formatEntry(input.entryType, input.amount, input.minutes)}: ${input.description}`,
        relatedItemId: entryId,
        metadata: { balanceEntryId: entryId, entryType: input.entryType, sourceType: input.sourceType, sourceId: input.sourceId },
      });
      return { success: true, entryId };
    }),

  update: publicProcedure
    .input(z.object({
      householdId: z.number(), entryId: z.number(), editorMemberId: z.number(), memberId: z.number().optional(),
      amount: z.number().positive().max(9999999).optional(), minutes: z.number().int().positive().max(24 * 60).optional(),
      description: z.string().trim().min(1).max(2000).optional(), occurredAt: z.coerce.date().optional(),
    }))
    .mutation(async ({ input }) => {
      await assertActiveMember(input.householdId, input.editorMemberId);
      const db = await getDb();
      if (!db) throw new Error("Datenbank nicht verfügbar");
      const entry = (await db.select().from(balanceEntries).where(and(eq(balanceEntries.id, input.entryId), eq(balanceEntries.householdId, input.householdId))).limit(1))[0];
      if (!entry) throw new TRPCError({ code: "NOT_FOUND", message: "Bilanzaufwand nicht gefunden." });
      if (entry.recordedByMemberId !== input.editorMemberId) throw new TRPCError({ code: "FORBIDDEN", message: "Nur die erfassende Person kann diesen Bilanzaufwand ändern." });
      if (!canModifyBalanceEntry(entry.createdAt)) throw new TRPCError({ code: "FORBIDDEN", message: "Bilanzaufwände können nur fünf Tage lang geändert werden." });
      validateEffort(entry.entryType, input.amount ?? Number(entry.amount), input.minutes ?? entry.minutes);
      const responsibleMember = input.memberId !== undefined
        ? await allowSelectedMember(input.householdId, input.editorMemberId, input.memberId)
        : null;
      await db.update(balanceEntries).set({
        ...(responsibleMember ? { memberId: responsibleMember.id, memberName: responsibleMember.memberName } : {}),
        ...(input.amount !== undefined && entry.entryType === "payment" ? { amount: String(input.amount) } : {}),
        ...(input.minutes !== undefined && entry.entryType === "work" ? { minutes: input.minutes } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.occurredAt !== undefined ? { occurredAt: input.occurredAt } : {}),
      }).where(eq(balanceEntries.id, input.entryId));
      await createActivityLog({ householdId: input.householdId, memberId: input.editorMemberId, activityType: "other", action: "balance_entry_updated", description: `Bilanzaufwand „${entry.description}" wurde geändert.`, relatedItemId: input.entryId, metadata: { balanceEntryId: input.entryId } });
      return { success: true };
    }),

  remove: publicProcedure
    .input(z.object({ householdId: z.number(), entryId: z.number(), editorMemberId: z.number() }))
    .mutation(async ({ input }) => {
      await assertActiveMember(input.householdId, input.editorMemberId);
      const db = await getDb();
      if (!db) throw new Error("Datenbank nicht verfügbar");
      const entry = (await db.select().from(balanceEntries).where(and(eq(balanceEntries.id, input.entryId), eq(balanceEntries.householdId, input.householdId))).limit(1))[0];
      if (!entry) throw new TRPCError({ code: "NOT_FOUND", message: "Bilanzaufwand nicht gefunden." });
      if (entry.recordedByMemberId !== input.editorMemberId) throw new TRPCError({ code: "FORBIDDEN", message: "Nur die erfassende Person kann diesen Bilanzaufwand löschen." });
      if (!canModifyBalanceEntry(entry.createdAt)) throw new TRPCError({ code: "FORBIDDEN", message: "Bilanzaufwände können nur fünf Tage lang gelöscht werden." });
      await db.delete(balanceEntries).where(eq(balanceEntries.id, input.entryId));
      await createActivityLog({ householdId: input.householdId, memberId: input.editorMemberId, activityType: "other", action: "balance_entry_deleted", description: `Bilanzaufwand „${entry.description}" wurde gelöscht.`, relatedItemId: input.entryId, metadata: { balanceEntryId: input.entryId } });
      return { success: true };
    }),
});
