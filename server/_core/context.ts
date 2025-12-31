import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import jwt from "jsonwebtoken";
import type { User } from "../../drizzle/schema";
import * as db from "../db";
import { sdk } from "./sdk";

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  // Try Bearer token authentication first (new user auth system)
  const authHeader = opts.req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: number; email: string };
      user = await db.getUserById(decoded.userId) || null;
    } catch (error) {
      // Invalid bearer token, will try cookie auth or remain null
      console.error('[Auth] Bearer token validation failed:', error);
    }
  }

  // Fall back to cookie-based authentication (old OAuth system)
  if (!user) {
    try {
      user = await sdk.authenticateRequest(opts.req);
    } catch (error) {
      // Authentication is optional for public procedures.
      user = null;
    }
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
