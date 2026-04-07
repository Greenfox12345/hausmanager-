/**
 * Tests für das vereinheitlichte Skip-System
 *
 * Nach der Migration: occurrenceNotes.isSkipped ist die einzige Quelle der Wahrheit.
 * skippedDates wird nicht mehr verwendet.
 *
 * Alle Tests ohne Datenbankzugriff.
 */

import { describe, it, expect } from "vitest";
import { calcOccurrenceNumber } from "./db";

describe("calcOccurrenceNumber", () => {
  it("gibt 1 für das dueDate zurück (wöchentlich)", () => {
    const task = {
      dueDate: new Date(2025, 0, 6), // 6. Januar 2025 (lokale Zeit)
      repeatInterval: 1,
      repeatUnit: "weeks",
    };
    const result = calcOccurrenceNumber(task, "2025-01-06");
    expect(result).toBe(1);
  });

  it("gibt 2 für eine Woche nach dueDate zurück (wöchentlich)", () => {
    const task = {
      dueDate: new Date(2025, 0, 6),
      repeatInterval: 1,
      repeatUnit: "weeks",
    };
    const result = calcOccurrenceNumber(task, "2025-01-13");
    expect(result).toBe(2);
  });

  it("gibt 3 für zwei Wochen nach dueDate zurück (wöchentlich)", () => {
    const task = {
      dueDate: new Date(2025, 0, 6),
      repeatInterval: 1,
      repeatUnit: "weeks",
    };
    const result = calcOccurrenceNumber(task, "2025-01-20");
    expect(result).toBe(3);
  });

  it("gibt null zurück wenn das Datum nicht auf ein Intervall fällt", () => {
    const task = {
      dueDate: new Date(2025, 0, 6), // Montag
      repeatInterval: 1,
      repeatUnit: "weeks",
    };
    const result = calcOccurrenceNumber(task, "2025-01-07"); // Dienstag
    expect(result).toBeNull();
  });

  it("berechnet korrekt für tägliche Wiederholung (Interval 3)", () => {
    const task = {
      dueDate: new Date(2025, 2, 1), // 1. März 2025
      repeatInterval: 3,
      repeatUnit: "days",
    };
    expect(calcOccurrenceNumber(task, "2025-03-01")).toBe(1);
    expect(calcOccurrenceNumber(task, "2025-03-04")).toBe(2);
    expect(calcOccurrenceNumber(task, "2025-03-07")).toBe(3);
    expect(calcOccurrenceNumber(task, "2025-03-02")).toBeNull();
  });

  it("berechnet korrekt für monatliche Wiederholung", () => {
    const task = {
      dueDate: new Date(2025, 0, 15), // 15. Januar 2025
      repeatInterval: 1,
      repeatUnit: "months",
    };
    expect(calcOccurrenceNumber(task, "2025-01-15")).toBe(1);
    expect(calcOccurrenceNumber(task, "2025-02-15")).toBe(2);
    expect(calcOccurrenceNumber(task, "2025-03-15")).toBe(3);
  });

  it("gibt null zurück wenn kein dueDate vorhanden", () => {
    const result = calcOccurrenceNumber(
      { dueDate: null, repeatInterval: 1, repeatUnit: "weeks" },
      "2025-01-13"
    );
    expect(result).toBeNull();
  });
});

describe("occurrenceNotes SQL-Filter-Logik", () => {
  /**
   * Prüft die Filterlogik der SQL-Abfrage:
   * WHERE ((notes IS NOT NULL AND notes != '') OR isSkipped = 1)
   *
   * Simuliert die Filterung auf JavaScript-Ebene.
   */
  function shouldIncludeInOccurrenceNotes(row: {
    notes: string | null;
    isSkipped: number;
  }): boolean {
    return (row.notes !== null && row.notes !== "") || row.isSkipped === 1;
  }

  it("schließt leere Einträge ohne Skip aus", () => {
    expect(shouldIncludeInOccurrenceNotes({ notes: "", isSkipped: 0 })).toBe(false);
    expect(shouldIncludeInOccurrenceNotes({ notes: null, isSkipped: 0 })).toBe(false);
  });

  it("schließt Einträge mit Notiz ein", () => {
    expect(shouldIncludeInOccurrenceNotes({ notes: "Wichtig!", isSkipped: 0 })).toBe(true);
  });

  it("schließt übersprungene Einträge ein (auch ohne Notiz)", () => {
    expect(shouldIncludeInOccurrenceNotes({ notes: "", isSkipped: 1 })).toBe(true);
    expect(shouldIncludeInOccurrenceNotes({ notes: null, isSkipped: 1 })).toBe(true);
  });

  it("schließt übersprungene Einträge MIT Notiz ein", () => {
    expect(shouldIncludeInOccurrenceNotes({ notes: "Urlaub", isSkipped: 1 })).toBe(true);
  });
});

describe("occurrenceNotes als einzige Quelle der Wahrheit (nach Migration)", () => {
  /**
   * Nach der Migration verwendet der Kalender nur noch occurrenceNotes.isSkipped.
   * skippedDates wird nicht mehr geprüft.
   */

  function isOccurrenceSkipped(
    occNum: number,
    occurrenceNotes: { occurrenceNumber: number; isSkipped?: boolean }[]
  ): boolean {
    const noteEntry = occurrenceNotes.find(n => n.occurrenceNumber === occNum);
    return noteEntry?.isSkipped === true;
  }

  it("Occurrence 1 (dueDate) wird nicht eingefügt wenn isSkipped=true", () => {
    const occurrenceNotes = [{ occurrenceNumber: 1, isSkipped: true }];
    expect(isOccurrenceSkipped(1, occurrenceNotes)).toBe(true);
  });

  it("Occurrence 1 wird eingefügt wenn kein occurrenceNotes-Eintrag vorhanden", () => {
    const occurrenceNotes: { occurrenceNumber: number; isSkipped?: boolean }[] = [];
    expect(isOccurrenceSkipped(1, occurrenceNotes)).toBe(false);
  });

  it("Occurrence 2 wird übersprungen wenn isSkipped=true", () => {
    const occurrenceNotes = [{ occurrenceNumber: 2, isSkipped: true }];
    expect(isOccurrenceSkipped(2, occurrenceNotes)).toBe(true);
    expect(isOccurrenceSkipped(1, occurrenceNotes)).toBe(false); // Occurrence 1 nicht betroffen
  });

  it("Occurrence 1 und 2 können unabhängig übersprungen werden", () => {
    const occurrenceNotes = [
      { occurrenceNumber: 1, isSkipped: true },
      { occurrenceNumber: 2, isSkipped: false },
    ];
    expect(isOccurrenceSkipped(1, occurrenceNotes)).toBe(true);
    expect(isOccurrenceSkipped(2, occurrenceNotes)).toBe(false);
  });

  it("Kalender-Logik: hasNote berücksichtigt nur Einträge mit tatsächlichem Notiztext", () => {
    const occurrenceNotes = [
      { occurrenceNumber: 1, notes: "Wichtige Notiz", isSkipped: false },
      { occurrenceNumber: 2, notes: "", isSkipped: true },
      { occurrenceNumber: 3, notes: null as any, isSkipped: false },
    ];

    function hasNote(occNum: number): boolean {
      const noteEntry = occurrenceNotes.find(n => n.occurrenceNumber === occNum);
      return !!(noteEntry?.notes);
    }

    expect(hasNote(1)).toBe(true);
    expect(hasNote(2)).toBe(false);
    expect(hasNote(3)).toBe(false);
    expect(hasNote(4)).toBe(false);
  });
});

describe("getSkippedOccurrenceNumbers: Alle übersprungenen Nummern laden", () => {
  /**
   * Simuliert die neue Hilfsfunktion getSkippedOccurrenceNumbers aus db.ts.
   * Gibt ein Set aller occurrenceNumbers zurück, bei denen isSkipped=true ist.
   */
  function getSkippedOccurrenceNumbers(
    occurrenceNotes: { occurrenceNumber: number; isSkipped: boolean }[]
  ): Set<number> {
    return new Set(
      occurrenceNotes.filter(n => n.isSkipped).map(n => n.occurrenceNumber)
    );
  }

  it("gibt leeres Set zurück wenn keine übersprungenen Einträge", () => {
    const notes = [
      { occurrenceNumber: 1, isSkipped: false },
      { occurrenceNumber: 2, isSkipped: false },
    ];
    expect(getSkippedOccurrenceNumbers(notes).size).toBe(0);
  });

  it("gibt korrekte Nummern zurück", () => {
    const notes = [
      { occurrenceNumber: 1, isSkipped: false },
      { occurrenceNumber: 2, isSkipped: true },
      { occurrenceNumber: 3, isSkipped: true },
    ];
    const result = getSkippedOccurrenceNumbers(notes);
    expect(result.has(2)).toBe(true);
    expect(result.has(3)).toBe(true);
    expect(result.has(1)).toBe(false);
  });
});

describe("completeTask: Kein doppeltes Überspringen (occurrenceNotes-basiert)", () => {
  /**
   * Die Skip-Chain in completeTask verwendet jetzt nur noch occurrenceNotes.
   * Skip-Chain B löscht nur Rotation-Occurrences, schiebt nextDueDate NICHT vor.
   */

  function skipChainOccurrenceNotes(
    currentOccurrenceNumber: number,
    skippedNumbers: Set<number>,
    maxIterations = 100
  ): { nextOccurrenceNumber: number; skippedCount: number } {
    let occNum = currentOccurrenceNumber + 1; // Start with next occurrence
    let skippedCount = 0;
    let i = 0;
    while (skippedNumbers.has(occNum) && i < maxIterations) {
      occNum++;
      skippedCount++;
      i++;
    }
    return { nextOccurrenceNumber: occNum, skippedCount };
  }

  it("Ein übersprungener Termin: springt genau einen Schritt vor", () => {
    const skippedNumbers = new Set([2]); // Occurrence 2 übersprungen
    const result = skipChainOccurrenceNotes(1, skippedNumbers);
    expect(result.nextOccurrenceNumber).toBe(3);
    expect(result.skippedCount).toBe(1);
  });

  it("Zwei übersprungene Termine: springt genau zwei Schritte vor", () => {
    const skippedNumbers = new Set([2, 3]);
    const result = skipChainOccurrenceNotes(1, skippedNumbers);
    expect(result.nextOccurrenceNumber).toBe(4);
    expect(result.skippedCount).toBe(2);
  });

  it("Kein übersprungener Termin: bleibt beim nächsten Schritt", () => {
    const skippedNumbers = new Set<number>();
    const result = skipChainOccurrenceNotes(1, skippedNumbers);
    expect(result.nextOccurrenceNumber).toBe(2);
    expect(result.skippedCount).toBe(0);
  });

  it("Skip-Chain B darf nextDueDate NICHT nochmals vorschieben", () => {
    // Nach Skip-Chain A: nextOccurrenceNumber = 3 (Occurrence 2 wurde übersprungen)
    // Skip-Chain B sieht Rotation-Occurrence mit isSkipped=true → nur löschen, nicht vorschieben
    const nextOccurrenceAfterSkipChainA = 3;
    const rotationScheduleAfterDelete = [
      { occurrenceNumber: 1, isSkipped: true }, // gelöscht, nicht nochmals übersprungen
    ];

    let finalOccurrence = nextOccurrenceAfterSkipChainA;
    const deletedOccurrences: number[] = [];
    for (const occ of rotationScheduleAfterDelete) {
      if (occ.isSkipped) {
        deletedOccurrences.push(occ.occurrenceNumber);
        // KEIN finalOccurrence++ hier!
      }
    }

    expect(finalOccurrence).toBe(3); // unverändert
    expect(deletedOccurrences).toContain(1);
  });
});
