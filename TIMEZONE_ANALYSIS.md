# Timezone-Analyse: Alle Aufgabenzeit-Transformationen

## Das fundamentale Problem

Es gibt **drei verschiedene Interpretationen** von Datetime-Werten im System:

1. **MySQL DATETIME**: Timezone-unabhängig — speichert `"2026-04-07 14:00:00"` als reinen String
2. **Drizzle ORM**: Behandelt DATETIME als UTC (`mapToDriverValue: toISOString()`, `mapFromDriverValue: new Date(value+'Z')`)
3. **JavaScript Date**: Hängt vom Kontext ab — `new Date("2026-04-07 14:00:00")` = lokal, `new Date("2026-04-07T14:00:00Z")` = UTC

## Aktueller Zustand (wall-clock strategy)

### Schreiben (Backend → DB)
- `createTask`/`updateTask`: Baut `dueDatetimeString = "YYYY-MM-DD HH:MM:SS"` und schreibt via `sql.raw()`
- Umgeht Drizzle's `toISOString()` → **kein UTC-Shift** ✓
- `dateToWallClockString(d)`: Verwendet `getHours()` (lokal) → schreibt lokale Server-Zeit

### Lesen (DB → Backend)
- `getTasks()`/`getTaskById()`: `db.execute()` → String → `normalizeDatetimeFromRawSQL()` → `new Date(str.replace(' ','T'))` OHNE 'Z' → **lokale Server-Zeit**
- `getHours()` gibt die gespeicherte Zeit zurück ✓ (solange Server-TZ sich nicht ändert!)

### Datum-Arithmetik (Backend)
- `advanceByInterval`: `getHours()`, `getDate()`, `new Date(y, mo, day+n, h, min)` → lokal ✓
- `calcOccurrenceNumber`: `getDate()`, `getMonth()`, `getFullYear()` → lokal ✓
- `checkNextOccurrence`: `getFullYear()`, `getMonth()`, `getDate()`, `getHours()` → lokal ✓

### Frontend-Anzeige
- `format(new Date(task.dueDate), "HH:mm")`: `date-fns` verwendet Browser-lokale Zeit
- `task.dueDate` kommt als String via tRPC → `new Date(string)` im Browser → **Browser-TZ**

### Frontend-Bearbeitung
- `date.getHours()`, `date.getMinutes()` → Browser-lokale Zeit

## Das verbleibende Problem

**Server-TZ ≠ Browser-TZ ≠ MySQL-TZ**

Wenn DB `"14:00:00"` speichert:
- Server (UTC-4): `new Date("2026-04-07T14:00:00")` → `getHours()=14` ✓
- Browser (UTC+2): `new Date("2026-04-07T14:00:00")` → `getHours()=14` ✓ (ABER: `format()` zeigt 14:00, nicht 16:00)

WAIT — `new Date("2026-04-07T14:00:00")` (ohne Z) wird als **lokale Zeit** interpretiert!
- Server (UTC-4): intern = UTC 18:00, `getHours()=14` ✓
- Browser (UTC+2): intern = UTC 12:00, `getHours()=14` ✓

Das funktioniert! Beide sehen `14:00` weil beide es als lokale Zeit interpretieren.

## Aber was passiert bei tRPC-Transport?

tRPC mit Superjson serialisiert Date-Objekte als ISO-Strings:
- Server: `new Date("2026-04-07T14:00:00")` = UTC 18:00 → Superjson: `"2026-04-07T18:00:00.000Z"`
- Browser: `new Date("2026-04-07T18:00:00.000Z")` = UTC 18:00 → `getHours()` in UTC+2 = **20:00** ✗

**DAS IST DER BUG!** Superjson konvertiert zu UTC beim Transport!

## Lösung: Strings statt Date-Objekte transportieren

Die einzig sichere Lösung: `dueDate` als **String** (`"2026-04-07 14:00:00"`) über tRPC transportieren, nicht als Date-Objekt. Dann gibt es keine Timezone-Konversion.
