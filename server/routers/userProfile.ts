import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { users } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { TRPCError } from "@trpc/server";

/**
 * User profile management router
 * Handles viewing and updating user profile information
 */
export const userProfileRouter = router({
  /**
   * Get current user's profile information
   */
  getProfile: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database connection failed" });

    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
      })
      .from(users)
      .where(eq(users.id, ctx.user.id))
      .limit(1);

    if (!user) {
      throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
    };
  }),

  /**
   * Update user profile (name and/or email)
   */
  updateProfile: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).optional(),
        email: z.string().email().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database connection failed" });

      // If email is being changed, check if it's already in use
      if (input.email) {
        const [existingUser] = await db
          .select()
          .from(users)
          .where(eq(users.email, input.email))
          .limit(1);

        if (existingUser && existingUser.id !== ctx.user.id) {
          throw new TRPCError({ code: "CONFLICT", message: "Diese E-Mail-Adresse wird bereits verwendet" });
        }
      }

      // Build update object with only provided fields
      const updateData: { name?: string; email?: string } = {};
      if (input.name !== undefined) updateData.name = input.name;
      if (input.email !== undefined) updateData.email = input.email;

      // Update user
      await db
        .update(users)
        .set(updateData)
        .where(eq(users.id, ctx.user.id));

      return {
        success: true,
        message: "Profil erfolgreich aktualisiert",
      };
    }),

  /**
   * Change user password
   */
  changePassword: protectedProcedure
    .input(
      z.object({
        currentPassword: z.string(),
        newPassword: z.string().min(8, "Passwort muss mindestens 8 Zeichen lang sein"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database connection failed" });

      // Get current user with password hash
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, ctx.user.id))
        .limit(1);

      if (!user) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
      }

      if (!user.passwordHash) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Dieser Account verwendet OAuth-Login" });
      }

      // Verify current password
      const isValid = await bcrypt.compare(input.currentPassword, user.passwordHash);
      if (!isValid) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Aktuelles Passwort ist falsch" });
      }

      // Hash new password
      const newPasswordHash = await bcrypt.hash(input.newPassword, 10);

      // Update password
      await db
        .update(users)
        .set({ passwordHash: newPasswordHash })
        .where(eq(users.id, ctx.user.id));

      return {
        success: true,
        message: "Passwort erfolgreich geändert",
      };
    }),
});
