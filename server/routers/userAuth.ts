import { z } from "zod";
import { router, publicProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { users } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
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

      // Generate JWT token
      const token = jwt.sign(
        { userId: newUser.insertId, email: input.email },
        JWT_SECRET,
        { expiresIn: "30d" }
      );

      return {
        success: true,
        userId: newUser.insertId,
        token,
        user: {
          id: newUser.insertId,
          email: input.email,
          name: input.name,
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
        },
      };
    }),

  /**
   * Get current user info from token
   */
  me: publicProcedure
    .input(
      z.object({
        token: z.string(),
      })
    )
    .query(async ({ input }) => {
      try {
        const decoded = jwt.verify(input.token, JWT_SECRET) as {
          userId: number;
          email: string;
        };

        const db = await getDb();
        if (!db) throw new Error("Database connection failed");
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
        };
      } catch (error) {
        throw new Error("Invalid or expired token");
      }
    }),

  /**
   * Logout (client-side token removal)
   */
  logout: publicProcedure.mutation(async () => {
    return { success: true };
  }),
});
