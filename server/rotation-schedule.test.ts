import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  getRotationSchedule,
  setRotationSchedule,
  extendRotationSchedule,
  shiftRotationSchedule,
  getDb,
  createTask,
  deleteTask,
  createHousehold,
  createHouseholdMember,
  upsertUser,
  getUserByOpenId,
} from "./db";

describe("Rotation Schedule", () => {
  let testHouseholdId: number;
  let testTaskId: number;
  let testUserId: number;
  let member1Id: number;
  let member2Id: number;
  let member3Id: number;

  beforeAll(async () => {
    // Create test user
    const testOpenId = "test-user-rotation-" + Date.now();
    await upsertUser({ openId: testOpenId, name: "Test User" });
    const testUser = await getUserByOpenId(testOpenId);
    if (!testUser) throw new Error("Failed to create test user");
    testUserId = testUser.id;
    
    // Create test household
    testHouseholdId = await createHousehold(
      "Test Household for Rotation",
      "test_hash",
      testUserId
    );

    // Create test members
    member1Id = await createHouseholdMember({
      householdId: testHouseholdId,
      memberName: "Alice",
      isActive: true,
    });

    member2Id = await createHouseholdMember({
      householdId: testHouseholdId,
      memberName: "Bob",
      isActive: true,
    });

    member3Id = await createHouseholdMember({
      householdId: testHouseholdId,
      memberName: "Charlie",
      isActive: true,
    });

    // Create test task with rotation enabled
    testTaskId = await createTask({
      householdId: testHouseholdId,
      name: "Test Rotation Task",
      description: "Task for testing rotation schedule",
      assignedTo: [member1Id, member2Id],
      frequency: "weekly",
      repeatInterval: 1,
      repeatUnit: "weeks",
      enableRotation: true,
      requiredPersons: 2,
      dueDate: new Date("2026-02-24"),
      createdBy: member1Id, // tasks.createdBy references household_members, not users
    });
  });

  afterAll(async () => {
    // Cleanup
    if (testTaskId) {
      await deleteTask(testTaskId);
    }
  });

  it("should set and get rotation schedule", async () => {
    const schedule = [
      {
        occurrenceNumber: 1,
        members: [
          { position: 1, memberId: member1Id },
          { position: 2, memberId: member2Id },
        ],
        notes: "Erste Runde",
      },
      {
        occurrenceNumber: 2,
        members: [
          { position: 1, memberId: member2Id },
          { position: 2, memberId: member3Id },
        ],
        notes: "Zweite Runde",
      },
      {
        occurrenceNumber: 3,
        members: [
          { position: 1, memberId: member3Id },
          { position: 2, memberId: member1Id },
        ],
      },
    ];

    await setRotationSchedule(testTaskId, schedule);

    const retrieved = await getRotationSchedule(testTaskId);

    expect(retrieved).toHaveLength(3);
    expect(retrieved[0].occurrenceNumber).toBe(1);
    expect(retrieved[0].members).toHaveLength(2);
    expect(retrieved[0].members[0].memberId).toBe(member1Id);
    expect(retrieved[0].members[1].memberId).toBe(member2Id);
    expect(retrieved[0].notes).toBe("Erste Runde");

    expect(retrieved[1].occurrenceNumber).toBe(2);
    expect(retrieved[1].notes).toBe("Zweite Runde");

    expect(retrieved[2].occurrenceNumber).toBe(3);
    expect(retrieved[2].notes).toBeUndefined();
  });

  it("should extend rotation schedule", async () => {
    const newOccurrence = {
      occurrenceNumber: 4,
      members: [
        { position: 1, memberId: member1Id },
        { position: 2, memberId: member2Id },
      ],
      notes: "Vierte Runde",
    };

    await extendRotationSchedule(
      testTaskId,
      newOccurrence.occurrenceNumber,
      newOccurrence.members,
      newOccurrence.notes
    );

    const retrieved = await getRotationSchedule(testTaskId);

    expect(retrieved).toHaveLength(4);
    const fourthOccurrence = retrieved.find(occ => occ.occurrenceNumber === 4);
    expect(fourthOccurrence).toBeDefined();
    expect(fourthOccurrence?.members).toHaveLength(2);
    expect(fourthOccurrence?.notes).toBe("Vierte Runde");
  });

  it("should shift rotation schedule down", async () => {
    // Before shift: occurrences 1, 2, 3, 4
    const beforeShift = await getRotationSchedule(testTaskId);
    expect(beforeShift).toHaveLength(4);

    await shiftRotationSchedule(testTaskId);

    // After shift: occurrence 1 removed, 2→1, 3→2, 4→3
    const afterShift = await getRotationSchedule(testTaskId);
    expect(afterShift).toHaveLength(3);

    expect(afterShift[0].occurrenceNumber).toBe(1);
    expect(afterShift[0].members[0].memberId).toBe(member2Id); // Was occurrence 2
    expect(afterShift[0].notes).toBe("Zweite Runde");

    expect(afterShift[1].occurrenceNumber).toBe(2);
    expect(afterShift[1].members[0].memberId).toBe(member3Id); // Was occurrence 3

    expect(afterShift[2].occurrenceNumber).toBe(3);
    expect(afterShift[2].members[0].memberId).toBe(member1Id); // Was occurrence 4
    expect(afterShift[2].notes).toBe("Vierte Runde");
  });

  it("should replace entire schedule when calling setRotationSchedule", async () => {
    const newSchedule = [
      {
        occurrenceNumber: 1,
        members: [
          { position: 1, memberId: member3Id },
          { position: 2, memberId: member1Id },
        ],
        notes: "Komplett neuer Plan",
      },
      {
        occurrenceNumber: 2,
        members: [
          { position: 1, memberId: member1Id },
          { position: 2, memberId: member2Id },
        ],
      },
    ];

    await setRotationSchedule(testTaskId, newSchedule);

    const retrieved = await getRotationSchedule(testTaskId);

    expect(retrieved).toHaveLength(2);
    expect(retrieved[0].occurrenceNumber).toBe(1);
    expect(retrieved[0].members[0].memberId).toBe(member3Id);
    expect(retrieved[0].notes).toBe("Komplett neuer Plan");

    expect(retrieved[1].occurrenceNumber).toBe(2);
    expect(retrieved[1].members[0].memberId).toBe(member1Id);
  });

  it("should handle empty schedule", async () => {
    await setRotationSchedule(testTaskId, []);

    const retrieved = await getRotationSchedule(testTaskId);

    expect(retrieved).toHaveLength(0);
  });

  it("should preserve member positions correctly", async () => {
    const schedule = [
      {
        occurrenceNumber: 1,
        members: [
          { position: 2, memberId: member2Id }, // Position 2 first
          { position: 1, memberId: member1Id }, // Position 1 second
        ],
      },
    ];

    await setRotationSchedule(testTaskId, schedule);

    const retrieved = await getRotationSchedule(testTaskId);

    expect(retrieved[0].members).toHaveLength(2);
    // Should be sorted by position
    expect(retrieved[0].members[0].position).toBe(1);
    expect(retrieved[0].members[0].memberId).toBe(member1Id);
    expect(retrieved[0].members[1].position).toBe(2);
    expect(retrieved[0].members[1].memberId).toBe(member2Id);
  });
});
