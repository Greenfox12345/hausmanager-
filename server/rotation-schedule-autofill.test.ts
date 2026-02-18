import { describe, it, expect } from "vitest";

/**
 * Test the auto-fill logic for rotation schedules
 * This mirrors the logic in RotationScheduleTable.tsx handleAutoFill()
 */

interface Member {
  memberId: number;
  memberName: string;
}

interface ScheduleMember {
  position: number;
  memberId: number;
}

interface ScheduleOccurrence {
  occurrenceNumber: number;
  members: ScheduleMember[];
  notes?: string;
}

function autoFillSchedule(
  schedule: ScheduleOccurrence[],
  eligibleMembers: Member[]
): ScheduleOccurrence[] {
  if (eligibleMembers.length === 0) return schedule;
  
  const newSchedule = JSON.parse(JSON.stringify(schedule)); // Deep clone
  let memberIndex = 0;
  
  // For each occurrence
  for (let occIdx = 0; occIdx < newSchedule.length; occIdx++) {
    const occ = newSchedule[occIdx];
    
    // For each position in this occurrence
    for (let posIdx = 0; posIdx < occ.members.length; posIdx++) {
      const member = occ.members[posIdx];
      
      // Only fill if currently unassigned (memberId === 0)
      if (member.memberId === 0) {
        // Round-robin through eligible members
        const selectedMember = eligibleMembers[memberIndex % eligibleMembers.length];
        occ.members[posIdx] = {
          ...member,
          memberId: selectedMember.memberId,
        };
        memberIndex++;
      }
    }
  }
  
  return newSchedule;
}

describe("Rotation Schedule Auto-Fill Logic", () => {
  const members: Member[] = [
    { memberId: 1, memberName: "Anna" },
    { memberId: 2, memberName: "Bob" },
    { memberId: 3, memberName: "Charlie" },
  ];

  describe("Basic Auto-Fill", () => {
    it("should fill all empty slots with round-robin distribution", () => {
      const schedule: ScheduleOccurrence[] = [
        { occurrenceNumber: 1, members: [{ position: 1, memberId: 0 }, { position: 2, memberId: 0 }] },
        { occurrenceNumber: 2, members: [{ position: 1, memberId: 0 }, { position: 2, memberId: 0 }] },
        { occurrenceNumber: 3, members: [{ position: 1, memberId: 0 }, { position: 2, memberId: 0 }] },
      ];

      const result = autoFillSchedule(schedule, members);

      // First occurrence: Anna, Bob
      expect(result[0].members[0].memberId).toBe(1);
      expect(result[0].members[1].memberId).toBe(2);
      
      // Second occurrence: Charlie, Anna
      expect(result[1].members[0].memberId).toBe(3);
      expect(result[1].members[1].memberId).toBe(1);
      
      // Third occurrence: Bob, Charlie
      expect(result[2].members[0].memberId).toBe(2);
      expect(result[2].members[1].memberId).toBe(3);
    });

    it("should not overwrite already assigned members", () => {
      const schedule: ScheduleOccurrence[] = [
        { occurrenceNumber: 1, members: [{ position: 1, memberId: 2 }, { position: 2, memberId: 0 }] },
        { occurrenceNumber: 2, members: [{ position: 1, memberId: 0 }, { position: 2, memberId: 0 }] },
      ];

      const result = autoFillSchedule(schedule, members);

      // First occurrence: Bob (unchanged), Anna (filled)
      expect(result[0].members[0].memberId).toBe(2); // Bob unchanged
      expect(result[0].members[1].memberId).toBe(1); // Anna filled
      
      // Second occurrence: Bob, Charlie
      expect(result[1].members[0].memberId).toBe(2);
      expect(result[1].members[1].memberId).toBe(3);
    });
  });

  describe("Edge Cases", () => {
    it("should handle single member rotation", () => {
      const singleMember: Member[] = [{ memberId: 1, memberName: "Anna" }];
      const schedule: ScheduleOccurrence[] = [
        { occurrenceNumber: 1, members: [{ position: 1, memberId: 0 }, { position: 2, memberId: 0 }] },
        { occurrenceNumber: 2, members: [{ position: 1, memberId: 0 }, { position: 2, memberId: 0 }] },
      ];

      const result = autoFillSchedule(schedule, singleMember);

      // All positions should be Anna
      expect(result[0].members[0].memberId).toBe(1);
      expect(result[0].members[1].memberId).toBe(1);
      expect(result[1].members[0].memberId).toBe(1);
      expect(result[1].members[1].memberId).toBe(1);
    });

    it("should handle more members than positions", () => {
      const manyMembers: Member[] = [
        { memberId: 1, memberName: "Anna" },
        { memberId: 2, memberName: "Bob" },
        { memberId: 3, memberName: "Charlie" },
        { memberId: 4, memberName: "Diana" },
        { memberId: 5, memberName: "Eve" },
      ];
      
      const schedule: ScheduleOccurrence[] = [
        { occurrenceNumber: 1, members: [{ position: 1, memberId: 0 }, { position: 2, memberId: 0 }] },
        { occurrenceNumber: 2, members: [{ position: 1, memberId: 0 }, { position: 2, memberId: 0 }] },
        { occurrenceNumber: 3, members: [{ position: 1, memberId: 0 }, { position: 2, memberId: 0 }] },
      ];

      const result = autoFillSchedule(schedule, manyMembers);

      // Should cycle through all members
      expect(result[0].members[0].memberId).toBe(1); // Anna
      expect(result[0].members[1].memberId).toBe(2); // Bob
      expect(result[1].members[0].memberId).toBe(3); // Charlie
      expect(result[1].members[1].memberId).toBe(4); // Diana
      expect(result[2].members[0].memberId).toBe(5); // Eve
      expect(result[2].members[1].memberId).toBe(1); // Back to Anna
    });

    it("should return unchanged schedule if no eligible members", () => {
      const schedule: ScheduleOccurrence[] = [
        { occurrenceNumber: 1, members: [{ position: 1, memberId: 0 }, { position: 2, memberId: 0 }] },
      ];

      const result = autoFillSchedule(schedule, []);

      expect(result[0].members[0].memberId).toBe(0);
      expect(result[0].members[1].memberId).toBe(0);
    });

    it("should handle schedule with all positions already filled", () => {
      const schedule: ScheduleOccurrence[] = [
        { occurrenceNumber: 1, members: [{ position: 1, memberId: 2 }, { position: 2, memberId: 3 }] },
        { occurrenceNumber: 2, members: [{ position: 1, memberId: 1 }, { position: 2, memberId: 2 }] },
      ];

      const result = autoFillSchedule(schedule, members);

      // All should remain unchanged
      expect(result[0].members[0].memberId).toBe(2);
      expect(result[0].members[1].memberId).toBe(3);
      expect(result[1].members[0].memberId).toBe(1);
      expect(result[1].members[1].memberId).toBe(2);
    });
  });

  describe("Exclusion Simulation", () => {
    it("should respect excluded members by filtering them out", () => {
      const excludedIds = [2]; // Bob is excluded
      const eligibleMembers = members.filter(m => !excludedIds.includes(m.memberId));
      
      const schedule: ScheduleOccurrence[] = [
        { occurrenceNumber: 1, members: [{ position: 1, memberId: 0 }, { position: 2, memberId: 0 }] },
        { occurrenceNumber: 2, members: [{ position: 1, memberId: 0 }, { position: 2, memberId: 0 }] },
      ];

      const result = autoFillSchedule(schedule, eligibleMembers);

      // Should only use Anna and Charlie (Bob excluded)
      expect(result[0].members[0].memberId).toBe(1); // Anna
      expect(result[0].members[1].memberId).toBe(3); // Charlie
      expect(result[1].members[0].memberId).toBe(1); // Anna
      expect(result[1].members[1].memberId).toBe(3); // Charlie
      
      // Bob (id 2) should never appear
      const allMemberIds = result.flatMap(occ => occ.members.map(m => m.memberId));
      expect(allMemberIds).not.toContain(2);
    });
  });

  describe("Different requiredPersons", () => {
    it("should handle requiredPersons = 1", () => {
      const schedule: ScheduleOccurrence[] = [
        { occurrenceNumber: 1, members: [{ position: 1, memberId: 0 }] },
        { occurrenceNumber: 2, members: [{ position: 1, memberId: 0 }] },
        { occurrenceNumber: 3, members: [{ position: 1, memberId: 0 }] },
      ];

      const result = autoFillSchedule(schedule, members);

      expect(result[0].members[0].memberId).toBe(1); // Anna
      expect(result[1].members[0].memberId).toBe(2); // Bob
      expect(result[2].members[0].memberId).toBe(3); // Charlie
    });

    it("should handle requiredPersons = 3", () => {
      const schedule: ScheduleOccurrence[] = [
        { occurrenceNumber: 1, members: [
          { position: 1, memberId: 0 },
          { position: 2, memberId: 0 },
          { position: 3, memberId: 0 },
        ]},
        { occurrenceNumber: 2, members: [
          { position: 1, memberId: 0 },
          { position: 2, memberId: 0 },
          { position: 3, memberId: 0 },
        ]},
      ];

      const result = autoFillSchedule(schedule, members);

      // First occurrence: Anna, Bob, Charlie
      expect(result[0].members[0].memberId).toBe(1);
      expect(result[0].members[1].memberId).toBe(2);
      expect(result[0].members[2].memberId).toBe(3);
      
      // Second occurrence: Anna, Bob, Charlie (cycle repeats)
      expect(result[1].members[0].memberId).toBe(1);
      expect(result[1].members[1].memberId).toBe(2);
      expect(result[1].members[2].memberId).toBe(3);
    });
  });
});
