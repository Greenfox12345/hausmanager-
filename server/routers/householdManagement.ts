import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb, createActivityLog } from "../db";
import {
  memberLeft,
  adminTransferred,
  dissolveVoteCast,
  dissolveVoteRetracted,
  householdLanguageChanged,
} from "../activityTexts";
import { households, householdMembers, users, shoppingCategories, householdDissolveVotes } from "../../drizzle/schema";
import { eq, and, count, asc, ne } from "drizzle-orm";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

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
   * User is automatically added as first member using their account name
   */
  createHousehold: publicProcedure
    .input(
      z.object({
        householdName: z.string().min(1),
        language: z.string().min(2).max(10).optional().default("de"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Get userId from JWT token
      const authHeader = ctx.req.headers.authorization;
      const token = authHeader?.replace('Bearer ', '') || ctx.req.cookies?.auth_token;
      
      if (!token) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Not authenticated',
        });
      }

      let decoded: { userId: number; email: string };
      try {
        decoded = jwt.verify(token, JWT_SECRET) as { userId: number; email: string };
      } catch (error) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Invalid token',
        });
      }
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

      // Get user info from database
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, decoded.userId))
        .limit(1);

      if (!user) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User not found',
        });
      }

      // Create household
      const [newHousehold] = await db.insert(households).values({
        name: input.householdName,
        passwordHash: null, // No household password for new system
        inviteCode,
        language: input.language ?? "de",
        createdBy: decoded.userId,
      });

      // Create household member (use user's name, no separate member password)
      const [newMember] = await db.insert(householdMembers).values({
        householdId: newHousehold.insertId,
        userId: decoded.userId,
        memberName: user.name,
        passwordHash: null, // No separate member password in new system
        isActive: true,
      });

      // Create default inventory categories
      const defaultCategories = [
        { name: input.language === "en" ? "Food" : input.language === "es" ? "Alimentos" : input.language === "fr" ? "Alimentation" : input.language === "zh" ? "食品" : input.language === "tr" ? "Gıda" : input.language === "ar" ? "طعام" : "Lebensmittel", color: "#EF4444" },
        { name: input.language === "en" ? "Cleaning" : input.language === "es" ? "Limpieza" : input.language === "fr" ? "Nettoyage" : input.language === "zh" ? "清洁" : input.language === "tr" ? "Temizlik" : input.language === "ar" ? "تنظيف" : "Reinigung", color: "#EAB308" },
        { name: input.language === "en" ? "Tools" : input.language === "es" ? "Herramientas" : input.language === "fr" ? "Outils" : input.language === "zh" ? "工具" : input.language === "tr" ? "Araçlar" : input.language === "ar" ? "أدوات" : "Werkzeug", color: "#22C55E" },
      ];
      await db.insert(shoppingCategories).values(
        defaultCategories.map((cat) => ({
          householdId: newHousehold.insertId,
          name: cat.name,
          color: cat.color,
        }))
      );

      return {
        success: true,
        household: {
          id: newHousehold.insertId,
          name: input.householdName,
          inviteCode,
        },
        member: {
          id: newMember.insertId,
          name: user.name,
        },
      };
    }),

  /**
   * Join an existing household with invite code
   * Uses JWT token to identify user (like createHousehold)
   */
  joinHousehold: publicProcedure
    .input(
      z.object({
        inviteCode: z.string().length(8),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Get userId from JWT token
      const authHeader = ctx.req.headers.authorization;
      const token = authHeader?.replace('Bearer ', '') || ctx.req.cookies?.auth_token;
      
      if (!token) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Not authenticated',
        });
      }

      let decoded: { userId: number; email: string };
      try {
        decoded = jwt.verify(token, JWT_SECRET) as { userId: number; email: string };
      } catch (error) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Invalid token',
        });
      }

      const db = await getDb();
      if (!db) throw new Error("Database connection failed");

      // Get user info from database
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, decoded.userId))
        .limit(1);

      if (!user) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User not found',
        });
      }

      // Find household by invite code
      const [household] = await db
        .select()
        .from(households)
        .where(eq(households.inviteCode, input.inviteCode))
        .limit(1);

      if (!household) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Invalid invite code',
        });
      }

      // Check if user is already a member
      const existingMember = await db
        .select()
        .from(householdMembers)
        .where(
          and(
            eq(householdMembers.householdId, household.id),
            eq(householdMembers.userId, decoded.userId)
          )
        )
        .limit(1);

      if (existingMember.length > 0) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'You are already a member of this household',
        });
      }

      // Create household member (use user's name, no separate member password)
      const [newMember] = await db.insert(householdMembers).values({
        householdId: household.id,
        userId: decoded.userId,
        memberName: user.name,
        passwordHash: null, // No separate member password in new system
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
          name: user.name,
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
      if (!member.passwordHash) {
        throw new Error("Member has no password set");
      }
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

  /**
   * Switch to a household (no password required in new system)
   * User must be a member of the household
   */
  switchHousehold: publicProcedure
    .input(
      z.object({
        householdId: z.number(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Get userId from JWT token
      const authHeader = ctx.req.headers.authorization;
      const token = authHeader?.replace('Bearer ', '') || ctx.req.cookies?.auth_token;
      
      if (!token) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Not authenticated',
        });
      }

      let decoded: { userId: number; email: string };
      try {
        decoded = jwt.verify(token, JWT_SECRET) as { userId: number; email: string };
      } catch (error) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Invalid token',
        });
      }

      const db = await getDb();
      if (!db) throw new Error("Database connection failed");

      // Find member
      const [member] = await db
        .select()
        .from(householdMembers)
        .where(
          and(
            eq(householdMembers.userId, decoded.userId),
            eq(householdMembers.householdId, input.householdId),
            eq(householdMembers.isActive, true)
          )
        )
        .limit(1);

      if (!member) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'You are not a member of this household',
        });
      }

      // Get household info
      const [household] = await db
        .select()
        .from(households)
        .where(eq(households.id, input.householdId))
        .limit(1);

      if (!household) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Household not found',
        });
      }

      return {
        success: true,
        householdId: input.householdId,
        householdName: household.name,
        memberId: member.id,
        memberName: member.memberName,
        inviteCode: household.inviteCode,
      };
    }),

  /**
   * Get household settings including language
   */
  getHouseholdSettings: protectedProcedure
    .input(
      z.object({
        householdId: z.number(),
      })
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");

      // Verify user is a member of this household
      const [member] = await db
        .select()
        .from(householdMembers)
        .where(
          and(
            eq(householdMembers.userId, ctx.user.id),
            eq(householdMembers.householdId, input.householdId),
            eq(householdMembers.isActive, true)
          )
        )
        .limit(1);

      if (!member) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You are not a member of this household",
        });
      }

      const [household] = await db
        .select()
        .from(households)
        .where(eq(households.id, input.householdId))
        .limit(1);

      if (!household) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Household not found" });
      }

      // Admin = the user who created the household
      const isAdmin = household.createdBy === ctx.user.id;

      return {
        id: household.id,
        name: household.name,
        language: household.language || "de",
        inviteCode: household.inviteCode,
        isAdmin,
        adminUserId: household.createdBy,
      };
    }),

  /**
   * Update household language (admin only)
   * This language is used for history entries and notifications visible to all members
   */
  updateHouseholdLanguage: protectedProcedure
    .input(
      z.object({
        householdId: z.number(),
        language: z.string().min(2).max(10),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");

      // Verify user is an admin of this household
      const [member] = await db
        .select()
        .from(householdMembers)
        .where(
          and(
            eq(householdMembers.userId, ctx.user.id),
            eq(householdMembers.householdId, input.householdId),
            eq(householdMembers.isActive, true)
          )
        )
        .limit(1);

      if (!member) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You are not a member of this household",
        });
      }

      // Check if user is the household creator (admin)
      const [household] = await db
        .select()
        .from(households)
        .where(eq(households.id, input.householdId))
        .limit(1);

      if (!household) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Household not found" });
      }

      if (household.createdBy !== ctx.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only the household creator can change the language",
        });
      }

      await db
        .update(households)
        .set({ language: input.language })
        .where(eq(households.id, input.householdId));

      // Log the language change (use new language for the log text)
      const newLang = (input.language as "de" | "en" | "es" | "fr" | "zh" | "tr" | "ar");
      await createActivityLog({
        householdId: input.householdId,
        memberId: member.id,
        activityType: "member",
        action: "householdLanguageChanged",
        description: householdLanguageChanged(newLang, member.memberName, input.language),
      });

      return { success: true, language: input.language };
    }),

  /**
   * Get current household member for authenticated user
   */
  getCurrentMember: protectedProcedure
    .input(
      z.object({
        householdId: z.number(),
      })
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");

      const [member] = await db
        .select()
        .from(householdMembers)
        .where(
          and(
            eq(householdMembers.userId, ctx.user.id),
            eq(householdMembers.householdId, input.householdId),
            eq(householdMembers.isActive, true)
          )
        )
        .limit(1);

      if (!member) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "You are not a member of this household",
        });
      }

      return member;
    }),

  /**
   * Leave a household.
   * If the household has no active members left after leaving, it is automatically dissolved.
   */
  leaveHousehold: protectedProcedure
    .input(z.object({ householdId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");

      // Find the member record for this user in this household
      const [member] = await db
        .select()
        .from(householdMembers)
        .where(
          and(
            eq(householdMembers.userId, ctx.user.id),
            eq(householdMembers.householdId, input.householdId),
            eq(householdMembers.isActive, true)
          )
        )
        .limit(1);

      if (!member) {
        throw new TRPCError({ code: "NOT_FOUND", message: "You are not a member of this household" });
      }

      // Deactivate the member
      await db
        .update(householdMembers)
        .set({ isActive: false })
        .where(eq(householdMembers.id, member.id));

      // Count remaining active members
      const [{ value: remaining }] = await db
        .select({ value: count() })
        .from(householdMembers)
        .where(
          and(
            eq(householdMembers.householdId, input.householdId),
            eq(householdMembers.isActive, true)
          )
        );

      // If no members left, dissolve the household
      if (remaining === 0) {
        await db.delete(households).where(eq(households.id, input.householdId));
        return { success: true, dissolved: true, newAdminName: null };
      }

      // If the leaving user was the admin (createdBy), transfer admin to the oldest remaining member
      const [household] = await db
        .select()
        .from(households)
        .where(eq(households.id, input.householdId))
        .limit(1);

      let newAdminName: string | null = null;
      const lang = (household?.language || "de") as "de" | "en" | "es" | "fr";

      if (household && household.createdBy === ctx.user.id) {
        // Find the oldest active member who is NOT the leaving user
        const [nextAdmin] = await db
          .select()
          .from(householdMembers)
          .where(
            and(
              eq(householdMembers.householdId, input.householdId),
              eq(householdMembers.isActive, true),
              ne(householdMembers.userId, ctx.user.id)
            )
          )
          .orderBy(asc(householdMembers.createdAt))
          .limit(1);

        if (nextAdmin?.userId) {
          await db
            .update(households)
            .set({ createdBy: nextAdmin.userId })
            .where(eq(households.id, input.householdId));
          newAdminName = nextAdmin.memberName;
        }
      }

      // Log the leave action
      const description = newAdminName
        ? memberLeft(lang, member.memberName, newAdminName)
        : memberLeft(lang, member.memberName);
      await createActivityLog({
        householdId: input.householdId,
        memberId: member.id,
        activityType: "member",
        action: "memberLeft",
        description,
      });

      return { success: true, dissolved: false, newAdminName };
    }),

  /**
   * Vote to dissolve the household.
   * Dissolution happens automatically when a strict majority (> 50%) of active members have voted.
   */
  voteDissolveHousehold: protectedProcedure
    .input(z.object({ householdId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");

      // Verify membership
      const [member] = await db
        .select()
        .from(householdMembers)
        .where(
          and(
            eq(householdMembers.userId, ctx.user.id),
            eq(householdMembers.householdId, input.householdId),
            eq(householdMembers.isActive, true)
          )
        )
        .limit(1);

      if (!member) {
        throw new TRPCError({ code: "NOT_FOUND", message: "You are not a member of this household" });
      }

      // Prevent duplicate votes
      const existingVote = await db
        .select()
        .from(householdDissolveVotes)
        .where(
          and(
            eq(householdDissolveVotes.householdId, input.householdId),
            eq(householdDissolveVotes.memberId, member.id)
          )
        )
        .limit(1);

      if (existingVote.length > 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "You have already voted to dissolve this household" });
      }

      // Record vote
      await db.insert(householdDissolveVotes).values({
        householdId: input.householdId,
        memberId: member.id,
      });

      // Count active members and votes
      const [{ value: totalMembers }] = await db
        .select({ value: count() })
        .from(householdMembers)
        .where(
          and(
            eq(householdMembers.householdId, input.householdId),
            eq(householdMembers.isActive, true)
          )
        );

      const [{ value: voteCount }] = await db
        .select({ value: count() })
        .from(householdDissolveVotes)
        .where(eq(householdDissolveVotes.householdId, input.householdId));

      // Majority reached? (strict majority: more than half)
      if (voteCount > totalMembers / 2) {
        await db.delete(households).where(eq(households.id, input.householdId));
        return { success: true, dissolved: true, voteCount, totalMembers };
      }

      // Log the vote
      const [hh] = await db.select().from(households).where(eq(households.id, input.householdId)).limit(1);
      const voteLang = ((hh?.language || "de") as "de" | "en" | "es" | "fr" | "zh" | "tr" | "ar");
      const votesNeeded = Math.floor(totalMembers / 2) + 1;
      await createActivityLog({
        householdId: input.householdId,
        memberId: member.id,
        activityType: "member",
        action: "dissolveVoteCast",
        description: dissolveVoteCast(voteLang, member.memberName, voteCount, votesNeeded),
      });

      return { success: true, dissolved: false, voteCount, totalMembers };
    }),

  /**
   * Retract a previously cast dissolve vote.
   */
  retractDissolveVote: protectedProcedure
    .input(z.object({ householdId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");

      const [member] = await db
        .select()
        .from(householdMembers)
        .where(
          and(
            eq(householdMembers.userId, ctx.user.id),
            eq(householdMembers.householdId, input.householdId),
            eq(householdMembers.isActive, true)
          )
        )
        .limit(1);

      if (!member) {
        throw new TRPCError({ code: "NOT_FOUND", message: "You are not a member of this household" });
      }

      await db
        .delete(householdDissolveVotes)
        .where(
          and(
            eq(householdDissolveVotes.householdId, input.householdId),
            eq(householdDissolveVotes.memberId, member.id)
          )
        );

      // Log the retraction
      const [hhRetract] = await db.select().from(households).where(eq(households.id, input.householdId)).limit(1);
      const retractLang = ((hhRetract?.language || "de") as "de" | "en" | "es" | "fr" | "zh" | "tr" | "ar");
      await createActivityLog({
        householdId: input.householdId,
        memberId: member.id,
        activityType: "member",
        action: "dissolveVoteRetracted",
        description: dissolveVoteRetracted(retractLang, member.memberName),
      });

      return { success: true };
    }),

  /**
   * Get dissolve vote status for a household.
   */
  getDissolveStatus: protectedProcedure
    .input(z.object({ householdId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");

      const [member] = await db
        .select()
        .from(householdMembers)
        .where(
          and(
            eq(householdMembers.userId, ctx.user.id),
            eq(householdMembers.householdId, input.householdId),
            eq(householdMembers.isActive, true)
          )
        )
        .limit(1);

      const [{ value: totalMembers }] = await db
        .select({ value: count() })
        .from(householdMembers)
        .where(
          and(
            eq(householdMembers.householdId, input.householdId),
            eq(householdMembers.isActive, true)
          )
        );

      const [{ value: voteCount }] = await db
        .select({ value: count() })
        .from(householdDissolveVotes)
        .where(eq(householdDissolveVotes.householdId, input.householdId));

      const hasVoted = member
        ? (await db
            .select()
            .from(householdDissolveVotes)
            .where(
              and(
                eq(householdDissolveVotes.householdId, input.householdId),
                eq(householdDissolveVotes.memberId, member.id)
              )
            )
            .limit(1)).length > 0
        : false;

      return {
        totalMembers,
        voteCount,
        hasVoted,
        majorityNeeded: Math.floor(totalMembers / 2) + 1,
      };
    }),

  /**
   * Transfer admin role to another active member of the household.
   * Only the current admin (createdBy) can call this.
   */
  transferAdmin: protectedProcedure
    .input(z.object({
      householdId: z.number(),
      targetMemberId: z.number(), // householdMembers.id of the new admin
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");

      // Verify caller is current admin
      const [household] = await db
        .select()
        .from(households)
        .where(eq(households.id, input.householdId))
        .limit(1);

      if (!household) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Household not found" });
      }
      if (household.createdBy !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only the current admin can transfer the admin role" });
      }

      // Verify target member exists, is active, and belongs to this household
      const [targetMember] = await db
        .select()
        .from(householdMembers)
        .where(
          and(
            eq(householdMembers.id, input.targetMemberId),
            eq(householdMembers.householdId, input.householdId),
            eq(householdMembers.isActive, true)
          )
        )
        .limit(1);

      if (!targetMember) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Target member not found or inactive" });
      }
      if (!targetMember.userId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Target member has no user account" });
      }
      if (targetMember.userId === ctx.user.id) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "You are already the admin" });
      }

      // Transfer admin
      await db
        .update(households)
        .set({ createdBy: targetMember.userId })
        .where(eq(households.id, input.householdId));

      // Get caller's member record for the log
      const [callerMember] = await db
        .select()
        .from(householdMembers)
        .where(
          and(
            eq(householdMembers.userId, ctx.user.id),
            eq(householdMembers.householdId, input.householdId),
            eq(householdMembers.isActive, true)
          )
        )
        .limit(1);

      const transferLang = ((household.language || "de") as "de" | "en" | "es" | "fr" | "zh" | "tr" | "ar");
      await createActivityLog({
        householdId: input.householdId,
        memberId: callerMember?.id ?? 0,
        activityType: "member",
        action: "adminTransferred",
        description: adminTransferred(transferLang, callerMember?.memberName ?? "Admin", targetMember.memberName),
      });

      return { success: true, newAdminName: targetMember.memberName };
    }),
});
