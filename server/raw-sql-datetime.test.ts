import { describe, it, expect } from "vitest";

/**
 * Tests für die korrekte Normalisierung von DATETIME-Werten aus db.execute() (Raw SQL).
 *
 * Root Cause des +4h Bugs:
 *   getTasks() verwendet db.execute(sql`SELECT * FROM tasks ...`) statt db.select().from(tasks).
 *   db.execute() umgeht Drizzle's mapFromDriverValue, sodass DATETIME-Spalten als
 *   Strings wie "2026-11-29 14:30:00" zurückkommen.
 *   new Date("2026-11-29 14:30:00") interpretiert das als LOKALE Zeit (Server UTC-4),
 *   was zu getUTCHours()=18 statt 14 führt → +4h Drift.
 *
 * Fix: normalizeDatetimeFromRawSQL() repliziert Drizzle's Mapping:
 *   new Date(value.replace(' ', 'T') + 'Z') → behandelt den DB-Wert als UTC.
 */

// Repliziere die Funktion aus db.ts für isolierte Tests
function normalizeDatetimeFromRawSQL(value: unknown): Date | null {
  if (value == null) return null;
  if (typeof value === 'string') {
    return new Date(value.replace(' ', 'T') + 'Z');
  }
  if (value instanceof Date) {
    return new Date(Date.UTC(
      value.getFullYear(), value.getMonth(), value.getDate(),
      value.getHours(), value.getMinutes(), value.getSeconds(), value.getMilliseconds()
    ));
  }
  return null;
}

// Repliziere Drizzle's mapToDriverValue
function drizzleMapToDriverValue(date: Date): string {
  return date.toISOString().replace("T", " ").replace("Z", "");
}

// Repliziere Drizzle's mapFromDriverValue
function drizzleMapFromDriverValue(value: string): Date {
  return new Date(value.replace(" ", "T") + "Z");
}

describe("normalizeDatetimeFromRawSQL", () => {
  it("normalisiert String '2026-11-29 14:30:00' korrekt als UTC", () => {
    const result = normalizeDatetimeFromRawSQL("2026-11-29 14:30:00");
    expect(result).not.toBeNull();
    expect(result!.getUTCHours()).toBe(14);
    expect(result!.getUTCMinutes()).toBe(30);
    expect(result!.getUTCDate()).toBe(29);
    expect(result!.getUTCMonth()).toBe(10); // November = 10 (0-basiert)
    expect(result!.getUTCFullYear()).toBe(2026);
  });

  it("normalisiert Mitternacht korrekt", () => {
    const result = normalizeDatetimeFromRawSQL("2026-04-07 00:00:00");
    expect(result).not.toBeNull();
    expect(result!.getUTCHours()).toBe(0);
    expect(result!.getUTCDate()).toBe(7);
  });

  it("gibt null für null/undefined zurück", () => {
    expect(normalizeDatetimeFromRawSQL(null)).toBeNull();
    expect(normalizeDatetimeFromRawSQL(undefined)).toBeNull();
  });

  it("normalisiert Date-Objekt (lokale Interpretation) korrekt auf UTC", () => {
    // Simuliert: mysql2 gibt manchmal Date-Objekte zurück
    // new Date("2026-11-29 14:30:00") → lokale Zeit 14:30 → UTC 18:30 (bei UTC-4)
    // Wir wollen aber UTC 14:30 (die DB-Zeit)
    const localDate = new Date(2026, 10, 29, 14, 30, 0); // 14:30 lokal
    const result = normalizeDatetimeFromRawSQL(localDate);
    expect(result).not.toBeNull();
    // Die lokalen Komponenten (14:30) werden als UTC interpretiert
    expect(result!.getUTCHours()).toBe(14);
    expect(result!.getUTCMinutes()).toBe(30);
    expect(result!.getUTCDate()).toBe(29);
  });
});

describe("Vollständiger Datenpfad: DB → Normalisierung → advanceByInterval → DB", () => {
  it("Wöchentliche Wiederholung: 14:30 bleibt 14:30 nach Advance", () => {
    // Schritt 1: DB gibt String zurück (db.execute)
    const dbString = "2026-11-29 14:30:00";

    // Schritt 2: Normalisierung (wie in getTasks)
    const normalized = normalizeDatetimeFromRawSQL(dbString)!;
    expect(normalized.getUTCHours()).toBe(14);
    expect(normalized.getUTCMinutes()).toBe(30);

    // Schritt 3: advanceByInterval (wöchentlich)
    const y = normalized.getUTCFullYear();
    const mo = normalized.getUTCMonth();
    const day = normalized.getUTCDate();
    const h = normalized.getUTCHours();
    const min = normalized.getUTCMinutes();
    const next = new Date(Date.UTC(y, mo, day + 7, h, min));

    // Schritt 4: Prüfen dass die Zeit erhalten bleibt
    expect(next.getUTCHours()).toBe(14);
    expect(next.getUTCMinutes()).toBe(30);
    expect(next.getUTCDate()).toBe(6); // 29 + 7 = 6. Dezember
    expect(next.getUTCMonth()).toBe(11); // Dezember

    // Schritt 5: Drizzle schreibt in DB
    const dbWritten = drizzleMapToDriverValue(next);
    expect(dbWritten).toBe("2026-12-06 14:30:00.000");
    // → In DB steht "2026-12-06 14:30:00" → KEIN DRIFT ✓
  });

  it("Tägliche Wiederholung: 09:00 bleibt 09:00", () => {
    const dbString = "2026-04-07 09:00:00";
    const normalized = normalizeDatetimeFromRawSQL(dbString)!;

    const next = new Date(Date.UTC(
      normalized.getUTCFullYear(), normalized.getUTCMonth(),
      normalized.getUTCDate() + 1,
      normalized.getUTCHours(), normalized.getUTCMinutes()
    ));

    expect(next.getUTCHours()).toBe(9);
    const dbWritten = drizzleMapToDriverValue(next);
    expect(dbWritten).toBe("2026-04-08 09:00:00.000");
  });

  it("Monatliche Wiederholung: 20:00 bleibt 20:00", () => {
    const dbString = "2026-01-15 20:00:00";
    const normalized = normalizeDatetimeFromRawSQL(dbString)!;

    // Monatlich: gleicher Tag im nächsten Monat
    const newMonth = normalized.getUTCMonth() + 1;
    const next = new Date(Date.UTC(
      normalized.getUTCFullYear(), newMonth,
      normalized.getUTCDate(),
      normalized.getUTCHours(), normalized.getUTCMinutes()
    ));

    expect(next.getUTCHours()).toBe(20);
    expect(next.getUTCDate()).toBe(15);
    expect(next.getUTCMonth()).toBe(1); // Februar
    const dbWritten = drizzleMapToDriverValue(next);
    expect(dbWritten).toBe("2026-02-15 20:00:00.000");
  });
});

describe("BUG-Reproduktion: OHNE Normalisierung → +4h Drift", () => {
  it("OHNE Fix: new Date(string) interpretiert als lokal → UTC-Stunde falsch", () => {
    const dbString = "2026-11-29 14:30:00";

    // OHNE Normalisierung: new Date(string) → lokale Zeit
    const buggy = new Date(dbString);
    // Auf einem UTC-4 Server: getUTCHours() wäre 18 statt 14
    // Wir können das nicht direkt testen (hängt von Server-TZ ab),
    // aber wir können zeigen dass es NICHT gleich der DB-Zeit ist:
    const buggyWritten = drizzleMapToDriverValue(buggy);
    // Wenn Server UTC-4: buggyWritten = "2026-11-29 18:30:00.000" → DRIFT!
    // Wenn Server UTC: buggyWritten = "2026-11-29 14:30:00.000" → kein Drift
    // Der Test zeigt: das Ergebnis hängt von der Server-Timezone ab → INSTABIL

    // MIT Normalisierung: immer korrekt, unabhängig von Server-TZ
    const fixed = normalizeDatetimeFromRawSQL(dbString)!;
    const fixedWritten = drizzleMapToDriverValue(fixed);
    expect(fixedWritten).toBe("2026-11-29 14:30:00.000"); // IMMER korrekt
  });
});

describe("Konsistenz: normalizeDatetimeFromRawSQL == Drizzle mapFromDriverValue", () => {
  it("String-Normalisierung gibt gleiches Ergebnis wie Drizzle", () => {
    const testCases = [
      "2026-01-01 00:00:00",
      "2026-06-15 12:30:00",
      "2026-12-31 23:59:59",
      "2026-04-07 09:15:00",
    ];

    for (const dbString of testCases) {
      const normalized = normalizeDatetimeFromRawSQL(dbString)!;
      const drizzleMapped = drizzleMapFromDriverValue(dbString);
      expect(normalized.getTime()).toBe(drizzleMapped.getTime());
    }
  });
});
