import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { users } from "../drizzle/schema";
import type { TrpcContext } from "./_core/context";
import {
  createHousehold,
  createHouseholdMember,
  createTask,
  deleteHousehold,
  getDb,
  getUserByOpenId,
  upsertUser,
} from "./db";
import { appRouter } from "./routers";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createTestContext(user: AuthenticatedUser): TrpcContext {
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as TrpcContext["res"],
  };
}

describe("Anzeige verantwortlicher Personen per tRPC", () => {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const testUserOpenId = `integration-assignee-display-${suffix}`;
  let testUser: AuthenticatedUser;
  let householdId: number;
  let creatorMemberId: number;
  let assigneeMemberId: number;
  let taskId: number;

  beforeAll(async () => {
    await upsertUser({
      openId: testUserOpenId,
      name: "Integrationstest Verantwortliche",
      email: `${testUserOpenId}@example.test`,
      loginMethod: "email",
    });
    const createdUser = await getUserByOpenId(testUserOpenId);
    if (!createdUser) throw new Error("Testbenutzer konnte nicht angelegt werden.");
    testUser = createdUser;

    householdId = await createHousehold(`Testhaushalt Verantwortliche ${suffix}`, "test_hash", testUser.id);
    creatorMemberId = await createHouseholdMember({
      householdId,
      userId: testUser.id,
      memberName: "Ersteller",
      passwordHash: "test_hash",
    });
    assigneeMemberId = await createHouseholdMember({
      householdId,
      userId: null,
      memberName: "Alex Verantwortlich",
      passwordHash: "test_hash",
    });
    taskId = await createTask({
      householdId,
      name: "Aufgabe mit Verantwortlichkeit",
      assignedTo: [assigneeMemberId],
      frequency: "once",
      createdBy: creatorMemberId,
    });
  });

  afterAll(async () => {
    if (householdId) await deleteHousehold(householdId);
    const db = await getDb();
    if (db && testUser) {
      await db.delete(users).where(eq(users.id, testUser.id));
    }
  });

  it("liefert für eine zugewiesene Aufgabe die Mitglieds-ID und den aufgelösten Namen", async () => {
    const caller = appRouter.createCaller(createTestContext(testUser));
    const task = (await caller.tasks.list({ householdId })).find((entry) => entry.id === taskId);

    expect(task).toBeDefined();
    expect(task?.assignedTo).toEqual([assigneeMemberId]);
    expect(task?.assignedToNames).toBe("Alex Verantwortlich");
  });
});
