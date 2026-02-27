# Übersicht: Aufgabentermine – Datenfluss und Architektur

## 1. Datenbank-Schema

Die Aufgabentermine werden über drei Tabellen verwaltet, die zusammen das vollständige Bild eines wiederkehrenden Termins abbilden.

### 1.1 `tasks` (Haupttabelle)

Die `tasks`-Tabelle enthält die Grundkonfiguration der Aufgabe, einschließlich der Wiederholungseinstellungen.

| Feld | Typ | Beschreibung |
|---|---|---|
| `dueDate` | `datetime` | Startdatum/Fälligkeitsdatum der Aufgabe |
| `durationDays` | `int` | Dauer in Tagen |
| `durationMinutes` | `int` | Dauer in Minuten (0–1439) |
| `frequency` | `enum` | `once`, `daily`, `weekly`, `monthly`, `custom` |
| `repeatInterval` | `int` | Wiederholungsintervall (z.B. 2 für "alle 2 Wochen") |
| `repeatUnit` | `enum` | `days`, `weeks`, `months`, `irregular` |
| `irregularRecurrence` | `boolean` | Wenn true: Termine als "Termin 1", "Termin 2" statt Datumsberechnung |
| `monthlyRecurrenceMode` | `enum` | `same_date` oder `same_weekday` |
| `monthlyWeekday` | `int` | 0–6 (Sonntag–Samstag) für same_weekday-Modus |
| `monthlyOccurrence` | `int` | 1–5 (1.–5./letzter Wochentag im Monat) |
| `enableRotation` | `boolean` | Ob Verantwortliche rotieren |
| `requiredPersons` | `int` | Anzahl Personen pro Termin |

### 1.2 `task_rotation_schedule` (Verantwortliche pro Termin)

Speichert, welches Haushaltsmitglied welcher Position in welchem Termin zugewiesen ist.

| Feld | Typ | Beschreibung |
|---|---|---|
| `taskId` | `int` | FK → tasks.id |
| `occurrenceNumber` | `int` | Termin-Nummer (1 = nächster, 2 = übernächster, …) |
| `position` | `int` | Position innerhalb des Termins (1 = erste Person, 2 = zweite, …) |
| `memberId` | `int` | FK → household_members.id |

### 1.3 `task_rotation_occurrence_notes` (Notizen und Metadaten pro Termin)

Speichert Notizen, Übersprungstatus, und Sondertermin-Informationen für jeden einzelnen Termin.

| Feld | Typ | Beschreibung |
|---|---|---|
| `taskId` | `int` | FK → tasks.id |
| `occurrenceNumber` | `int` | Termin-Nummer |
| `notes` | `text` | Freitextnotizen für diesen Termin |
| `isSkipped` | `boolean` | Ob der Termin übersprungen wird |
| `isSpecial` | `boolean` | Ob es ein Sondertermin ist |
| `specialName` | `varchar(255)` | Name des Sondertermins |
| `specialDate` | `timestamp` | Manuell gesetztes Datum (für Sonder- und irreguläre Termine) |

### 1.4 `task_occurrence_items` (Inventargegenstände pro Termin)

Verknüpft Inventargegenstände mit spezifischen Terminen.

| Feld | Typ | Beschreibung |
|---|---|---|
| `taskId` | `int` | FK → tasks.id |
| `occurrenceNumber` | `int` | Termin-Nummer |
| `inventoryItemId` | `int` | FK → inventory_items.id |
| `borrowStartDate` | `datetime` | Ausleihbeginn |
| `borrowEndDate` | `datetime` | Ausleihende |
| `borrowStatus` | `enum` | `pending`, `borrowed`, `returned`, `overdue` |

---

## 2. Server-Logik (Speichern und Laden)

### 2.1 Laden: `getRotationSchedule(taskId)`

Diese Funktion in `server/db.ts` lädt den vollständigen Terminplan:

1. Liest alle Einträge aus `task_rotation_schedule` (Verantwortliche).
2. Liest alle Einträge aus `task_rotation_occurrence_notes` (Notizen/Metadaten).
3. Gruppiert beides nach `occurrenceNumber`.
4. Stellt sicher, dass mindestens 3 Termine zurückgegeben werden (füllt mit leeren Einträgen auf).
5. Gibt ein Array von Objekten zurück: `{ occurrenceNumber, members[], notes, isSkipped, isSpecial, specialName, specialDate }`.

### 2.2 Speichern: `setRotationSchedule(taskId, schedule)`

Diese Funktion ersetzt den gesamten Terminplan:

1. Sichert bestehende `isSkipped`-Status.
2. Löscht alle bestehenden Einträge in `task_rotation_schedule` und `task_rotation_occurrence_notes`.
3. Für jeden Termin im neuen Plan:
   - Erstellt Einträge in `task_rotation_schedule` für jeden zugewiesenen Member.
   - Erstellt **immer** einen Eintrag in `task_rotation_occurrence_notes` (auch ohne Notizen), damit der Termin nicht verloren geht.

### 2.3 Weitere Funktionen

| Funktion | Beschreibung |
|---|---|
| `extendRotationSchedule()` | Fügt einen neuen Termin am Ende hinzu (nach Abschluss) |
| `shiftRotationSchedule()` | Verschiebt alle Termine um eins nach vorne (Termin 2 → 1, 3 → 2, …) |
| `deleteRotationOccurrence()` | Löscht einen Termin und nummeriert neu |
| `skipRotationOccurrence()` | Markiert einen Termin als übersprungen (Toggle) |
| `moveRotationOccurrence()` | Verschiebt einen Termin nach oben/unten |

### 2.4 Task-Update-Mutation (`tasks.update`)

Beim Bearbeiten einer Aufgabe wird in `server/routers/tasks.ts`:

1. Die `tasks`-Tabelle mit den neuen Werten aktualisiert (inkl. `repeatInterval`, `repeatUnit`, `frequency`, `dueDate`, etc.).
2. Die Rotation wird **nicht** direkt in dieser Mutation gespeichert – das geschieht separat über `setRotationSchedule`.

---

## 3. Frontend-Logik

### 3.1 Datenfluss beim Bearbeiten (TaskDetailDialog)

Der `handleSave`-Ablauf in `TaskDetailDialog.tsx`:

1. **Schritt 1:** `tasks.update` – Aktualisiert die Aufgabe in der `tasks`-Tabelle.
2. **Schritt 1.5:** `tasks.setRotationSchedule` – Speichert den Terminplan (nur wenn `repeatMode !== "none"` und Termine existieren).
   - Members mit `memberId === 0` (nicht zugewiesen) werden herausgefiltert.
   - Notizen, isSkipped, isSpecial, specialName, specialDate werden mitgesendet.
3. **Schritt 1.5b:** Inventargegenstände pro Termin werden intelligent aktualisiert (nur Änderungen).
4. **Schritt 2:** Abhängigkeiten werden aktualisiert.
5. **Schritt 3:** Alle relevanten Queries werden invalidiert.
6. **Schritt 4:** Frische Daten werden geladen und an das Eltern-Element weitergegeben.

### 3.2 Zwei Tabellen in der Bearbeitungsansicht

In der Bearbeitungsansicht gibt es zwei Tabellen:

**Tabelle 1: "Termine Planen"** (Bearbeitbar, in `TaskDetailDialog.tsx` direkt gerendert)

Diese Tabelle zeigt Termine mit editierbaren Feldern für Datum, Notizen und Aktionen (Überspringen, Löschen). Sie wird direkt aus dem `rotationSchedule`-State gerendert und erlaubt das Hinzufügen neuer Termine.

**Tabelle 2: "Rotationsplan"** (Bearbeitbar, `RotationScheduleTable.tsx`)

Diese Tabelle zeigt die horizontale Rotationsplanung mit Spalten pro Termin und Zeilen pro Position. Sie erlaubt die Zuweisung von Verantwortlichen per Dropdown, Notizen-Eingabe, Sondertermine und Auto-Fill.

### 3.3 Anzeige in der Detailansicht (nicht-bearbeitend)

**"Kommende Termine"** (`UpcomingOccurrencesTable.tsx`)

Zeigt die nächsten Termine mit berechneten Daten, Verantwortlichen und Notizen. Die Daten werden aus dem `rotationSchedule`-State berechnet:
- Reguläre Termine: Datum wird aus `dueDate` + `repeatInterval` + `repeatUnit` berechnet.
- Irreguläre Termine: Verwenden `specialDate`.
- Sondertermine: Verwenden `specialDate` und `specialName`.

### 3.4 State-Management

Der `rotationSchedule`-State (Typ `ScheduleOccurrence[]`) wird aus dem Server geladen und enthält:

```typescript
interface ScheduleOccurrence {
  occurrenceNumber: number;
  members: { position: number; memberId: number }[];
  notes?: string;
  date?: Date;           // Berechnetes Datum für reguläre Termine
  specialDate?: Date;    // Manuell gesetztes Datum
  isSkipped?: boolean;
  isSpecial?: boolean;
  specialName?: string;
  items?: { itemId: number; itemName: string }[];
}
```

---

## 4. Behobener Bug

### Problem

Beim Bearbeiten einer Aufgabe und Hinzufügen von Terminen ohne Notizen oder Verantwortliche wurden die Termine nicht gespeichert. Der Grund war die Bedingung in `setRotationSchedule` (db.ts):

```javascript
// ALT (fehlerhaft):
if (occurrence.notes || isSkipped || occurrence.isSpecial || occurrence.specialDate) {
  // Nur dann wurde ein Eintrag in taskRotationOccurrenceNotes erstellt
}
```

Wenn ein Termin weder Notizen noch isSkipped noch isSpecial noch specialDate hatte, wurde kein Eintrag in `taskRotationOccurrenceNotes` erstellt. Beim nächsten Laden über `getRotationSchedule` fehlte dieser Termin dann, weil er in keiner der beiden Tabellen existierte (Members waren auch leer, da unassigned Members herausgefiltert werden).

### Lösung

Die Bedingung wurde entfernt – jetzt wird **immer** ein Eintrag in `taskRotationOccurrenceNotes` für jeden Termin erstellt:

```javascript
// NEU (korrekt):
await db.insert(taskRotationOccurrenceNotes).values({
  taskId,
  occurrenceNumber: occurrence.occurrenceNumber,
  notes: occurrence.notes || "",
  isSkipped,
  isSpecial: occurrence.isSpecial || false,
  specialName: occurrence.specialName || null,
  specialDate: occurrence.specialDate || null,
});
```

Die gleiche Korrektur wurde auch in `extendRotationSchedule` und `shiftRotationSchedule` durchgeführt, um Konsistenz zu gewährleisten.
