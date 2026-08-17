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

describe("Aufgabenrotation über die aktuelle tRPC-Schnittstelle", () => {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const testUserOpenId = `integration-task-rotation-${suffix}`;
  let testUser: AuthenticatedUser;
  let householdId: number;
  let member1Id: number;
  let member2Id: number;
  let rotationTaskId: number;

  const caller = () => appRouter.createCaller(createTestContext(testUser));

  beforeAll(async () => {
    await upsertUser({
      openId: testUserOpenId,
      name: "Integrationstest Aufgabenrotation",
      email: `${testUserOpenId}@example.test`,
      loginMethod: "email",
    });
    const createdUser = await getUserByOpenId(testUserOpenId);
    if (!createdUser) throw new Error("Testbenutzer konnte nicht angelegt werden.");
    testUser = createdUser;

    householdId = await createHousehold(`Testhaushalt Rotation ${suffix}`, "test_hash", testUser.id);
    member1Id = await createHouseholdMember({
      householdId,
      userId: testUser.id,
      memberName: "Rotation Eins",
      passwordHash: "test_hash",
    });
    member2Id = await createHouseholdMember({
      householdId,
      userId: null,
      memberName: "Rotation Zwei",
      passwordHash: "test_hash",
    });

    const task = await caller().tasks.add({
      householdId,
      memberId: member1Id,
      name: "Rotierende Testaufgabe",
      frequency: "weekly",
      repeatInterval: 1,
      repeatUnit: "weeks",
      enableRotation: true,
      requiredPersons: 1,
      assignedTo: [member1Id],
    });
    rotationTaskId = task.id;
  });

  afterAll(async () => {
    if (householdId) await deleteHousehold(householdId);
    const db = await getDb();
    if (db && testUser) {
      await db.delete(users).where(eq(users.id, testUser.id));
    }
  });

  it("speichert und liest einen Rotationsplan", async () => {
    const result = await caller().tasks.setRotationSchedule({
      taskId: rotationTaskId,
      householdId,
      memberId: member1Id,
      schedule: [
        { occurrenceNumber: 1, members: [{ position: 1, memberId: member1Id }], notes: "Erste Runde" },
        { occurrenceNumber: 2, members: [{ position: 1, memberId: member2Id }], notes: "Zweite Runde" },
        { occurrenceNumber: 3, members: [{ position: 1, memberId: member1Id }] },
      ],
    });

    expect(result).toEqual({ success: true });
    const schedule = await caller().tasks.getRotationSchedule({ taskId: rotationTaskId });
    expect(schedule).toHaveLength(3);
    expect(schedule[0]).toMatchObject({
      occurrenceNumber: 1,
      members: [{ position: 1, memberId: member1Id }],
      notes: "Erste Runde",
    });
    expect(schedule[1]?.members).toEqual([{ position: 1, memberId: member2Id }]);
  });

  it("übernimmt Änderungen am gespeicherten Rotationsplan", async () => {
    const current = await caller().tasks.getRotationSchedule({ taskId: rotationTaskId });
    const updated = current.map((occurrence) => ({
      ...occurrence,
      members: occurrence.occurrenceNumber === 1
        ? [{ position: 1, memberId: member2Id }]
        : occurrence.members,
    }));

    const result = await caller().tasks.setRotationSchedule({
      taskId: rotationTaskId,
      householdId,
      memberId: member1Id,
      schedule: updated,
    });

    expect(result).toEqual({ success: true });
    const schedule = await caller().tasks.getRotationSchedule({ taskId: rotationTaskId });
    expect(schedule[0]?.members).toEqual([{ position: 1, memberId: member2Id }]);
  });

  it("speichert ausgeschlossene Mitglieder für eine Rotationsaufgabe", async () => {
    const task = await caller().tasks.add({
      householdId,
      memberId: member1Id,
      name: "Rotation mit Ausschluss",
      frequency: "weekly",
      enableRotation: true,
      requiredPersons: 1,
      excludedMembers: [member2Id],
    });

    const exclusions = await caller().tasks.getRotationExclusions({ taskId: task.id });
    expect(exclusions).toEqual([{ memberId: member2Id }]);
  });
});
