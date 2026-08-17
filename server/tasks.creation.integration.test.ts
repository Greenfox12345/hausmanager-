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

describe("tasks.add mit erweiterten Feldern", () => {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const testUserOpenId = `integration-task-create-${suffix}`;
  let testUser: AuthenticatedUser;
  let householdId: number;
  let creatorMemberId: number;
  let assigneeMemberId: number;
  let excludedMemberId: number;

  beforeAll(async () => {
    await upsertUser({
      openId: testUserOpenId,
      name: "Integrationstest Aufgabenerstellung",
      email: `${testUserOpenId}@example.test`,
      loginMethod: "email",
    });
    const createdUser = await getUserByOpenId(testUserOpenId);
    if (!createdUser) throw new Error("Testbenutzer konnte nicht angelegt werden.");
    testUser = createdUser;

    householdId = await createHousehold(`Testhaushalt Aufgabenanlage ${suffix}`, "test_hash", testUser.id);
    creatorMemberId = await createHouseholdMember({
      householdId,
      userId: testUser.id,
      memberName: "Ersteller",
      passwordHash: "test_hash",
    });
    assigneeMemberId = await createHouseholdMember({
      householdId,
      userId: null,
      memberName: "Verantwortlich",
      passwordHash: "test_hash",
    });
    excludedMemberId = await createHouseholdMember({
      householdId,
      userId: null,
      memberName: "Ausgeschlossen",
      passwordHash: "test_hash",
    });
  });

  afterAll(async () => {
    if (householdId) await deleteHousehold(householdId);
    const db = await getDb();
    if (db && testUser) {
      await db.delete(users).where(eq(users.id, testUser.id));
    }
  });

  it("akzeptiert die Anlage mit Datum und Uhrzeit", async () => {
    const caller = appRouter.createCaller(createTestContext(testUser));
    const result = await caller.tasks.add({
      householdId,
      memberId: creatorMemberId,
      name: "Aufgabe mit Termin",
      description: "Aufgabe mit Datum und Uhrzeit",
      dueDate: "2026-12-25",
      dueTime: "14:30",
      frequency: "once",
    });

    expect(result.id).toEqual(expect.any(Number));
  });

  it("akzeptiert eine benutzerdefinierte Wiederholung", async () => {
    const caller = appRouter.createCaller(createTestContext(testUser));
    const result = await caller.tasks.add({
      householdId,
      memberId: creatorMemberId,
      name: "Wiederkehrende Aufgabe",
      description: "Wiederholt sich alle drei Tage",
      frequency: "custom",
      repeatInterval: 3,
      repeatUnit: "days",
    });

    expect(result.id).toEqual(expect.any(Number));
  });

  it("akzeptiert eine Rotation mit ausgeschlossenen Mitgliedern", async () => {
    const caller = appRouter.createCaller(createTestContext(testUser));
    const result = await caller.tasks.add({
      householdId,
      memberId: creatorMemberId,
      name: "Rotierende Aufgabe",
      description: "Aufgabe mit aktivierter Rotation",
      frequency: "weekly",
      enableRotation: true,
      requiredPersons: 1,
      excludedMembers: [excludedMemberId],
    });

    expect(result.id).toEqual(expect.any(Number));
  });

  it("liefert bei einer kombinierten Eingabe die aktuelle Rückgabeform mit id", async () => {
    const caller = appRouter.createCaller(createTestContext(testUser));
    const result = await caller.tasks.add({
      householdId,
      memberId: creatorMemberId,
      name: "Komplexe Aufgabe",
      description: "Aufgabe mit mehreren erweiterten Feldern",
      dueDate: "2026-12-31",
      dueTime: "23:59",
      frequency: "custom",
      repeatInterval: 2,
      repeatUnit: "weeks",
      enableRotation: true,
      requiredPersons: 1,
      excludedMembers: [excludedMemberId],
      assignedTo: [assigneeMemberId],
    });

    expect(result).toEqual({ id: expect.any(Number) });
  });
});
