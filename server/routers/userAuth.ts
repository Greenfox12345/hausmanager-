import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { users, demoSessions, householdMembers, households } from "../../drizzle/schema";
import { eq, and, isNull } from "drizzle-orm";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production";

/**
 * User authentication router
 * Handles user registration, login, and session management
 */
export const userAuthRouter = router({
  /**
   * Register a new user with email and password
   */
  register: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        password: z.string().min(6),
        name: z.string().min(1),
        demoToken: z.string().optional(), // If present, claim the demo household
        inviteToken: z.string().optional(), // If present, link to existing member slot
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");

      // Check if user already exists
      const existingUser = await db
        .select()
        .from(users)
        .where(eq(users.email, input.email))
        .limit(1);

      if (existingUser.length > 0) {
        throw new Error("User with this email already exists");
      }

      // Hash password
      const passwordHash = await bcrypt.hash(input.password, 10);

      // Create user
      const [newUser] = await db.insert(users).values({
        email: input.email,
        passwordHash,
        name: input.name,
        loginMethod: "email",
      });
      const userId = Number(newUser.insertId);

      // Claim demo session if demoToken provided
      let claimedHouseholdId: number | null = null;
      let claimedMemberId: number | null = null;
      if (input.demoToken) {
        const [session] = await db
          .select()
          .from(demoSessions)
          .where(
            and(
              eq(demoSessions.token, input.demoToken),
              isNull(demoSessions.claimedByUserId)
            )
          )
          .limit(1);

        if (session && session.expiresAt > new Date()) {
          const householdId = session.householdId;

          // 1. Create a NEW member for the registering user (with their real name)
          const [newMemberResult] = await db.insert(householdMembers).values({
            householdId,
            userId,
            memberName: input.name,
            isActive: true,
          });
          const newMemberId = Number(newMemberResult.insertId);

          // 2. Set the household's createdBy to the new user (makes them the owner/admin)
          await db
            .update(households)
            .set({ createdBy: userId })
            .where(eq(households.id, householdId));

          // 3. Mark session as claimed and extend expiry to 30 days
          const newExpiry = new Date();
          newExpiry.setDate(newExpiry.getDate() + 30);
          await db
            .update(demoSessions)
            .set({ claimedByUserId: userId, expiresAt: newExpiry })
            .where(eq(demoSessions.token, input.demoToken));

          claimedHouseholdId = householdId;
          claimedMemberId = newMemberId;
        }
      }

      // Claim invite token if provided (link user to an existing unregistered member slot)
      if (input.inviteToken && !claimedHouseholdId) {
        try {
          const decoded = jwt.verify(input.inviteToken, JWT_SECRET) as {
            householdId: number;
            memberId: number;
            type: string;
          };
          console.log('[invite] decoded token:', decoded);
          if (decoded.type === "member_invite") {
            // Find the member slot
            const [slot] = await db
              .select()
              .from(householdMembers)
              .where(
                and(
                  eq(householdMembers.id, decoded.memberId),
                  eq(householdMembers.householdId, decoded.householdId)
                )
              )
              .limit(1);

            console.log('[invite] slot found:', slot ? `id=${slot.id} userId=${slot.userId}` : 'null');

            if (slot && slot.userId === null) {
              // Slot is free – link the new user to the existing member slot
              await db
                .update(householdMembers)
                .set({ userId, memberName: input.name, isActive: true })
                .where(eq(householdMembers.id, decoded.memberId));

              claimedHouseholdId = decoded.householdId;
              claimedMemberId = decoded.memberId;
              console.log('[invite] claimed slot successfully');
            } else if (slot && slot.userId === userId) {
              // Slot already belongs to this user (re-registration attempt)
              claimedHouseholdId = decoded.householdId;
              claimedMemberId = decoded.memberId;
              console.log('[invite] slot already owned by this user, returning household');
            } else if (slot && slot.userId !== null) {
              // Slot already claimed by another user – create a new member slot instead
              console.log('[invite] slot already claimed by another user, creating new slot');
              const [newMemberResult] = await db.insert(householdMembers).values({
                householdId: decoded.householdId,
                userId,
                memberName: input.name,
                isActive: true,
              });
              claimedHouseholdId = decoded.householdId;
              claimedMemberId = Number(newMemberResult.insertId);
            } else {
              // Slot not found (deleted or wrong env) – try to join the household directly
              console.log('[invite] slot not found for memberId:', decoded.memberId, '– trying to join household', decoded.householdId);
              const [hh] = await db
                .select({ id: households.id })
                .from(households)
                .where(eq(households.id, decoded.householdId))
                .limit(1);
              if (hh) {
                // Check if user is already a member
                const [existingMember] = await db
                  .select()
                  .from(householdMembers)
                  .where(
                    and(
                      eq(householdMembers.householdId, decoded.householdId),
                      eq(householdMembers.userId, userId)
                    )
                  )
                  .limit(1);
                if (existingMember) {
                  claimedHouseholdId = decoded.householdId;
                  claimedMemberId = existingMember.id;
                  console.log('[invite] user already member, returning existing slot');
                } else {
                  const [newMemberResult] = await db.insert(householdMembers).values({
                    householdId: decoded.householdId,
                    userId,
                    memberName: input.name,
                    isActive: true,
                  });
                  claimedHouseholdId = decoded.householdId;
                  claimedMemberId = Number(newMemberResult.insertId);
                  console.log('[invite] created new member slot in household', decoded.householdId);
                }
              } else {
                console.log('[invite] household', decoded.householdId, 'not found');
              }
            }
          }
        } catch (err) {
          // Invalid / expired invite token – log and continue
          console.log('[invite] token verification failed:', (err as Error).message);
        }
      }

      // Generate JWT token
      const token = jwt.sign(
        { userId, email: input.email },
        JWT_SECRET,
        { expiresIn: "30d" }
      );

      // Fetch the claimed household name if available
      let householdName: string | null = null;
      if (claimedHouseholdId) {
        const [hh] = await db.select({ name: households.name }).from(households).where(eq(households.id, claimedHouseholdId)).limit(1);
        householdName = hh?.name ?? null;
      }

      return {
        success: true,
        userId,
        token,
        claimedHouseholdId,
        claimedMemberId,
        householdName,
        user: {
          id: userId,
          email: input.email,
          name: input.name,
          profileImageUrl: null,
        },
      };
    }),

  /**
   * Login with email and password
   */
  login: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        password: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");

      // Find user by email
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, input.email))
        .limit(1);

      if (!user) {
        throw new Error("Invalid email or password");
      }

      // Verify password
      if (!user.passwordHash) {
        throw new Error("This account uses OAuth login");
      }

      const isValid = await bcrypt.compare(input.password, user.passwordHash);
      if (!isValid) {
        throw new Error("Invalid email or password");
      }

      // Update last signed in
      await db
        .update(users)
        .set({ lastSignedIn: new Date() })
        .where(eq(users.id, user.id));

      // Generate JWT token
      const token = jwt.sign(
        { userId: user.id, email: user.email },
        JWT_SECRET,
        { expiresIn: "30d" }
      );

      return {
        success: true,
        userId: user.id,
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          profileImageUrl: user.profileImageUrl,
        },
      };
    }),

  /**
   * Get current user info from token
   * Token can be provided via input, Authorization header, or auth_token cookie
   */
  getCurrentUser: publicProcedure
    .input(
      z.object({
        token: z.string().optional(),
      }).optional()
    )
    .query(async ({ input, ctx }) => {
      try {
        // Try to get token from input, Authorization header, or cookie
        const authHeader = ctx.req.headers.authorization;
        const token = input?.token || authHeader?.replace('Bearer ', '') || ctx.req.cookies?.auth_token;
        
        if (!token) {
          return null; // Not authenticated
        }

        const decoded = jwt.verify(token, JWT_SECRET) as {
          userId: number;
          email: string;
        };

        const db = await getDb();
        if (!db) throw new Error("Database connection failed");

        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.id, decoded.userId))
          .limit(1);

        if (!user) {
          throw new Error("User not found");
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          profileImageUrl: user.profileImageUrl,
        };
      } catch (error) {
        return null; // Invalid or expired token
      }
    }),

  /**
   * Logout (client-side token removal)
   */
  logout: publicProcedure.mutation(async () => {
    return { success: true };
  }),
});
