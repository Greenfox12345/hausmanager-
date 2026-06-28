/**
 * Unit-Tests für die Rotation-Occurrence-Management-Logik.
 *
 * Diese Tests sind vollständig datenbankfrei und testen die reine Algorithmus-Logik
 * der Funktionen deleteRotationOccurrence, skipRotationOccurrence und moveRotationOccurrence.
 * Die Kernalgorithmen werden als lokale Hilfsfunktionen implementiert,
 * die exakt die gleiche Logik wie die DB-Funktionen in server/db.ts abbilden.
 */

import { describe, it, expect, beforeEach } from 'vitest';

// ─── Typen ────────────────────────────────────────────────────────────────────

interface OccurrenceMember {
  position: number;
  memberId: number;
}

interface Occurrence {
  occurrenceNumber: number;
  members: OccurrenceMember[];
  notes?: string;
  isSkipped?: boolean;
  isSpecial?: boolean;
  specialName?: string;
}

// ─── In-Memory-Implementierungen (spiegeln die Logik aus server/db.ts) ────────

function deleteOccurrence(
  schedule: Occurrence[],
  occurrenceNumber: number
): { schedule: Occurrence[]; success: boolean } {
  const updated = schedule
    .filter(occ => occ.occurrenceNumber !== occurrenceNumber)
    .map((occ, index) => ({ ...occ, occurrenceNumber: index + 1 }));
  return { schedule: updated, success: true };
}

function skipOccurrence(
  schedule: Occurrence[],
  occurrenceNumber: number
): { schedule: Occurrence[]; success: boolean; isSkipped?: boolean } {
  const idx = schedule.findIndex(occ => occ.occurrenceNumber === occurrenceNumber);
  if (idx === -1) throw new Error('Occurrence not found');

  const occurrence = schedule[idx];
  const newSkipStatus = !occurrence.isSkipped;

  let newNotes: string | undefined;
  if (newSkipStatus) {
    newNotes = occurrence.notes
      ? `[ÜBERSPRUNGEN] ${occurrence.notes}`
      : '[ÜBERSPRUNGEN]';
  } else {
    newNotes = occurrence.notes?.replace(/^\[ÜBERSPRUNGEN\]\s?/, '') || undefined;
  }

  const updated = schedule.map((occ, i) =>
    i === idx ? { ...occ, isSkipped: newSkipStatus, notes: newNotes } : occ
  );
  return { schedule: updated, success: true, isSkipped: newSkipStatus };
}

function moveOccurrence(
  schedule: Occurrence[],
  occurrenceNumber: number,
  direction: 'up' | 'down'
): { schedule: Occurrence[]; success: boolean; message?: string } {
  const currentIndex = schedule.findIndex(occ => occ.occurrenceNumber === occurrenceNumber);
  if (currentIndex === -1) throw new Error('Occurrence not found');

  const swapIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;

  if (swapIndex < 0 || swapIndex >= schedule.length) {
    return { schedule, success: false, message: 'Cannot move occurrence in that direction' };
  }

  const copy = [...schedule];
  const temp = copy[currentIndex];
  copy[currentIndex] = copy[swapIndex];
  copy[swapIndex] = temp;

  const updated = copy.map((occ, index) => ({ ...occ, occurrenceNumber: index + 1 }));
  return { schedule: updated, success: true };
}

// ─── Test-Fixtures ────────────────────────────────────────────────────────────

function createInitialSchedule(): Occurrence[] {
  return [
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
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Rotation Occurrence Management (In-Memory)', () => {
  let schedule: Occurrence[];

  beforeEach(() => {
    schedule = createInitialSchedule();
  });

  describe('deleteRotationOccurrence', () => {
    it('should delete an occurrence and renumber remaining occurrences', () => {
      const { schedule: updated } = deleteOccurrence(schedule, 2);

      expect(updated.length).toBe(4);
      expect(updated[0].occurrenceNumber).toBe(1);
      expect(updated[1].occurrenceNumber).toBe(2); // War Occurrence 3
      expect(updated[2].occurrenceNumber).toBe(3); // War Occurrence 4
      expect(updated[3].occurrenceNumber).toBe(4); // War Occurrence 5

      // Occurrence 2 hatte memberId 2 an Position 1 – jetzt sollte memberId 3 dort sein (war Occurrence 3)
      expect(updated[1].members[0].memberId).toBe(3);
    });

    it('should handle deleting the first occurrence', () => {
      const { schedule: updated } = deleteOccurrence(schedule, 1);

      expect(updated.length).toBe(4);
      expect(updated[0].occurrenceNumber).toBe(1);
      // Erste Occurrence sollte jetzt das sein, was Occurrence 2 war
      expect(updated[0].members[0].memberId).toBe(2);
    });

    it('should handle deleting the last occurrence', () => {
      const { schedule: updated } = deleteOccurrence(schedule, 5);

      expect(updated.length).toBe(4);
      expect(updated[3].occurrenceNumber).toBe(4);
    });
  });

  describe('skipRotationOccurrence', () => {
    it('should add skip marker to occurrence notes', () => {
      const { schedule: updated } = skipOccurrence(schedule, 2);

      const occurrence = updated.find(occ => occ.occurrenceNumber === 2);
      expect(occurrence).toBeDefined();
      expect(occurrence?.notes).toContain('[ÜBERSPRUNGEN]');
      expect(occurrence?.notes).toContain('Second occurrence');
    });

    it('should add skip marker to occurrence without existing notes', () => {
      const { schedule: updated } = skipOccurrence(schedule, 3);

      const occurrence = updated.find(occ => occ.occurrenceNumber === 3);
      expect(occurrence).toBeDefined();
      expect(occurrence?.notes).toBe('[ÜBERSPRUNGEN]');
    });

    it('should not affect other occurrences', () => {
      const { schedule: updated } = skipOccurrence(schedule, 2);

      const occurrence1 = updated.find(occ => occ.occurrenceNumber === 1);
      const occurrence3 = updated.find(occ => occ.occurrenceNumber === 3);
      expect(occurrence1?.notes).toBe('First occurrence');
      // Occurrence 3 hat keine notes (undefined) – also kein ÜBERSPRUNGEN-Marker
      expect(occurrence3?.notes ?? '').not.toContain('[ÜBERSPRUNGEN]');
    });
  });

  describe('moveRotationOccurrence', () => {
    it('should move occurrence up and swap with previous', () => {
      const { schedule: updated } = moveOccurrence(schedule, 3, 'up');

      // Occurrence 2 sollte jetzt die Members von Occurrence 3 haben
      expect(updated[1].members[0].memberId).toBe(3);
      expect(updated[1].members[1].memberId).toBe(1);
      // Occurrence 3 sollte jetzt die Members von Occurrence 2 haben
      expect(updated[2].members[0].memberId).toBe(2);
      expect(updated[2].members[1].memberId).toBe(3);
    });

    it('should move occurrence down and swap with next', () => {
      const { schedule: updated } = moveOccurrence(schedule, 2, 'down');

      // Occurrence 2 sollte jetzt die Members von Occurrence 3 haben
      expect(updated[1].members[0].memberId).toBe(3);
      expect(updated[1].members[1].memberId).toBe(1);
      // Occurrence 3 sollte jetzt die Members von Occurrence 2 haben
      expect(updated[2].members[0].memberId).toBe(2);
      expect(updated[2].members[1].memberId).toBe(3);
    });

    it('should not move first occurrence up', () => {
      const result = moveOccurrence(schedule, 1, 'up');
      expect(result.success).toBe(false);
      expect(result.message).toBeDefined();
    });

    it('should not move last occurrence down', () => {
      const result = moveOccurrence(schedule, 5, 'down');
      expect(result.success).toBe(false);
      expect(result.message).toBeDefined();
    });

    it('should preserve notes when moving occurrences', () => {
      const { schedule: updated } = moveOccurrence(schedule, 2, 'up');

      // Was Occurrence 2 ist jetzt an Position 1
      expect(updated[0].notes).toBe('Second occurrence');
      // Was Occurrence 1 ist jetzt an Position 2
      expect(updated[1].notes).toBe('First occurrence');
    });
  });
});
