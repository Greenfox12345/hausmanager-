import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { householdConnections, households, householdMembers, sharedTasks } from "../../drizzle/schema";
import { eq, and, or, inArray } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

export const neighborhoodRouter = router({
  /**
   * Send invitation to connect with another household
   */
  sendInvitation: protectedProcedure
    .input(z.object({
      targetHouseholdId: z.number(),
      householdId: z.number(),
      memberId: z.number(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { targetHouseholdId, householdId, memberId } = input;
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      // Check if connection already exists
      const existing = await db.select().from(householdConnections)
        .where(
          or(
            and(
              eq(householdConnections.requestingHouseholdId, householdId),
              eq(householdConnections.targetHouseholdId, targetHouseholdId)
            ),
            and(
              eq(householdConnections.requestingHouseholdId, targetHouseholdId),
              eq(householdConnections.targetHouseholdId, householdId)
            )
          )
        );

      if (existing.length > 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Eine Verbindung zwischen diesen Haushalten existiert bereits",
        });
      }

      const [connection] = await db.insert(householdConnections).values({
        requestingHouseholdId: householdId,
        targetHouseholdId,
        requestedBy: memberId,
        status: "pending",
      }).$returningId();

      return connection;
    }),

  /**
   * Get all pending invitations for a household
   */
  getPendingInvitations: protectedProcedure
    .input(z.object({
      householdId: z.number(),
    }))
    .query(async ({ input }) => {
      const { householdId } = input;
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const invitations = await db.select({
        id: householdConnections.id,
        requestingHouseholdId: householdConnections.requestingHouseholdId,
        requestingHouseholdName: households.name,
        requesterName: householdMembers.memberName,
        createdAt: householdConnections.createdAt,
        status: householdConnections.status,
      })
        .from(householdConnections)
        .leftJoin(households, eq(householdConnections.requestingHouseholdId, households.id))
        .leftJoin(householdMembers, eq(householdConnections.requestedBy, householdMembers.id))
        .where(
          and(
            eq(householdConnections.targetHouseholdId, householdId),
            eq(householdConnections.status, "pending")
          )
        );

      return invitations;
    }),

  /**
   * Accept household invitation
   */
  acceptInvitation: protectedProcedure
    .input(z.object({
      connectionId: z.number(),
    }))
    .mutation(async ({ input }) => {
      const { connectionId } = input;
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      await db.update(householdConnections)
        .set({ status: "accepted" })
        .where(eq(householdConnections.id, connectionId));

      return { success: true };
    }),

  /**
   * Reject household invitation
   */
  rejectInvitation: protectedProcedure
    .input(z.object({
      connectionId: z.number(),
    }))
    .mutation(async ({ input }) => {
      const { connectionId } = input;
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      await db.update(householdConnections)
        .set({ status: "rejected" })
        .where(eq(householdConnections.id, connectionId));

      return { success: true };
    }),

  /**
   * Get all connected households for a household
   */
  getConnectedHouseholds: protectedProcedure
    .input(z.object({
      householdId: z.number(),
    }))
    .query(async ({ input }) => {
      const { householdId } = input;
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      // Get connections where this household is either requesting or target, and status is accepted
      const connections = await db.select({
        connectionId: householdConnections.id,
        requestingHouseholdId: householdConnections.requestingHouseholdId,
        targetHouseholdId: householdConnections.targetHouseholdId,
      })
        .from(householdConnections)
        .where(
          and(
            or(
              eq(householdConnections.requestingHouseholdId, householdId),
              eq(householdConnections.targetHouseholdId, householdId)
            ),
            eq(householdConnections.status, "accepted")
          )
        );

      // Get the household IDs that are connected (not including the current household)
      const connectedHouseholdIds = connections.map((conn: any) =>
        conn.requestingHouseholdId === householdId ? conn.targetHouseholdId : conn.requestingHouseholdId
      );

      if (connectedHouseholdIds.length === 0) {
        return [];
      }

      // Fetch household details
      const connectedHouseholds = await db.select({
        id: households.id,
        name: households.name,
        createdAt: households.createdAt,
      })
        .from(households)
        .where(inArray(households.id, connectedHouseholdIds));

      return connectedHouseholds;
    }),

  /**
   * Get all members from connected households (for task assignment)
   */
  getConnectedMembers: protectedProcedure
    .input(z.object({
      householdId: z.number(),
    }))
    .query(async ({ input }) => {
      const { householdId } = input;
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      // Get connected household IDs
      const connections = await db.select({
        requestingHouseholdId: householdConnections.requestingHouseholdId,
        targetHouseholdId: householdConnections.targetHouseholdId,
      })
        .from(householdConnections)
        .where(
          and(
            or(
              eq(householdConnections.requestingHouseholdId, householdId),
              eq(householdConnections.targetHouseholdId, householdId)
            ),
            eq(householdConnections.status, "accepted")
          )
        );

      const connectedHouseholdIds = connections.map((conn: any) =>
        conn.requestingHouseholdId === householdId ? conn.targetHouseholdId : conn.requestingHouseholdId
      );

      if (connectedHouseholdIds.length === 0) {
        return [];
      }

      // Fetch members from connected households
      const members = await db.select({
        id: householdMembers.id,
        memberName: householdMembers.memberName,
        photoUrl: householdMembers.photoUrl,
        householdId: householdMembers.householdId,
        householdName: households.name,
      })
        .from(householdMembers)
        .leftJoin(households, eq(householdMembers.householdId, households.id))
        .where(
          and(
            inArray(householdMembers.householdId, connectedHouseholdIds),
            eq(householdMembers.isActive, true)
          )
        );

      return members;
    }),

  /**
   * Remove household connection
   */
  removeConnection: protectedProcedure
    .input(z.object({
      householdId: z.number(),
      targetHouseholdId: z.number(),
    }))
    .mutation(async ({ input }) => {
      const { householdId, targetHouseholdId } = input;
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      await db.delete(householdConnections)
        .where(
          or(
            and(
              eq(householdConnections.requestingHouseholdId, householdId),
              eq(householdConnections.targetHouseholdId, targetHouseholdId)
            ),
            and(
              eq(householdConnections.requestingHouseholdId, targetHouseholdId),
              eq(householdConnections.targetHouseholdId, householdId)
            )
          )
        );

      return { success: true };
    }),

  /**
   * Search households by name or invite code
   */
  searchHouseholds: protectedProcedure
    .input(z.object({
      query: z.string(),
      currentHouseholdId: z.number(),
    }))
    .query(async ({ input }) => {
      const { query, currentHouseholdId } = input;
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      // Search by name or invite code
      const results = await db.select({
        id: households.id,
        name: households.name,
        inviteCode: households.inviteCode,
      })
        .from(households)
        .where(
          and(
            or(
              eq(households.name, query),
              eq(households.inviteCode, query)
            ),
            // Exclude current household
            eq(households.id, currentHouseholdId) // This will be negated in the filter below
          )
        );

      // Filter out current household (since we can't use NOT in the where clause easily)
      return results.filter((h: any) => h.id !== currentHouseholdId);
    }),
});
