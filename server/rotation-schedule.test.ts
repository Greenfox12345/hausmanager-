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

describe("Rotation Schedule - Minimum 3 Occurrences", () => {
  let testHouseholdId2: number;
  let testTaskId2: number;
  let testUserId2: number;

  beforeAll(async () => {
    // Create test user
    const testOpenId = "test-user-min-occ-" + Date.now();
    await upsertUser({ openId: testOpenId, name: "Test User Min Occ" });
    const testUser = await getUserByOpenId(testOpenId);
    if (!testUser) throw new Error("Failed to create test user");
    testUserId2 = testUser.id;
    
    // Create test household
    testHouseholdId2 = await createHousehold(
      "Test Household for Min Occurrences",
      "test_hash_2",
      testUserId2
    );

    // Create test task with rotation enabled
    testTaskId2 = await createTask({
      householdId: testHouseholdId2,
      name: "Test Task Min Occurrences",
      description: "Task for testing minimum 3 occurrences",
      assignedTo: [],
      frequency: "weekly",
      repeatInterval: 1,
      repeatUnit: "weeks",
      enableRotation: true,
      requiredPersons: 2,
      dueDate: new Date("2026-02-24"),
      createdBy: testUserId2,
    });
  });

  afterAll(async () => {
    // Cleanup
    if (testTaskId2) {
      await deleteTask(testTaskId2);
    }
  });

  it("should return at least 3 occurrences even when no members are assigned", async () => {
    // Act: Get rotation schedule without any assignments
    const schedule = await getRotationSchedule(testTaskId2);

    // Assert: Should have at least 3 occurrences
    expect(schedule).toBeDefined();
    expect(schedule.length).toBeGreaterThanOrEqual(3);
    
    // All occurrences should have empty members arrays
    schedule.forEach((occ) => {
      expect(occ.members).toEqual([]);
      expect(occ.notes).toBeUndefined();
    });

    // Occurrence numbers should be sequential starting from 1
    expect(schedule[0].occurrenceNumber).toBe(1);
    expect(schedule[1].occurrenceNumber).toBe(2);
    expect(schedule[2].occurrenceNumber).toBe(3);
  });

  it("should return at least 3 occurrences when only 1 occurrence has assignments", async () => {
    // Arrange: Add assignment for first occurrence only
    await setRotationSchedule(testTaskId2, [
      {
        occurrenceNumber: 1,
        members: [{ position: 1, memberId: 1 }],
      },
    ]);

    // Act: Get rotation schedule
    const schedule = await getRotationSchedule(testTaskId2);

    // Assert: Should have at least 3 occurrences
    expect(schedule).toBeDefined();
    expect(schedule.length).toBeGreaterThanOrEqual(3);

    // First occurrence should have assignment
    expect(schedule[0].occurrenceNumber).toBe(1);
    expect(schedule[0].members.length).toBe(1);

    // Second and third occurrences should be empty
    expect(schedule[1].occurrenceNumber).toBe(2);
    expect(schedule[1].members).toEqual([]);
    expect(schedule[2].occurrenceNumber).toBe(3);
    expect(schedule[2].members).toEqual([]);
  });

  it("should not add extra occurrences when 3 or more already exist", async () => {
    // Arrange: Add assignments for 5 occurrences
    const schedule = [];
    for (let i = 1; i <= 5; i++) {
      schedule.push({
        occurrenceNumber: i,
        members: [{ position: 1, memberId: 1 }],
      });
    }
    await setRotationSchedule(testTaskId2, schedule);

    // Act: Get rotation schedule
    const retrieved = await getRotationSchedule(testTaskId2);

    // Assert: Should have exactly 5 occurrences (no extras added)
    expect(retrieved).toBeDefined();
    expect(retrieved.length).toBe(5);

    // All occurrences should have assignments
    retrieved.forEach((occ, index) => {
      expect(occ.occurrenceNumber).toBe(index + 1);
      expect(occ.members.length).toBe(1);
    });
  });
});
