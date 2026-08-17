import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createTestContext(): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };

  return { ctx };
}

describe("shopping.completeShopping", () => {
  it("accepts completion with comment and photos", async () => {
    const { ctx } = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.shopping.completeShopping({
      householdId: 1,
      memberId: 1,
      itemIds: [1, 2, 3],
      comment: "Alles im Angebot gefunden!",
      photoUrls: ["https://example.com/photo1.jpg", "https://example.com/photo2.jpg"],
    });

    expect(result).toEqual({ success: true });
  });

  it("accepts completion without comment and photos", async () => {
    const { ctx } = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.shopping.completeShopping({
      householdId: 1,
      memberId: 1,
      itemIds: [1],
    });

    expect(result).toEqual({ success: true });
  });
});

describe("upload.uploadPhoto", () => {
  it("validates base64 photo format", async () => {
    const { ctx } = createTestContext();
    const caller = appRouter.createCaller(ctx);

    // Valid base64 image
    const validBase64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

    const result = await caller.upload.uploadPhoto({
      photo: validBase64,
      filename: "test.png",
    });

    expect(result).toHaveProperty("url");
    expect(typeof result.url).toBe("string");
  });
});
