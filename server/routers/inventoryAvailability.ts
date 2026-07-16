import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { borrowRequests, householdMembers, inventoryItems, householdConnections, itemUnits } from "../../drizzle/schema";
import { and, eq, or, lte, gte } from "drizzle-orm";
import { getDb } from "../db";

export const inventoryAvailabilityRouter = router({
  /**
   * Check quantity-aware availability for an inventory item in a given time period.
   * Returns available quantity, conflicting borrows (with borrower name visibility rules),
   * and current reservation/loan status for the inventory card display.
   */
  checkItemAvailability: protectedProcedure
    .input(z.object({
      inventoryItemId: z.number(),
      startDate: z.date().optional(),
      endDate: z.date().optional(),
      /** Current member's ID – used for borrower name visibility */
      currentMemberId: z.number().optional(),
      /** Current household ID – used for borrower name visibility */
      currentHouseholdId: z.number().optional(),
    }))
    .query(async ({ input }) => {
      const { inventoryItemId, startDate, endDate, currentMemberId, currentHouseholdId } = input;

      // Wenn kein Zeitraum angegeben: Gesamtbestand ohne Konfliktprüfung zurückgeben
      const noDatesProvided = !startDate && !endDate;

      const checkStart = startDate || new Date();
      const checkEnd = endDate || new Date();

      const db = await getDb();
      if (!db) return {
        status: "available" as const,
        availableQuantity: null,
        totalQuantity: null,
        conflictingBorrows: [],
        currentlyBorrowed: 0,
        currentlyReserved: 0,
      };

      // Fetch item to get total quantity
      const [item] = await db
        .select({ quantity: inventoryItems.quantity, unitId: inventoryItems.unitId })
        .from(inventoryItems)
        .where(eq(inventoryItems.id, inventoryItemId))
        .limit(1);

      const totalQty: number | null = item?.quantity != null ? Number(item.quantity) : null;

      // Fetch unit info for display
      let unitSymbol: string | null = null;
      let unitName: string | null = null;
      if (item?.unitId) {
        const [unitRow] = await db
          .select({ symbol: itemUnits.symbol, name: itemUnits.name })
          .from(itemUnits)
          .where(eq(itemUnits.id, item.unitId))
          .limit(1);
        unitSymbol = unitRow?.symbol ?? null;
        unitName = unitRow?.name ?? null;
      }

      // Wenn kein Zeitraum angegeben: Gesamtbestand direkt zurückgeben (keine Konfliktprüfung)
      if (noDatesProvided) {
        return {
          status: "available" as const,
          availableQuantity: totalQty,
          totalQuantity: totalQty,
          unitSymbol,
          unitName,
          currentlyBorrowed: 0,
          currentlyReserved: 0,
          conflictingBorrows: [],
        };
      }

      // Find overlapping active/approved borrow requests
      const conflictRows = await db
        .select({
          id: borrowRequests.id,
          startDate: borrowRequests.startDate,
          endDate: borrowRequests.endDate,
          status: borrowRequests.status,
          borrowerMemberId: borrowRequests.borrowerMemberId,
          borrowerHouseholdId: borrowRequests.borrowerHouseholdId,
          borrowerName: householdMembers.memberName,
          loanQuantity: borrowRequests.loanQuantity,
          returnedQuantity: borrowRequests.returnedQuantity,
        })
        .from(borrowRequests)
        .leftJoin(householdMembers, eq(borrowRequests.borrowerMemberId, householdMembers.id))
        .where(
          and(
            eq(borrowRequests.inventoryItemId, inventoryItemId),
            or(
              eq(borrowRequests.status, "active"),
              eq(borrowRequests.status, "approved")
            ),
            lte(borrowRequests.startDate, checkEnd),
            gte(borrowRequests.endDate, checkStart)
          )
        );

      // Determine linked/connected households for name visibility
      let linkedHouseholdIds: number[] = [];
      if (currentHouseholdId) {
        const links = await db
          .select({
            requestingHouseholdId: householdConnections.requestingHouseholdId,
            targetHouseholdId: householdConnections.targetHouseholdId,
          })
          .from(householdConnections)
          .where(
            and(
              eq(householdConnections.status, "accepted"),
              or(
                eq(householdConnections.requestingHouseholdId, currentHouseholdId),
                eq(householdConnections.targetHouseholdId, currentHouseholdId)
              )
            )
          );
        linkedHouseholdIds = links
          .flatMap(l => [l.requestingHouseholdId, l.targetHouseholdId])
          .filter(id => id !== currentHouseholdId);
      }

      // Sum up borrowed quantities for the period
      const borrowedInPeriod = conflictRows.reduce((sum, r) => {
        const remaining = r.loanQuantity - r.returnedQuantity;
        return sum + Math.max(0, remaining);
      }, 0);

      const availableQty = totalQty !== null ? Math.max(0, totalQty - borrowedInPeriod) : null;

      // Determine status
      let status: "available" | "partially_available" | "unavailable";
      if (borrowedInPeriod === 0) {
        status = "available";
      } else if (availableQty !== null && availableQty <= 0) {
        status = "unavailable";
      } else {
        status = "partially_available";
      }

      // Current (today) borrowed vs reserved counts for inventory card
      const now = new Date();
      const currentlyBorrowed = conflictRows
        .filter(r => r.status === "active")
        .reduce((s, r) => s + Math.max(0, r.loanQuantity - r.returnedQuantity), 0);
      const currentlyReserved = conflictRows
        .filter(r => r.status === "approved")
        .reduce((s, r) => s + Math.max(0, r.loanQuantity - r.returnedQuantity), 0);

      return {
        status,
        availableQuantity: availableQty,
        totalQuantity: totalQty,
        unitSymbol,
        unitName,
        currentlyBorrowed,
        currentlyReserved,
        conflictingBorrows: conflictRows.map((borrow) => {
          // Borrower name visible if: own request, same household, or linked household
          const canSeeName =
            (currentMemberId && borrow.borrowerMemberId === currentMemberId) ||
            (currentHouseholdId && borrow.borrowerHouseholdId === currentHouseholdId) ||
            (borrow.borrowerHouseholdId !== null && linkedHouseholdIds.includes(borrow.borrowerHouseholdId));

          return {
            id: borrow.id,
            startDate: borrow.startDate,
            endDate: borrow.endDate,
            status: borrow.status,
            borrowerMemberId: borrow.borrowerMemberId,
            borrowerName: canSeeName ? (borrow.borrowerName ?? "Unbekannt") : null,
            loanQuantity: borrow.loanQuantity,
            remainingQuantity: Math.max(0, borrow.loanQuantity - borrow.returnedQuantity),
          };
        }),
      };
    }),

  /**
   * Get availability summaries for all inventory items of a household at once.
   * Used by the inventory card list to show borrowed/reserved/available counts.
   */
  getAllItemsAvailability: protectedProcedure
    .input(z.object({
      householdId: z.number(),
      currentMemberId: z.number().optional(),
      currentHouseholdId: z.number().optional(),
    }))
    .query(async ({ input }) => {
      const { householdId, currentMemberId, currentHouseholdId } = input;
      const now = new Date();

      const db = await getDb();
      if (!db) return {};

      // Fetch all items for this household
      const { inventoryOwnership } = await import("../../drizzle/schema");
      const { inArray } = await import("drizzle-orm");

      const itemRows = await db
        .select({ id: inventoryItems.id, quantity: inventoryItems.quantity })
        .from(inventoryItems)
        .where(eq(inventoryItems.householdId, householdId));

      if (itemRows.length === 0) return {};

      const itemIds = itemRows.map(r => r.id);

      // Fetch all active/approved borrow requests overlapping today for these items
      const activeRows = await db
        .select({
          inventoryItemId: borrowRequests.inventoryItemId,
          id: borrowRequests.id,
          borrowerMemberId: borrowRequests.borrowerMemberId,
          borrowerHouseholdId: borrowRequests.borrowerHouseholdId,
          borrowerName: householdMembers.memberName,
          loanQuantity: borrowRequests.loanQuantity,
          returnedQuantity: borrowRequests.returnedQuantity,
          startDate: borrowRequests.startDate,
          endDate: borrowRequests.endDate,
          status: borrowRequests.status,
        })
        .from(borrowRequests)
        .leftJoin(householdMembers, eq(borrowRequests.borrowerMemberId, householdMembers.id))
        .where(
          and(
            inArray(borrowRequests.inventoryItemId, itemIds),
            or(
              eq(borrowRequests.status, "active"),
              eq(borrowRequests.status, "approved")
            ),
            lte(borrowRequests.startDate, now),
            gte(borrowRequests.endDate, now)
          )
        );

      // Linked households for name visibility
      let linkedHouseholdIds: number[] = [];
      if (currentHouseholdId) {
        const links = await db
          .select({
            requestingHouseholdId: householdConnections.requestingHouseholdId,
            targetHouseholdId: householdConnections.targetHouseholdId,
          })
          .from(householdConnections)
          .where(
            and(
              eq(householdConnections.status, "accepted"),
              or(
                eq(householdConnections.requestingHouseholdId, currentHouseholdId),
                eq(householdConnections.targetHouseholdId, currentHouseholdId)
              )
            )
          );
        linkedHouseholdIds = links
          .flatMap(l => [l.requestingHouseholdId, l.targetHouseholdId])
          .filter(id => id !== currentHouseholdId);
      }

      // Build result map: itemId → summary
      const result: Record<number, {
        totalQuantity: number | null;
        currentlyBorrowed: number;
        currentlyReserved: number;
        availableQuantity: number | null;
        borrowers: Array<{ id: number; status: string; borrowerName: string | null; loanQuantity: number; remainingQuantity: number; startDate: Date; endDate: Date; }>;
      }> = {};

      for (const item of itemRows) {
        const rows = activeRows.filter(r => r.inventoryItemId === item.id);
        const totalQty = item.quantity != null ? Number(item.quantity) : null;
        const currentlyBorrowed = rows
          .filter(r => r.status === "active")
          .reduce((s, r) => s + Math.max(0, r.loanQuantity - r.returnedQuantity), 0);
        const currentlyReserved = rows
          .filter(r => r.status === "approved")
          .reduce((s, r) => s + Math.max(0, r.loanQuantity - r.returnedQuantity), 0);
        const availableQty = totalQty !== null
          ? Math.max(0, totalQty - currentlyBorrowed - currentlyReserved)
          : null;
        const borrowers = rows.map(r => {
          const canSeeName =
            (currentMemberId && r.borrowerMemberId === currentMemberId) ||
            (currentHouseholdId && r.borrowerHouseholdId === currentHouseholdId) ||
            (r.borrowerHouseholdId !== null && linkedHouseholdIds.includes(r.borrowerHouseholdId));
          return {
            id: r.id,
            status: r.status,
            borrowerName: canSeeName ? (r.borrowerName ?? null) : null,
            loanQuantity: r.loanQuantity,
            remainingQuantity: Math.max(0, r.loanQuantity - r.returnedQuantity),
            startDate: r.startDate,
            endDate: r.endDate,
          };
        });
        result[item.id] = { totalQuantity: totalQty, currentlyBorrowed, currentlyReserved, availableQuantity: availableQty, borrowers };
      }

      return result;
    }),

  /**
   * Lightweight summary of current availability for inventory card display.
   * Uses today as the reference date.
   */
  getItemAvailabilitySummary: protectedProcedure
    .input(z.object({
      inventoryItemId: z.number(),
      currentMemberId: z.number().optional(),
      currentHouseholdId: z.number().optional(),
    }))
    .query(async ({ input }) => {
      const { inventoryItemId, currentMemberId, currentHouseholdId } = input;
      const now = new Date();

      const db = await getDb();
      if (!db) return { currentlyBorrowed: 0, currentlyReserved: 0, totalQuantity: null, availableQuantity: null };

      const [item] = await db
        .select({ quantity: inventoryItems.quantity })
        .from(inventoryItems)
        .where(eq(inventoryItems.id, inventoryItemId))
        .limit(1);

      const totalQty: number | null = item?.quantity != null ? Number(item.quantity) : null;

      // Active borrows (already picked up, not yet returned) that overlap today
      const activeRows = await db
        .select({
          id: borrowRequests.id,
          borrowerMemberId: borrowRequests.borrowerMemberId,
          borrowerHouseholdId: borrowRequests.borrowerHouseholdId,
          borrowerName: householdMembers.memberName,
          loanQuantity: borrowRequests.loanQuantity,
          returnedQuantity: borrowRequests.returnedQuantity,
          startDate: borrowRequests.startDate,
          endDate: borrowRequests.endDate,
          status: borrowRequests.status,
        })
        .from(borrowRequests)
        .leftJoin(householdMembers, eq(borrowRequests.borrowerMemberId, householdMembers.id))
        .where(
          and(
            eq(borrowRequests.inventoryItemId, inventoryItemId),
            or(
              eq(borrowRequests.status, "active"),
              eq(borrowRequests.status, "approved")
            ),
            lte(borrowRequests.startDate, now),
            gte(borrowRequests.endDate, now)
          )
        );

      // Linked households for name visibility
      let linkedHouseholdIds: number[] = [];
      if (currentHouseholdId) {
        const links = await db
          .select({
            requestingHouseholdId: householdConnections.requestingHouseholdId,
            targetHouseholdId: householdConnections.targetHouseholdId,
          })
          .from(householdConnections)
          .where(
            and(
              eq(householdConnections.status, "accepted"),
              or(
                eq(householdConnections.requestingHouseholdId, currentHouseholdId),
                eq(householdConnections.targetHouseholdId, currentHouseholdId)
              )
            )
          );
        linkedHouseholdIds = links
          .flatMap(l => [l.requestingHouseholdId, l.targetHouseholdId])
          .filter(id => id !== currentHouseholdId);
      }

      const currentlyBorrowed = activeRows
        .filter(r => r.status === "active")
        .reduce((s, r) => s + Math.max(0, r.loanQuantity - r.returnedQuantity), 0);

      const currentlyReserved = activeRows
        .filter(r => r.status === "approved")
        .reduce((s, r) => s + Math.max(0, r.loanQuantity - r.returnedQuantity), 0);

      const availableQty = totalQty !== null
        ? Math.max(0, totalQty - currentlyBorrowed - currentlyReserved)
        : null;

      const borrowers = activeRows.map(r => {
        const canSeeName =
          (currentMemberId && r.borrowerMemberId === currentMemberId) ||
          (currentHouseholdId && r.borrowerHouseholdId === currentHouseholdId) ||
          (r.borrowerHouseholdId !== null && linkedHouseholdIds.includes(r.borrowerHouseholdId));
        return {
          id: r.id,
          status: r.status,
          borrowerName: canSeeName ? (r.borrowerName ?? null) : null,
          loanQuantity: r.loanQuantity,
          remainingQuantity: Math.max(0, r.loanQuantity - r.returnedQuantity),
          startDate: r.startDate,
          endDate: r.endDate,
        };
      });

      return { currentlyBorrowed, currentlyReserved, totalQuantity: totalQty, availableQuantity: availableQty, borrowers };
    }),
});
