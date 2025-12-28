import { z } from "zod";
import { router, publicProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { households, householdMembers } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";
import bcrypt from "bcryptjs";

/**
 * Generate a random 8-character invite code
 */
function generateInviteCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Household management router
 * Handles household creation, joining, and switching
 */
export const householdManagementRouter = router({
  /**
   * Create a new household
   */
  createHousehold: publicProcedure
    .input(
      z.object({
        userId: z.number(),
        householdName: z.string().min(1),
        memberName: z.string().min(1),
        memberPassword: z.string().min(4),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");

      // Generate unique invite code
      let inviteCode = generateInviteCode();
      let attempts = 0;
      while (attempts < 10) {
        const existing = await db
          .select()
          .from(households)
          .where(eq(households.inviteCode, inviteCode))
          .limit(1);
        if (existing.length === 0) break;
        inviteCode = generateInviteCode();
        attempts++;
      }

      // Create household
      const [newHousehold] = await db.insert(households).values({
        name: input.householdName,
        passwordHash: null, // No household password for new system
        inviteCode,
        createdBy: input.userId,
      });

      // Hash member password
      const memberPasswordHash = await bcrypt.hash(input.memberPassword, 10);

      // Create household member
      const [newMember] = await db.insert(householdMembers).values({
        householdId: newHousehold.insertId,
        userId: input.userId,
        memberName: input.memberName,
        passwordHash: memberPasswordHash,
        isActive: true,
      });

      return {
        success: true,
        household: {
          id: newHousehold.insertId,
          name: input.householdName,
          inviteCode,
        },
        member: {
          id: newMember.insertId,
          name: input.memberName,
        },
      };
    }),

  /**
   * Join an existing household with invite code
   */
  joinHousehold: publicProcedure
    .input(
      z.object({
        userId: z.number(),
        inviteCode: z.string().length(8),
        memberName: z.string().min(1),
        memberPassword: z.string().min(4),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");

      // Find household by invite code
      const [household] = await db
        .select()
        .from(households)
        .where(eq(households.inviteCode, input.inviteCode))
        .limit(1);

      if (!household) {
        throw new Error("Invalid invite code");
      }

      // Check if user is already a member
      const existingMember = await db
        .select()
        .from(householdMembers)
        .where(
          and(
            eq(householdMembers.householdId, household.id),
            eq(householdMembers.userId, input.userId)
          )
        )
        .limit(1);

      if (existingMember.length > 0) {
        throw new Error("You are already a member of this household");
      }

      // Hash member password
      const memberPasswordHash = await bcrypt.hash(input.memberPassword, 10);

      // Create household member
      const [newMember] = await db.insert(householdMembers).values({
        householdId: household.id,
        userId: input.userId,
        memberName: input.memberName,
        passwordHash: memberPasswordHash,
        isActive: true,
      });

      return {
        success: true,
        household: {
          id: household.id,
          name: household.name,
        },
        member: {
          id: newMember.insertId,
          name: input.memberName,
        },
      };
    }),

  /**
   * Get all households for a user
   * Requires userId from input (frontend must provide it)
   */
  listUserHouseholds: publicProcedure
    .input(
      z.object({
        userId: z.number().optional(),
      }).optional()
    )
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");

      // Get userId from input or return empty if not provided
      const userId = input?.userId;
      if (!userId) {
        return [];
      }

      // Get all household memberships for this user
      const memberships = await db
        .select({
          householdId: householdMembers.householdId,
          memberId: householdMembers.id,
          memberName: householdMembers.memberName,
          householdName: households.name,
          inviteCode: households.inviteCode,
        })
        .from(householdMembers)
        .innerJoin(households, eq(householdMembers.householdId, households.id))
        .where(
          and(
            eq(householdMembers.userId, userId),
            eq(householdMembers.isActive, true)
          )
        );

      return memberships.map((m) => ({
        householdId: m.householdId,
        householdName: m.householdName,
        memberId: m.memberId,
        memberName: m.memberName,
        inviteCode: m.inviteCode,
      }));
    }),

  /**
   * Verify member password and create session
   */
  selectHousehold: publicProcedure
    .input(
      z.object({
        userId: z.number(),
        householdId: z.number(),
        memberPassword: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");

      // Find member
      const [member] = await db
        .select()
        .from(householdMembers)
        .where(
          and(
            eq(householdMembers.userId, input.userId),
            eq(householdMembers.householdId, input.householdId),
            eq(householdMembers.isActive, true)
          )
        )
        .limit(1);

      if (!member) {
        throw new Error("Member not found");
      }

      // Verify member password
      const isValid = await bcrypt.compare(
        input.memberPassword,
        member.passwordHash
      );
      if (!isValid) {
        throw new Error("Invalid password");
      }

      // Get household info
      const [household] = await db
        .select()
        .from(households)
        .where(eq(households.id, input.householdId))
        .limit(1);

      return {
        success: true,
        session: {
          userId: input.userId,
          householdId: input.householdId,
          memberId: member.id,
          memberName: member.memberName,
          householdName: household?.name || "",
        },
      };
    }),
});
