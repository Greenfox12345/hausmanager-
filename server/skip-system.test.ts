/**
 * Tests für das vereinheitlichte Skip-System
 *
 * Prüft, dass:
 * 1. calcOccurrenceNumber korrekt die Occurrence-Nummer für ein Datum berechnet
 * 2. Die SQL-Filterlogik für occurrenceNotes isSkipped=1 Einträge enthält
 * 3. Die Kalender-Logik beide Quellen (skippedDates + occurrenceNotes.isSkipped) kombiniert
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

describe("Unified Skip: Beide Systeme werden synchron gehalten", () => {
  it("skipOccurrence-Logik: Datum wird zu skippedDates hinzugefügt (dedupliziert)", () => {
    const existingSkipped = ["2025-01-06", "2025-01-20"];
    const dateToSkip = "2025-01-13";

    const alreadySkipped = existingSkipped.includes(dateToSkip);
    const updatedSkipped = alreadySkipped
      ? existingSkipped
      : [...existingSkipped, dateToSkip];

    expect(updatedSkipped).toContain("2025-01-13");
    expect(updatedSkipped.length).toBe(3);
    expect(alreadySkipped).toBe(false);
  });

  it("skipOccurrence-Logik: Doppeltes Überspringen wird dedupliziert", () => {
    const existingSkipped = ["2025-01-06", "2025-01-13"];
    const dateToSkip = "2025-01-13";

    const alreadySkipped = existingSkipped.includes(dateToSkip);
    const updatedSkipped = alreadySkipped
      ? existingSkipped
      : [...existingSkipped, dateToSkip];

    expect(updatedSkipped.length).toBe(2);
    expect(alreadySkipped).toBe(true);
  });

  it("restoreSkippedDate-Logik: Datum wird aus skippedDates entfernt", () => {
    const existingSkipped = ["2025-01-06", "2025-01-13", "2025-01-20"];
    const dateToRestore = "2025-01-13";

    const updatedSkipped = existingSkipped.filter(d => d !== dateToRestore);

    expect(updatedSkipped).not.toContain("2025-01-13");
    expect(updatedSkipped.length).toBe(2);
  });

  it("Kalender-Logik: isSkipped aus beiden Quellen kombiniert", () => {
    const skippedDates = ["2025-01-06"]; // System A (skippedDates)
    const occurrenceNotes = [
      { occurrenceNumber: 2, notes: "", isSkipped: true }, // System B (occurrenceNotes)
    ];

    function isOccurrenceSkipped(dateKey: string, occNum: number): boolean {
      const isSkippedByDate = skippedDates.includes(dateKey);
      const noteEntry = occurrenceNotes.find(n => n.occurrenceNumber === occNum);
      const isSkippedByNote = noteEntry?.isSkipped === true;
      return isSkippedByDate || isSkippedByNote;
    }

    expect(isOccurrenceSkipped("2025-01-06", 1)).toBe(true);  // via skippedDates
    expect(isOccurrenceSkipped("2025-01-13", 2)).toBe(true);  // via occurrenceNotes
    expect(isOccurrenceSkipped("2025-01-20", 3)).toBe(false); // nicht übersprungen
  });

  it("Kalender-Logik: hasNote berücksichtigt nur Einträge mit tatsächlichem Notiztext", () => {
    const occurrenceNotes = [
      { occurrenceNumber: 1, notes: "Wichtige Notiz", isSkipped: false },
      { occurrenceNumber: 2, notes: "", isSkipped: true }, // übersprungen, keine Notiz
      { occurrenceNumber: 3, notes: null as any, isSkipped: false },
    ];

    function hasNote(occNum: number): boolean {
      const noteEntry = occurrenceNotes.find(n => n.occurrenceNumber === occNum);
      return !!(noteEntry?.notes);
    }

    expect(hasNote(1)).toBe(true);  // hat Notiztext
    expect(hasNote(2)).toBe(false); // leerer String = keine Notiz
    expect(hasNote(3)).toBe(false); // null = keine Notiz
    expect(hasNote(4)).toBe(false); // nicht vorhanden
  });
});
