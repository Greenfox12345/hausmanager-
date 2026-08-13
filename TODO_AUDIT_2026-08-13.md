# TODO-Audit – 13. August 2026

## Kurzfazit

Die Datei `todo.md` enthält derzeit **443 nicht abgehakte Einträge**. Sie ist jedoch **kein verlässlicher aktueller Backlog**: Viele Punkte sind historische Zwischenstände, doppelt erfasst oder wurden später umgesetzt, ohne dass der frühere Eintrag aktualisiert wurde. Darüber hinaus sind die zuletzt umgesetzten Funktionen **Plansack, Plankiste-zu-Projekte-Integration und Phasen-/Variablenstart** kaum oder gar nicht im aktuellen TODO-System abgebildet.

> **Bewertung:** Die TODO-Datei sollte nicht direkt als Prioritätenliste verwendet werden. Vor einer Umsetzung muss der jeweilige Punkt gegen den aktuellen Code und gegebenenfalls im Browser geprüft werden.

| Kennzahl | Ergebnis |
|---|---:|
| Offene Checkboxen in `todo.md` | 443 |
| Davon explizite Test-/manuelle Prüfaufgaben | 86 |
| Davon als später/deferred/zukünftig bezeichnet | 10 |
| Davon Fehler-, Analyse- oder Fix-Aufgaben | 47 |
| Automatischer Testlauf | 316 bestanden, 51 fehlgeschlagen, 71 übersprungen |

## Beim Audit als erledigt oder überholt erkannt

Die nachfolgend genannten Checkboxen sind noch offen, werden aber durch spätere TODO-Einträge oder aktuellen Code eindeutig abgedeckt. Sie sollten nach einer kurzen Browser-Prüfung als **historische Einträge archiviert oder abgehakt** werden.

| Bereich | Noch offene alte TODO-Zeilen | Nachweis im aktuellen Projekt |
|---|---|---|
| Projektverwaltung | 42–49 | `Projects.tsx` existiert und enthält Projektliste, Bearbeitung, Status, Aufgaben, Abhängigkeiten, Gantt-Ansicht und Plan-Integration. |
| Benachrichtigungssystem (Grundfunktionen) | 209–216 | `notificationsRouter` ist registriert; Notification-Bell, Einstellungen und Datenbankfunktionen wurden später als erledigt dokumentiert. |
| Router-Registrierung | 374–375 | `userAuthRouter`, `householdManagementRouter` und `notificationsRouter` sind in `server/routers.ts` registriert. |
| Haushaltsumschalter | 337, 418–424 | `AppLayout.tsx` lädt Haushalte, zeigt den aktiven Haushalt und nutzt `switchHousehold`. |
| Profilbild | 2777–2789 | Schema-Migration, `userProfile.uploadProfileImage`, `deleteProfileImage` und `UserProfileDialog` sind vorhanden. |
| „Gebraucht bis“ bei Einkaufsartikeln | 3657–3663 | Schema, Backend, Eingabe, Anzeige und Überfällig-Markierung sind in `Shopping.tsx` und `shopping.ts` vorhanden. |
| Aufgaben-Kategorien | 3666–3670 | `task_category_assignments`, Backend-Zuweisungen, Mehrfachauswahl und Filter sind vorhanden. |
| Inventar und Ausleihen (Grundsystem) | 1256–1264, 1527–1532, 1475–1481 | Seiten `Inventory.tsx`, `InventoryDetail.tsx`, `Borrows.tsx`, Router und Abhol-/Rückgabe-Komponenten sind vorhanden. |
| Sondertermine und Kalenderdarstellung | 2364–2480, 2598–2617 | Spätere Einträge dokumentieren die Umsetzung; `RotationScheduleTable` enthält `isSpecial` und `specialName`, der Kalender unterstützt Sondertermine. |
| Demo-Claim- und Onboarding-Bug-Batch | 3423–3427 | Derselbe Bereich wurde unmittelbar danach unter 3429–3434 als abgeschlossen dokumentiert. |
| Termin-Auslassen ohne Fälligkeitsdatum | 3502 | Der Nachfolgeeintrag 3504–3509 dokumentiert die Umsetzung. |

## Tatsächlich relevante offene Arbeitsbereiche

Die folgenden Punkte sind im aktuellen Stand **nicht eindeutig als erledigt nachweisbar** oder benötigen bewusst noch eine fachliche Entscheidung beziehungsweise einen Test im Browser.

### Priorität A – Stabilität, Datenintegrität und Qualitätssicherung

| Thema | Offene Punkte | Empfohlener nächster Schritt |
|---|---|---|
| Datenbankgestützte Tests | Testlauf schlägt aktuell bei 25 Testdateien mit `ECONNREFUSED` fehl. | Test-DB bzw. Test-Mocks sauber konfigurieren; danach die 51 fehlgeschlagenen Tests fachlich auswerten. |
| End-to-End-Tests | Viele offene Einträge sind manuelle Browserprüfungen, etwa Login, Haushaltswechsel, Dialoge, Projektarchivierung und Abhängigkeiten. | Kompakten QA-Testplan mit priorisierten Kernflüssen erstellen und gemeinsam testen. |
| Aufgaben-Abhängigkeiten im Verlauf | Zeile 192 | Prüfen, ob der Verlauf Voraussetzungen/Folgeaufgaben sinnvoll anzeigen soll; danach gezielt umsetzen. |
| Abhängigkeitsdarstellung im alten Aufgabenbereich | 708–732 | Reproduzieren, ob doppelte Spiegelungen oder fehlende Anzeige außerhalb der Plankiste noch vorkommen. Nur bei reproduzierbarem Fehler ändern. |
| Wiederkehrende Aufgaben | 3018–3035, 3138–3141, 3532, 3549–3552 | Wiederkehrende Abschlüsse, Rotationsplan-Synchronisierung und Berechnung ferner Termine gezielt mit Testdaten prüfen. |

### Priorität B – Geplante Erweiterungen

| Bereich | Verbleibende sinnvolle Funktionspakete |
|---|---|
| Benachrichtigungen | Auslöser für Kommentare, Erinnerungen zu Fälligkeiten, Beachtung der „Nicht stören“-Zeit und optional Offline-Push. |
| Berechtigungen | Vorschläge statt direkter Bearbeitung durch nicht verantwortliche Mitglieder, Berechtigungsstufen und serverseitige Durchsetzung. |
| Haushaltsübergreifende Aufgaben | Teilen, Anzeige und Verwaltung gemeinsamer Aufgaben über verbundene Haushalte hinweg. |
| Inventar/Ausleihen | Feinere Ausleih-Integration in Termin-/Projektansichten, Verfügbarkeitswarnungen und die Detail-Overlay-Ansicht im Kalender. |
| Medien und Dokumente | Fotos für Einkaufsartikel, PDF-Anhänge bei Abschlüssen, sprechende Originaldateinamen. |
| Restliche Übersetzungen | Einzelne Komponenten wie `SimpleRequiredItemsSection`, Notification-Bell und die Zeitraum-Texte im Kalender. |

### Priorität C – Themen, die vor Umsetzung eine Entscheidung brauchen

| Thema | Warum eine Entscheidung nötig ist |
|---|---|
| Altes Auth-System bereinigen | Die offenen Einträge zum Löschen alter Auth-Dateien können bestehende Kompatibilitätslogik beeinflussen. Erst nach vollständigem Browser-Test und Sicherheitsprüfung entfernen. |
| Rotation/Unregelmäßigkeit | Mehrere alte, widersprüchliche TODO-Abschnitte beschreiben verschiedene Datenmodelle (`skippedDates` versus Rotationsplan-Tabelle). Vor Erweiterungen muss ein einziges Zielmodell festgelegt werden. |
| Service Worker und tägliche Erinnerungen | Das sind Hintergrundaufgaben. Sie benötigen vor Umsetzung eine getrennte Architekturentscheidung für zeitgesteuerte Ausführung. |
| Multi-Projekt-Aufgaben | Als „deferred“ gekennzeichnet; fachlich klären, ob eine Aufgabe wirklich mehreren Projekten gleichzeitig angehören soll. |

## Nicht im TODO ausreichend abgebildet

Die folgenden jüngeren Produktbereiche sind umgesetzt, aber in `todo.md` nicht vollständig als laufender beziehungsweise abgeschlossener Arbeitsstrang dokumentiert:

- **Plansack:** Speichern, Teilen, Importieren und vollständige Snapshot-Bearbeitung.
- **Plansack im Profil:** Tab neben Haushalten mit Editor und Variablen-Verwaltung.
- **Plankiste → Projekte:** Plan-Vorlagen als Projekte anlegen, Phasen auswählen, Variablen eingeben, Phasen nachträglich starten und Aufgaben/Einkäufe übertragen.
- **Variablen im Projektstart:** Phasenbezogene Eingaben, Zurücksetzen und Auflösung von `VAR`-Tokens beim Start einer Phase.
- **Topologische Sortierung:** Als Sortieroption bei Aufgaben sowie automatisch in Projektaufgaben.

## Empfohlene Bereinigung von `todo.md`

1. **Historische/duplizierte Einträge archivieren:** Die unter „erledigt oder überholt“ genannten Blöcke nicht löschen, sondern in einen Abschnitt „Historisch erledigt“ verschieben oder abhaken.
2. **Manuelle Prüfungen bündeln:** Die 86 Testeinträge in einen einzigen QA-Backlog mit Kernflüssen, Testdatum und Ergebnis überführen.
3. **Offene Features zu Arbeitspaketen bündeln:** Statt einzelner Mikro-Checkboxen z. B. „Benachrichtigungen: Erinnerungen“ oder „Ausleihen: Termin-Integration“ als klare Pakete führen.
4. **Aktuelle Plankiste-/Plansack-/Projektarbeit ergänzen:** Die jüngsten Funktionen und verbleibenden Fragen zum Phasenstart als eigene, aktuelle Sektion führen.
5. **Bei jeder Umsetzung unmittelbar pflegen:** Abgeschlossene Checkboxen markieren und neu entdeckte Fehler unter einem Datumsabschnitt erfassen.

## Testlauf am 13. August 2026

Der Befehl `pnpm test --run` wurde ausgeführt. Das Ergebnis lautet:

| Ergebnis | Anzahl |
|---|---:|
| Bestanden | 316 |
| Fehlgeschlagen | 51 |
| Übersprungen | 71 |
| Fehlgeschlagene Testdateien | 25 |

Die sichtbare Hauptursache der Fehlschläge ist `ECONNREFUSED` beim Zugriff auf MySQL/TiDB in datenbankabhängigen Tests. Das weist zunächst auf eine **fehlende bzw. nicht erreichbare Test-Datenbank** hin, nicht automatisch auf 51 unabhängige Fachfehler. Eine belastbare Bewertung erfordert eine lauffähige Testdatenbank oder konsequente DB-Mocks.
