/**
 * Tests for demo session authentication in the tRPC context.
 *
 * Verifies that:
 * 1. A valid demo JWT creates a synthetic demo user in context
 * 2. The isDemoUser flag is set correctly
 * 3. A regular user JWT resolves to a real user from DB
 * 4. An invalid token leaves user as null
 *
 * NOTE: The context module reads JWT_SECRET at module-load time from process.env.
 * We must set the env var BEFORE importing the module. Because Vitest caches modules
 * across tests in the same file, we use the real JWT_SECRET (or a fixed fallback) and
 * sign tokens with the same secret the module will use.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import jwt from "jsonwebtoken";

// The context module uses this fallback when JWT_SECRET env is not set
const JWT_SECRET = process.env.JWT_SECRET ?? "your-secret-key-change-in-production";

// Mock db module BEFORE importing context so the mock is in place when context loads
vi.mock("./db", () => ({
  getUserById: vi.fn(),
  getDb: vi.fn(),
}));

// Mock sdk module
vi.mock("./_core/sdk", () => ({
  sdk: {
    authenticateRequest: vi.fn().mockRejectedValue(new Error("no cookie")),
  },
}));

import { createContext } from "./_core/context";
import * as db from "./db";

function makeReq(token?: string): any {
  return {
    headers: token ? { authorization: `Bearer ${token}` } : {},
  };
}

describe("createContext – demo auth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sets isDemoUser=true and synthetic user for a valid demo JWT", async () => {
    const demoJwt = jwt.sign(
      { demoToken: "abc", householdId: 1, memberId: 2, isDemo: true },
      JWT_SECRET,
      { expiresIn: "24h" }
    );

    const ctx = await createContext({ req: makeReq(demoJwt), res: {} as any });

    expect(ctx.isDemoUser).toBe(true);
    expect(ctx.user).not.toBeNull();
    expect(ctx.user?.name).toBe("Demo");
    expect(ctx.user?.id).toBe(0);
    // getUserById should NOT be called for demo tokens
    expect(db.getUserById).not.toHaveBeenCalled();
  });

  it("resolves real user for a regular JWT with userId", async () => {
    const fakeUser = { id: 42, name: "Alice", email: "alice@example.com" };
    vi.mocked(db.getUserById).mockResolvedValue(fakeUser as any);

    const regularJwt = jwt.sign({ userId: 42, email: "alice@example.com" }, JWT_SECRET, { expiresIn: "7d" });

    const ctx = await createContext({ req: makeReq(regularJwt), res: {} as any });

    expect(ctx.isDemoUser).toBeFalsy();
    expect(ctx.user?.id).toBe(42);
    expect(db.getUserById).toHaveBeenCalledWith(42);
  });

  it("leaves user null for an invalid/expired token", async () => {
    const ctx = await createContext({ req: makeReq("invalid.token.here"), res: {} as any });

    expect(ctx.user).toBeNull();
    expect(ctx.isDemoUser).toBeFalsy();
  });

  it("leaves user null when no authorization header is present", async () => {
    const ctx = await createContext({ req: makeReq(), res: {} as any });

    expect(ctx.user).toBeNull();
    expect(ctx.isDemoUser).toBeFalsy();
  });
});
