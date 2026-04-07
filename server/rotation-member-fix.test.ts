/**
 * Tests für den Fix: Member-Auswahl bei Terminen mit leerem members-Array
 * 
 * Root Cause: Wenn Termine aus der DB geladen werden und members: [] haben
 * (weil memberId=0 beim Speichern herausgefiltert wird), konnte handleMemberChange
 * den Member nicht zuweisen, weil .map() über ein leeres Array iterierte.
 * 
 * Fix: 
 * 1. handleMemberChange erstellt einen neuen Eintrag wenn keine Position existiert
 * 2. Initialisierung füllt leere members-Arrays mit Platzhaltern auf
 */

import { describe, it, expect } from "vitest";

// Simuliert die alte handleMemberChange-Logik (nur .map)
function handleMemberChangeOLD(
  schedule: Array<{ occurrenceNumber: number; members: { position: number; memberId: number }[] }>,
  occurrenceNumber: number,
  position: number,
  memberId: number
) {
  return schedule.map(occ => {
    if (occ.occurrenceNumber !== occurrenceNumber) return occ;
    const newMembers = occ.members.map(m =>
      m.position === position ? { ...m, memberId } : m
    );
    return { ...occ, members: newMembers };
  });
}

// Simuliert die neue handleMemberChange-Logik (mit Fallback für fehlende Position)
function handleMemberChangeNEW(
  schedule: Array<{ occurrenceNumber: number; members: { position: number; memberId: number }[] }>,
  occurrenceNumber: number,
  position: number,
  memberId: number
) {
  return schedule.map(occ => {
    if (occ.occurrenceNumber !== occurrenceNumber) return occ;
    const hasPosition = occ.members.some(m => m.position === position);
    let newMembers;
    if (hasPosition) {
      newMembers = occ.members.map(m =>
        m.position === position ? { ...m, memberId } : m
      );
    } else {
      newMembers = [...occ.members, { position, memberId }];
    }
    return { ...occ, members: newMembers };
  });
}

// Simuliert die Normalisierung beim Initialisieren
function normalizeSchedule(
  schedule: Array<{ occurrenceNumber: number; members: { position: number; memberId: number }[] }>,
  requiredPersons: number
) {
  return schedule.map(occ => {
    if (occ.members.length >= requiredPersons) return occ;
    const existingPositions = new Set(occ.members.map(m => m.position));
    const filledMembers = [...occ.members];
    for (let pos = 1; pos <= requiredPersons; pos++) {
      if (!existingPositions.has(pos)) {
        filledMembers.push({ position: pos, memberId: 0 });
      }
    }
    return { ...occ, members: filledMembers.sort((a, b) => a.position - b.position) };
  });
}

describe("Rotation Member Fix: handleMemberChange mit leerem members-Array", () => {
  
  // Simuliert die Daten wie sie aus der DB kommen (nach dem Speichern mit memberId=0 gefiltert)
  const scheduleFromDB = [
    { occurrenceNumber: 1, members: [] },
    { occurrenceNumber: 2, members: [] },
    { occurrenceNumber: 3, members: [] },
  ];

  describe("ALTE Logik (Bug)", () => {
    it("kann keinen Member zuweisen wenn members leer ist", () => {
      const result = handleMemberChangeOLD(scheduleFromDB, 1, 1, 42);
      // Bug: members bleibt leer weil .map() über leeres Array iteriert
      expect(result[0].members).toEqual([]);
      expect(result[0].members.length).toBe(0);
    });
  });

  describe("NEUE Logik (Fix)", () => {
    it("erstellt neuen Eintrag wenn Position nicht existiert", () => {
      const result = handleMemberChangeNEW(scheduleFromDB, 1, 1, 42);
      expect(result[0].members.length).toBe(1);
      expect(result[0].members[0]).toEqual({ position: 1, memberId: 42 });
    });

    it("aktualisiert existierenden Eintrag wenn Position vorhanden", () => {
      const scheduleWithMembers = [
        { occurrenceNumber: 1, members: [{ position: 1, memberId: 0 }] },
      ];
      const result = handleMemberChangeNEW(scheduleWithMembers, 1, 1, 42);
      expect(result[0].members.length).toBe(1);
      expect(result[0].members[0]).toEqual({ position: 1, memberId: 42 });
    });

    it("fügt zweite Position hinzu ohne erste zu überschreiben", () => {
      const scheduleWithOnePos = [
        { occurrenceNumber: 1, members: [{ position: 1, memberId: 42 }] },
      ];
      const result = handleMemberChangeNEW(scheduleWithOnePos, 1, 2, 99);
      expect(result[0].members.length).toBe(2);
      expect(result[0].members[0]).toEqual({ position: 1, memberId: 42 });
      expect(result[0].members[1]).toEqual({ position: 2, memberId: 99 });
    });

    it("ändert nur den richtigen Termin", () => {
      const result = handleMemberChangeNEW(scheduleFromDB, 2, 1, 42);
      expect(result[0].members).toEqual([]); // Termin 1 unverändert
      expect(result[1].members.length).toBe(1); // Termin 2 geändert
      expect(result[1].members[0]).toEqual({ position: 1, memberId: 42 });
      expect(result[2].members).toEqual([]); // Termin 3 unverändert
    });
  });
});

describe("Rotation Member Fix: Normalisierung beim Initialisieren", () => {
  
  it("füllt leere members mit Platzhaltern auf (1 Person)", () => {
    const schedule = [
      { occurrenceNumber: 1, members: [] },
      { occurrenceNumber: 2, members: [] },
    ];
    const result = normalizeSchedule(schedule, 1);
    expect(result[0].members).toEqual([{ position: 1, memberId: 0 }]);
    expect(result[1].members).toEqual([{ position: 1, memberId: 0 }]);
  });

  it("füllt leere members mit Platzhaltern auf (2 Personen)", () => {
    const schedule = [
      { occurrenceNumber: 1, members: [] },
    ];
    const result = normalizeSchedule(schedule, 2);
    expect(result[0].members).toEqual([
      { position: 1, memberId: 0 },
      { position: 2, memberId: 0 },
    ]);
  });

  it("lässt vollständige members unverändert", () => {
    const schedule = [
      { occurrenceNumber: 1, members: [{ position: 1, memberId: 42 }, { position: 2, memberId: 99 }] },
    ];
    const result = normalizeSchedule(schedule, 2);
    expect(result[0].members).toEqual([
      { position: 1, memberId: 42 },
      { position: 2, memberId: 99 },
    ]);
  });

  it("füllt fehlende Positionen auf ohne existierende zu überschreiben", () => {
    const schedule = [
      { occurrenceNumber: 1, members: [{ position: 1, memberId: 42 }] },
    ];
    const result = normalizeSchedule(schedule, 2);
    expect(result[0].members).toEqual([
      { position: 1, memberId: 42 },
      { position: 2, memberId: 0 },
    ]);
  });

  it("sortiert members nach Position", () => {
    const schedule = [
      { occurrenceNumber: 1, members: [{ position: 2, memberId: 99 }] },
    ];
    const result = normalizeSchedule(schedule, 2);
    expect(result[0].members[0].position).toBe(1);
    expect(result[0].members[1].position).toBe(2);
  });
});

describe("Rotation Member Fix: Gesamter Workflow (DB → Normalisierung → Member-Auswahl)", () => {
  
  it("simuliert den kompletten Workflow: DB-Daten → Normalisierung → Member zuweisen", () => {
    // 1. Daten aus DB (members leer weil memberId=0 gefiltert wurde)
    const fromDB = [
      { occurrenceNumber: 1, members: [] },
      { occurrenceNumber: 2, members: [] },
      { occurrenceNumber: 3, members: [] },
    ];

    // 2. Normalisierung beim Initialisieren (requiredPersons = 1)
    const normalized = normalizeSchedule(fromDB, 1);
    expect(normalized[0].members).toEqual([{ position: 1, memberId: 0 }]);
    expect(normalized[1].members).toEqual([{ position: 1, memberId: 0 }]);
    expect(normalized[2].members).toEqual([{ position: 1, memberId: 0 }]);

    // 3. User wählt Member für Termin 1
    const afterSelect1 = handleMemberChangeNEW(normalized, 1, 1, 42);
    expect(afterSelect1[0].members[0]).toEqual({ position: 1, memberId: 42 });

    // 4. User wählt Member für Termin 2
    const afterSelect2 = handleMemberChangeNEW(afterSelect1, 2, 1, 99);
    expect(afterSelect2[1].members[0]).toEqual({ position: 1, memberId: 99 });

    // 5. User wählt Member für Termin 3
    const afterSelect3 = handleMemberChangeNEW(afterSelect2, 3, 1, 42);
    expect(afterSelect3[2].members[0]).toEqual({ position: 1, memberId: 42 });

    // Alle 3 Termine haben jetzt Members zugewiesen
    expect(afterSelect3.every(occ => occ.members.length > 0 && occ.members[0].memberId !== 0)).toBe(true);
  });

  it("simuliert den Workflow auch ohne Normalisierung (Fallback in handleMemberChange)", () => {
    // Auch ohne Normalisierung sollte handleMemberChangeNEW funktionieren
    const fromDB = [
      { occurrenceNumber: 1, members: [] },
      { occurrenceNumber: 2, members: [] },
    ];

    const afterSelect = handleMemberChangeNEW(fromDB, 1, 1, 42);
    expect(afterSelect[0].members.length).toBe(1);
    expect(afterSelect[0].members[0]).toEqual({ position: 1, memberId: 42 });
  });
});
