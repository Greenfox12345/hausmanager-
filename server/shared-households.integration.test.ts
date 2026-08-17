import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { users } from "../drizzle/schema";
import type { TrpcContext } from "./_core/context";
import {
  createHousehold,
  createHouseholdMember,
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

describe("Gemeinsame Aufgaben zwischen Haushalten", () => {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const testUserOpenId = `integration-shared-households-${suffix}`;
  let testUser: AuthenticatedUser;
  let household1Id: number;
  let household2Id: number;
  let member1Id: number;
  let taskId: number;

  beforeAll(async () => {
    await upsertUser({
      openId: testUserOpenId,
      name: "Integrationstest Gemeinsame Aufgaben",
      email: `${testUserOpenId}@example.test`,
      loginMethod: "email",
    });
    const createdUser = await getUserByOpenId(testUserOpenId);
    if (!createdUser) throw new Error("Testbenutzer konnte nicht angelegt werden.");
    testUser = createdUser;

    household1Id = await createHousehold(`Testhaushalt A ${suffix}`, "test_hash", testUser.id);
    household2Id = await createHousehold(`Testhaushalt B ${suffix}`, "test_hash", testUser.id);
    member1Id = await createHouseholdMember({
      householdId: household1Id,
      userId: testUser.id,
      memberName: "Mitglied A",
      passwordHash: "test_hash",
    });
    await createHouseholdMember({
      householdId: household2Id,
      userId: testUser.id,
      memberName: "Mitglied B",
      passwordHash: "test_hash",
    });
  });

  afterAll(async () => {
    if (household1Id) await deleteHousehold(household1Id);
    if (household2Id) await deleteHousehold(household2Id);

    const db = await getDb();
    if (db && testUser) {
      await db.delete(users).where(eq(users.id, testUser.id));
    }
  });

  it("speichert gemeinsame Haushalte beim Erstellen einer Aufgabe", async () => {
    const caller = appRouter.createCaller(createTestContext(testUser));
    const result = await caller.tasks.add({
      householdId: household1Id,
      memberId: member1Id,
      name: "Gemeinsame Testaufgabe",
      description: "Prüft die gemeinsame Sichtbarkeit zwischen Haushalten.",
      sharedHouseholdIds: [household2Id],
      nonResponsiblePermission: "full",
    });
    taskId = result.id;

    const tasks = await caller.tasks.list({ householdId: household1Id });
    const createdTask = tasks.find((task) => task.id === taskId);

    expect(createdTask).toBeDefined();
    expect(createdTask?.sharedHouseholdIds).toEqual([household2Id]);
  });

  it("entfernt und setzt gemeinsame Haushalte beim Bearbeiten korrekt", async () => {
    const caller = appRouter.createCaller(createTestContext(testUser));

    await caller.tasks.update({
      taskId,
      householdId: household1Id,
      memberId: member1Id,
      sharedHouseholdIds: [],
    });
    const withoutSharing = await caller.tasks.list({ householdId: household1Id });
    expect(withoutSharing.find((task) => task.id === taskId)?.sharedHouseholdIds).toBeNull();

    await caller.tasks.update({
      taskId,
      householdId: household1Id,
      memberId: member1Id,
      sharedHouseholdIds: [household2Id],
    });
    const withSharingAgain = await caller.tasks.list({ householdId: household1Id });
    expect(withSharingAgain.find((task) => task.id === taskId)?.sharedHouseholdIds).toEqual([household2Id]);
  });

  it("zeigt die Aufgabe im Besitzer- und im geteilten Haushalt mit korrektem Status", async () => {
    const caller = appRouter.createCaller(createTestContext(testUser));

    const ownerTask = (await caller.tasks.list({ householdId: household1Id }))
      .find((task) => task.id === taskId);
    const sharedTask = (await caller.tasks.list({ householdId: household2Id }))
      .find((task) => task.id === taskId);

    expect(ownerTask?.isSharedWithUs).toBe(false);
    expect(sharedTask).toBeDefined();
    expect(sharedTask?.isSharedWithUs).toBe(true);
  });
});
