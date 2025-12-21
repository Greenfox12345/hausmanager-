import { z } from "zod";
import bcrypt from "bcrypt";
import { publicProcedure, router } from "../_core/trpc";
import {
  createHousehold,
  getHouseholdByName,
  createHouseholdMember,
  getHouseholdMembers,
  getHouseholdMemberByName,
  getHouseholdMemberById,
  getAllHouseholds,
  getActivityHistory,
} from "../db";

const SALT_ROUNDS = 10;

export const authRouter = router({
  // Get all households for selection
  listHouseholds: publicProcedure.query(async () => {
    const households = await getAllHouseholds();
    return households.map(h => ({
      id: h.id,
      name: h.name,
      createdAt: h.createdAt,
    }));
  }),

  // Create new household
  createHousehold: publicProcedure
    .input(
      z.object({
        name: z.string().min(1),
        password: z.string().min(4),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user) {
        throw new Error("User must be authenticated");
      }

      // Check if household name already exists
      const existing = await getHouseholdByName(input.name);
      if (existing) {
        throw new Error("Household name already exists");
      }

      const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);
      const householdId = await createHousehold(input.name, passwordHash, ctx.user.id);

      return { householdId, name: input.name };
    }),

  // Login to household
  loginHousehold: publicProcedure
    .input(
      z.object({
        name: z.string(),
        password: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const household = await getHouseholdByName(input.name);
      if (!household) {
        throw new Error("Household not found");
      }

      const isValid = await bcrypt.compare(input.password, household.passwordHash);
      if (!isValid) {
        throw new Error("Invalid password");
      }

      return { 
        householdId: household.id, 
        name: household.name,
      };
    }),

  // Get household members
  getHouseholdMembers: publicProcedure
    .input(z.object({ householdId: z.number() }))
    .query(async ({ input }) => {
      const members = await getHouseholdMembers(input.householdId);
      return members.map(m => ({
        id: m.id,
        memberName: m.memberName,
        photoUrl: m.photoUrl,
        isActive: m.isActive,
      }));
    }),

  // Create household member
  createMember: publicProcedure
    .input(
      z.object({
        householdId: z.number(),
        memberName: z.string().min(1),
        password: z.string().min(4),
        photoUrl: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user) {
        throw new Error("User must be authenticated");
      }

      // Check if member name already exists in household
      const existing = await getHouseholdMemberByName(input.householdId, input.memberName);
      if (existing) {
        throw new Error("Member name already exists in this household");
      }

      const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);
      const memberId = await createHouseholdMember({
        householdId: input.householdId,
        userId: ctx.user.id,
        memberName: input.memberName,
        passwordHash,
        photoUrl: input.photoUrl,
      });

      return { memberId, memberName: input.memberName };
    }),

  // Login as household member
  loginMember: publicProcedure
    .input(
      z.object({
        householdId: z.number(),
        memberName: z.string(),
        password: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const member = await getHouseholdMemberByName(input.householdId, input.memberName);
      if (!member) {
        throw new Error("Member not found");
      }

      const isValid = await bcrypt.compare(input.password, member.passwordHash);
      if (!isValid) {
        throw new Error("Invalid password");
      }

      return {
        memberId: member.id,
        memberName: member.memberName,
        householdId: member.householdId,
        photoUrl: member.photoUrl,
      };
    }),

  // Get current member info
  getMemberInfo: publicProcedure
    .input(z.object({ memberId: z.number() }))
    .query(async ({ input }) => {
      const member = await getHouseholdMemberById(input.memberId);
      if (!member) {
        throw new Error("Member not found");
      }

      return {
        id: member.id,
        memberName: member.memberName,
        householdId: member.householdId,
        photoUrl: member.photoUrl,
        isActive: member.isActive,
      };
    }),

  // Get activity history for household
  getActivityHistory: publicProcedure
    .input(z.object({ householdId: z.number() }))
    .query(async ({ input }) => {
      const activities = await getActivityHistory(input.householdId, 100);
      
      // Get member names
      const members = await getHouseholdMembers(input.householdId);
      const memberMap = new Map(members.map(m => [m.id, m.memberName]));
      
      return activities.map(activity => ({
        ...activity,
        memberName: memberMap.get(activity.memberId) || "Unbekannt",
      }));
    }),
});
