import { describe, it, expect, beforeEach } from 'vitest';
import {
  deleteRotationOccurrence,
  skipRotationOccurrence,
  moveRotationOccurrence,
  getRotationSchedule,
  setRotationSchedule,
} from './db';

describe('Rotation Occurrence Management', () => {
  const testTaskId = 99999; // Use a high ID to avoid conflicts

  beforeEach(async () => {
    // Set up initial schedule with 5 occurrences
    const initialSchedule = [
      {
        occurrenceNumber: 1,
        members: [
          { position: 1, memberId: 1 },
          { position: 2, memberId: 2 },
        ],
        notes: 'First occurrence',
      },
      {
        occurrenceNumber: 2,
        members: [
          { position: 1, memberId: 2 },
          { position: 2, memberId: 3 },
        ],
        notes: 'Second occurrence',
      },
      {
        occurrenceNumber: 3,
        members: [
          { position: 1, memberId: 3 },
          { position: 2, memberId: 1 },
        ],
      },
      {
        occurrenceNumber: 4,
        members: [
          { position: 1, memberId: 1 },
          { position: 2, memberId: 2 },
        ],
      },
      {
        occurrenceNumber: 5,
        members: [
          { position: 1, memberId: 2 },
          { position: 2, memberId: 3 },
        ],
      },
    ];

    await setRotationSchedule(testTaskId, initialSchedule);
  });

  describe('deleteRotationOccurrence', () => {
    it('should delete an occurrence and renumber remaining occurrences', async () => {
      // Delete occurrence 2
      await deleteRotationOccurrence(testTaskId, 2);

      const schedule = await getRotationSchedule(testTaskId);

      // Should have 4 occurrences left
      expect(schedule.length).toBe(4);

      // Check that occurrence numbers are renumbered correctly
      expect(schedule[0].occurrenceNumber).toBe(1);
      expect(schedule[1].occurrenceNumber).toBe(2); // Was occurrence 3
      expect(schedule[2].occurrenceNumber).toBe(3); // Was occurrence 4
      expect(schedule[3].occurrenceNumber).toBe(4); // Was occurrence 5

      // Check that the correct occurrence was deleted (occurrence 2 had member 2 in position 1)
      // Now occurrence 2 should have member 3 in position 1 (was occurrence 3)
      expect(schedule[1].members[0].memberId).toBe(3);
    });

    it('should handle deleting the first occurrence', async () => {
      await deleteRotationOccurrence(testTaskId, 1);

      const schedule = await getRotationSchedule(testTaskId);

      expect(schedule.length).toBe(4);
      expect(schedule[0].occurrenceNumber).toBe(1);
      // First occurrence should now be what was occurrence 2
      expect(schedule[0].members[0].memberId).toBe(2);
    });

    it('should handle deleting the last occurrence', async () => {
      await deleteRotationOccurrence(testTaskId, 5);

      const schedule = await getRotationSchedule(testTaskId);

      expect(schedule.length).toBe(4);
      expect(schedule[3].occurrenceNumber).toBe(4);
    });
  });

  describe('skipRotationOccurrence', () => {
    it('should add skip marker to occurrence notes', async () => {
      await skipRotationOccurrence(testTaskId, 2);

      const schedule = await getRotationSchedule(testTaskId);

      // Find occurrence 2
      const occurrence = schedule.find(occ => occ.occurrenceNumber === 2);
      expect(occurrence).toBeDefined();
      expect(occurrence?.notes).toContain('[ÜBERSPRUNGEN]');
      expect(occurrence?.notes).toContain('Second occurrence');
    });

    it('should add skip marker to occurrence without existing notes', async () => {
      await skipRotationOccurrence(testTaskId, 3);

      const schedule = await getRotationSchedule(testTaskId);

      const occurrence = schedule.find(occ => occ.occurrenceNumber === 3);
      expect(occurrence).toBeDefined();
      expect(occurrence?.notes).toBe('[ÜBERSPRUNGEN]');
    });

    it('should not affect other occurrences', async () => {
      await skipRotationOccurrence(testTaskId, 2);

      const schedule = await getRotationSchedule(testTaskId);

      // Other occurrences should remain unchanged
      const occurrence1 = schedule.find(occ => occ.occurrenceNumber === 1);
      const occurrence3 = schedule.find(occ => occ.occurrenceNumber === 3);

      expect(occurrence1?.notes).toBe('First occurrence');
      expect(occurrence3?.notes).not.toContain('[ÜBERSPRUNGEN]');
    });
  });

  describe('moveRotationOccurrence', () => {
    it('should move occurrence up and swap with previous', async () => {
      // Move occurrence 3 up (swap with occurrence 2)
      await moveRotationOccurrence(testTaskId, 3, 'up');

      const schedule = await getRotationSchedule(testTaskId);

      // Occurrence 2 should now have what was occurrence 3's members
      expect(schedule[1].members[0].memberId).toBe(3);
      expect(schedule[1].members[1].memberId).toBe(1);

      // Occurrence 3 should now have what was occurrence 2's members
      expect(schedule[2].members[0].memberId).toBe(2);
      expect(schedule[2].members[1].memberId).toBe(3);
    });

    it('should move occurrence down and swap with next', async () => {
      // Move occurrence 2 down (swap with occurrence 3)
      await moveRotationOccurrence(testTaskId, 2, 'down');

      const schedule = await getRotationSchedule(testTaskId);

      // Occurrence 2 should now have what was occurrence 3's members
      expect(schedule[1].members[0].memberId).toBe(3);
      expect(schedule[1].members[1].memberId).toBe(1);

      // Occurrence 3 should now have what was occurrence 2's members
      expect(schedule[2].members[0].memberId).toBe(2);
      expect(schedule[2].members[1].memberId).toBe(3);
    });

    it('should not move first occurrence up', async () => {
      const result = await moveRotationOccurrence(testTaskId, 1, 'up');

      expect(result.success).toBe(false);
      expect(result.message).toBeDefined();
    });

    it('should not move last occurrence down', async () => {
      const result = await moveRotationOccurrence(testTaskId, 5, 'down');

      expect(result.success).toBe(false);
      expect(result.message).toBeDefined();
    });

    it('should preserve notes when moving occurrences', async () => {
      await moveRotationOccurrence(testTaskId, 2, 'up');

      const schedule = await getRotationSchedule(testTaskId);

      // The notes should move with the occurrence
      // What was occurrence 2 is now at position 1
      expect(schedule[0].notes).toBe('Second occurrence');
      // What was occurrence 1 is now at position 2
      expect(schedule[1].notes).toBe('First occurrence');
    });
  });
});
