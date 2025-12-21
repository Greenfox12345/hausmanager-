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

describe("tasks.completeTask", () => {
  it("accepts task completion with comment and photos", async () => {
    const { ctx } = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.tasks.completeTask({
      taskId: 1,
      householdId: 1,
      memberId: 1,
      comment: "Alles erledigt, hat 2 Stunden gedauert",
      photoUrls: ["https://example.com/before.jpg", "https://example.com/after.jpg"],
    });

    expect(result).toEqual({ success: true });
  });

  it("accepts task completion without comment and photos", async () => {
    const { ctx } = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.tasks.completeTask({
      taskId: 1,
      householdId: 1,
      memberId: 1,
    });

    expect(result).toEqual({ success: true });
  });
});

describe("tasks.addMilestone", () => {
  it("accepts milestone with comment and photos", async () => {
    const { ctx } = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.tasks.addMilestone({
      taskId: 1,
      householdId: 1,
      memberId: 1,
      comment: "Erste Hälfte erledigt",
      photoUrls: ["https://example.com/progress.jpg"],
    });

    expect(result).toEqual({ success: true });
  });
});

describe("tasks.sendReminder", () => {
  it("accepts reminder with optional comment", async () => {
    const { ctx } = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.tasks.sendReminder({
      taskId: 1,
      householdId: 1,
      memberId: 1,
      comment: "Bitte nicht vergessen!",
    });

    expect(result).toEqual({ success: true });
  });

  it("accepts reminder without comment", async () => {
    const { ctx } = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.tasks.sendReminder({
      taskId: 1,
      householdId: 1,
      memberId: 1,
    });

    expect(result).toEqual({ success: true });
  });
});
