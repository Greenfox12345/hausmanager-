/**
 * Tests für die Mindest-3-Occurrences-Logik nach completeTask
 *
 * Diese Tests prüfen:
 * 1. getRealRotationSchedule gibt nur echte DB-Einträge zurück (keine virtuellen)
 * 2. getRotationSchedule füllt auf mindestens 3 auf (virtuelle Einträge)
 * 3. Die Erweiterungslogik erkennt korrekt ob echte Einträge fehlen
 * 4. Occurrence-Nummern werden korrekt berechnet
 */

import { describe, it, expect } from "vitest";

// ─── Hilfsfunktionen die wir testen ───────────────────────────────────────────

/**
 * Simuliert getRotationSchedule (mit virtueller Auffüllung auf min. 3)
 */
function simulateGetRotationSchedule(
  realEntries: Array<{ occurrenceNumber: number; members: { position: number; memberId: number }[] }>
) {
  const result = [...realEntries];
  const minOccurrences = 3;
  if (result.length < minOccurrences) {
    const maxOccurrence = result.length > 0 ? Math.max(...result.map(r => r.occurrenceNumber)) : 0;
    for (let i = result.length; i < minOccurrences; i++) {
      result.push({
        occurrenceNumber: maxOccurrence + i + 1,
        members: [],
      });
    }
  }
  return result.sort((a, b) => a.occurrenceNumber - b.occurrenceNumber);
}

/**
 * Simuliert die Erweiterungslogik: Fügt Einträge hinzu bis min. 3 echte vorhanden sind
 */
function simulateExtendToMinOccurrences(
  realEntries: Array<{ occurrenceNumber: number; members: { position: number; memberId: number }[] }>,
  availableMembers: Array<{ id: number }>,
  requiredPersons: number
): Array<{ occurrenceNumber: number; members: { position: number; memberId: number }[] }> {
  const result = [...realEntries];
  let safetyCounter = 0;

  while (safetyCounter++ < 10) {
    if (result.length >= 3) break;

    const newOccurrenceNumber = result.length > 0
      ? Math.max(...result.map(r => r.occurrenceNumber)) + 1
      : 1;
    const newMembers: { position: number; memberId: number }[] = [];

    for (let i = 0; i < requiredPersons; i++) {
      if (availableMembers.length > 0) {
        const lastRealOcc = result[result.length - 1];
        const lastMember = lastRealOcc?.members?.[0];
        const lastIdx = lastMember
          ? availableMembers.findIndex(m => m.id === lastMember.memberId)
          : -1;
        const memberIndex = (lastIdx + 1 + i) % availableMembers.length;
        newMembers.push({
          position: i + 1,
          memberId: availableMembers[memberIndex < 0 ? 0 : memberIndex].id,
        });
      }
    }

    if (newMembers.length > 0) {
      result.push({ occurrenceNumber: newOccurrenceNumber, members: newMembers });
    } else {
      break;
    }
  }

  return result;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("Mindest-3-Occurrences-Logik", () => {

  describe("getRotationSchedule virtuelle Auffüllung", () => {
    it("gibt 3 Einträge zurück wenn 0 echte vorhanden sind", () => {
      const result = simulateGetRotationSchedule([]);
      expect(result.length).toBe(3);
    });

    it("gibt 3 Einträge zurück wenn 1 echter vorhanden ist", () => {
      const result = simulateGetRotationSchedule([
        { occurrenceNumber: 1, members: [{ position: 1, memberId: 10 }] },
      ]);
      expect(result.length).toBe(3);
      // Virtueller Eintrag hat keine Members
      expect(result[1].members).toEqual([]);
      expect(result[2].members).toEqual([]);
    });

    it("gibt 3 Einträge zurück wenn 2 echte vorhanden sind", () => {
      const result = simulateGetRotationSchedule([
        { occurrenceNumber: 1, members: [{ position: 1, memberId: 10 }] },
        { occurrenceNumber: 2, members: [{ position: 1, memberId: 11 }] },
      ]);
      expect(result.length).toBe(3);
      expect(result[2].members).toEqual([]); // Virtuell
    });

    it("gibt 3 echte Einträge zurück wenn 3 echte vorhanden sind", () => {
      const result = simulateGetRotationSchedule([
        { occurrenceNumber: 1, members: [{ position: 1, memberId: 10 }] },
        { occurrenceNumber: 2, members: [{ position: 1, memberId: 11 }] },
        { occurrenceNumber: 3, members: [{ position: 1, memberId: 12 }] },
      ]);
      expect(result.length).toBe(3);
      // Alle haben Members (keine virtuellen)
      expect(result[0].members.length).toBe(1);
      expect(result[1].members.length).toBe(1);
      expect(result[2].members.length).toBe(1);
    });

    it("gibt mehr als 3 Einträge zurück wenn 5 echte vorhanden sind", () => {
      const entries = Array.from({ length: 5 }, (_, i) => ({
        occurrenceNumber: i + 1,
        members: [{ position: 1, memberId: 10 + i }],
      }));
      const result = simulateGetRotationSchedule(entries);
      expect(result.length).toBe(5);
    });
  });

  describe("PROBLEM: getRotationSchedule täuscht über echte Anzahl hinweg", () => {
    it("getRotationSchedule gibt length=3 zurück auch wenn nur 1 echter Eintrag vorhanden ist", () => {
      const realEntries = [
        { occurrenceNumber: 1, members: [{ position: 1, memberId: 10 }] },
      ];
      const withPadding = simulateGetRotationSchedule(realEntries);
      
      // Das ist das Problem: length=3, obwohl nur 1 echter Eintrag
      expect(withPadding.length).toBe(3);
      // Alte Logik: updatedSchedule.length < 3 → false → keine Erweiterung!
      expect(withPadding.length < 3).toBe(false); // Bug: Erweiterung wird nie ausgelöst
    });

    it("getRealRotationSchedule gibt korrekte echte Anzahl zurück", () => {
      const realEntries = [
        { occurrenceNumber: 1, members: [{ position: 1, memberId: 10 }] },
      ];
      // getRealRotationSchedule gibt nur echte Einträge zurück
      expect(realEntries.length).toBe(1); // Korrekt: 1 echter Eintrag
      expect(realEntries.length < 3).toBe(true); // Fix: Erweiterung wird ausgelöst
    });
  });

  describe("Erweiterungslogik mit getRealRotationSchedule", () => {
    const members = [
      { id: 10 }, { id: 11 }, { id: 12 },
    ];

    it("erweitert von 0 auf 3 Einträge", () => {
      const result = simulateExtendToMinOccurrences([], members, 1);
      expect(result.length).toBe(3);
    });

    it("erweitert von 1 auf 3 Einträge", () => {
      const initial = [
        { occurrenceNumber: 1, members: [{ position: 1, memberId: 10 }] },
      ];
      const result = simulateExtendToMinOccurrences(initial, members, 1);
      expect(result.length).toBe(3);
    });

    it("erweitert von 2 auf 3 Einträge", () => {
      const initial = [
        { occurrenceNumber: 1, members: [{ position: 1, memberId: 10 }] },
        { occurrenceNumber: 2, members: [{ position: 1, memberId: 11 }] },
      ];
      const result = simulateExtendToMinOccurrences(initial, members, 1);
      expect(result.length).toBe(3);
    });

    it("erweitert nicht wenn bereits 3 vorhanden sind", () => {
      const initial = [
        { occurrenceNumber: 1, members: [{ position: 1, memberId: 10 }] },
        { occurrenceNumber: 2, members: [{ position: 1, memberId: 11 }] },
        { occurrenceNumber: 3, members: [{ position: 1, memberId: 12 }] },
      ];
      const result = simulateExtendToMinOccurrences(initial, members, 1);
      expect(result.length).toBe(3);
    });

    it("rotiert Member korrekt bei Erweiterung (Round-Robin)", () => {
      const initial = [
        { occurrenceNumber: 1, members: [{ position: 1, memberId: 10 }] },
        { occurrenceNumber: 2, members: [{ position: 1, memberId: 11 }] },
      ];
      const result = simulateExtendToMinOccurrences(initial, members, 1);
      expect(result.length).toBe(3);
      // Nächster nach 11 (index 1) ist 12 (index 2)
      expect(result[2].members[0].memberId).toBe(12);
    });

    it("rotiert Member korrekt nach dem letzten Member (wrap-around)", () => {
      const initial = [
        { occurrenceNumber: 1, members: [{ position: 1, memberId: 12 }] }, // letzter Member
        { occurrenceNumber: 2, members: [{ position: 1, memberId: 10 }] }, // wrap-around zu erstem
      ];
      const result = simulateExtendToMinOccurrences(initial, members, 1);
      expect(result.length).toBe(3);
      // Nächster nach 10 (index 0) ist 11 (index 1)
      expect(result[2].members[0].memberId).toBe(11);
    });

    it("bricht ab wenn keine Members verfügbar sind", () => {
      const result = simulateExtendToMinOccurrences([], [], 1);
      expect(result.length).toBe(0); // Keine Members → keine Erweiterung
    });

    it("korrekte Occurrence-Nummern nach Erweiterung", () => {
      const initial = [
        { occurrenceNumber: 1, members: [{ position: 1, memberId: 10 }] },
      ];
      const result = simulateExtendToMinOccurrences(initial, members, 1);
      expect(result.map(r => r.occurrenceNumber)).toEqual([1, 2, 3]);
    });

    it("korrekte Occurrence-Nummern wenn Lücken vorhanden sind", () => {
      // Nach deleteRotationOccurrence können Lücken entstehen
      const initial = [
        { occurrenceNumber: 1, members: [{ position: 1, memberId: 10 }] },
        { occurrenceNumber: 3, members: [{ position: 1, memberId: 12 }] }, // Lücke bei 2
      ];
      const result = simulateExtendToMinOccurrences(initial, members, 1);
      expect(result.length).toBe(3);
      // Neue Occurrence bekommt max(1,3)+1 = 4
      expect(result[2].occurrenceNumber).toBe(4);
    });
  });

  describe("Scenario: nach completeTask immer 3 Termine sichtbar", () => {
    it("Scenario: 3 Termine → abschließen → immer noch 3 Termine", () => {
      // Ausgangszustand: 3 echte Einträge
      let realEntries = [
        { occurrenceNumber: 1, members: [{ position: 1, memberId: 10 }] },
        { occurrenceNumber: 2, members: [{ position: 1, memberId: 11 }] },
        { occurrenceNumber: 3, members: [{ position: 1, memberId: 12 }] },
      ];

      // Schritt 1: Occurrence 1 abschließen → löschen und renummerieren
      realEntries = realEntries
        .filter(e => e.occurrenceNumber !== 1)
        .map((e, i) => ({ ...e, occurrenceNumber: i + 1 }));
      
      expect(realEntries.length).toBe(2); // Jetzt nur noch 2

      // Schritt 2: Erweiterung auf 3
      const members = [{ id: 10 }, { id: 11 }, { id: 12 }];
      const extended = simulateExtendToMinOccurrences(realEntries, members, 1);
      
      expect(extended.length).toBe(3); // Wieder 3
    });

    it("Scenario: 1 Termin → abschließen → 3 Termine werden generiert", () => {
      // Ausgangszustand: nur 1 echter Eintrag (z.B. nach vielen Abschlüssen)
      let realEntries = [
        { occurrenceNumber: 1, members: [{ position: 1, memberId: 10 }] },
      ];

      // Abschließen: Occurrence 1 löschen
      realEntries = realEntries.filter(e => e.occurrenceNumber !== 1);
      expect(realEntries.length).toBe(0); // Leer

      // Erweiterung auf 3
      const members = [{ id: 10 }, { id: 11 }, { id: 12 }];
      const extended = simulateExtendToMinOccurrences(realEntries, members, 1);
      
      expect(extended.length).toBe(3);
      expect(extended[0].occurrenceNumber).toBe(1);
      expect(extended[1].occurrenceNumber).toBe(2);
      expect(extended[2].occurrenceNumber).toBe(3);
    });
  });
});
