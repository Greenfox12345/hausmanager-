# Teststrategie

## Grundsatz

Automatisierte Tests dürfen **niemals** auf die Produktivdatenbank zugreifen. Daher überschreibt `vitest.setup.ts` die Umgebungsvariable `DATABASE_URL` standardmäßig mit einer absichtlich nicht erreichbaren Adresse.

## Datenbankfreie Unit-Tests

Neue Logik sollte, soweit möglich, in datenbankfreien Unit-Tests abgesichert werden. Beispielsweise kann die Logik für Wiederholungen direkt getestet werden, ohne Haushalts- oder Aufgabendaten in einer Datenbank anzulegen.

```bash
pnpm test
# gleichbedeutend und ausdrücklich benannt:
pnpm test:unit

# gezielter Einzeltest:
pnpm exec vitest run server/taskCompletion.logic.test.ts --pool=threads --poolOptions.threads.singleThread
```

Der Standardlauf führt ausschließlich datenbankfreie Tests aus. Datenbankabhängige Testdateien tragen bewusst das Suffix `.integration.test.ts` und werden nicht stillschweigend gelöscht oder ignoriert: Sie sind ausschließlich Teil von `pnpm test:integration`.

## Datenbank-Integrationstests

Bestehende Integrationstests benötigen eine **separate** Datenbank. Die URL wird ausschließlich über `TEST_DATABASE_URL` übergeben. Die Sicherheitsprüfung akzeptiert nur Datenbanknamen, die `test` oder `_ci` enthalten.

```bash
TEST_DATABASE_URL='mysql://…/haushaltsmanager_test' pnpm test:integration
```

> Die Anwendung setzt bei Integrationstests `DATABASE_URL` ausschließlich auf `TEST_DATABASE_URL`. Eine nicht als Test- oder CI-Datenbank erkennbare URL wird abgelehnt.

## Nächster Schritt

Für vollständig grüne Integrationstests muss eine isolierte Testdatenbank bereitgestellt und mit dem aktuellen Schema migriert werden. Bis dahin sind die betroffenen Alttests bewusst nicht als Nachweis für einen Fehler in der Produktivfunktion zu werten.

## QA-Audit vom 17. August 2026

Der ursprüngliche vollständige Testlauf ohne `TEST_DATABASE_URL` ergab **354 bestandene Tests**, **71 übersprungene Tests** und **48 Fehlschläge in 24 Testdateien**. Die Fehlschläge betrafen ausschließlich Tests, die eine Datenbankverbindung benötigen; die erkennbare Ursache war die beabsichtigte nicht erreichbare Sicherheits-URL (`ECONNREFUSED`).

Die 24 betroffenen Dateien sind inzwischen eindeutig als Integrationstests gekennzeichnet. Der Standardlauf `pnpm test` besteht daher ohne Datenbankzugriff mit **39 Testdateien und 359 Tests**. Die Integrationstests bleiben vollständig erhalten und können ausschließlich über `pnpm test:integration` mit einer isolierten Testdatenbank ausgeführt werden.

Die Integrationskonfiguration wurde zusätzlich ohne Datenbankverbindung gesammelt: Alle **24 Testdateien mit 125 Tests** lassen sich laden und werden bei einem absichtlich nicht passenden Testnamen erwartungsgemäß übersprungen. Das bestätigt, dass keine Modul- oder Importfehler die eigentlichen Datenbanktests mehr blockieren.

Das Audit hat drei veraltete Tests gezielt modernisiert. Die Tests für gemeinsame Haushalte, Aufgabenerstellung und Aufgabenrotation verwenden jetzt die aktuelle Router-Schnittstelle, erzeugen isolierte Daten in einer Testdatenbank und bereinigen diese nach dem Lauf. Der Test für die Anzeige verantwortlicher Personen erzeugt nun ebenfalls verbindlich eigene Daten, statt in einer leeren Testdatenbank ohne Assertion erfolgreich zu sein. Die vollständige fachliche Ausführung dieser Tests bleibt der nächste Schritt, sobald eine isolierte Testdatenbank verfügbar ist.

> Das ursprüngliche Ergebnis ist kein Hinweis auf 48 bestätigte Funktionsfehler. Es bestätigt, dass die Schutzvorkehrung gegen versehentlichen Zugriff auf Produktivdaten greift. Erst ein Lauf gegen eine isolierte Testdatenbank kann diese Integrationstests fachlich bewerten.

Zusätzlich bestanden am selben Tag die Übersetzungsprüfung mit **22 Tests** sowie die TypeScript-Prüfung ohne Fehler.

| Testart | Sicherer Befehl | Zweck |
|---|---|---|
| Datenfreie Unit-Tests | `pnpm test` oder `pnpm test:unit` | Prüft Logik ohne Zugriff auf Haushaltsdaten. Die klar gekennzeichneten Integrationstests werden hierbei nicht ausgeführt. |
| Einzelner Logiktest | `pnpm exec vitest run server/<testdatei>.test.ts --pool=threads --poolOptions.threads.singleThread` | Schneller Test einer gekapselten Logikänderung. |
| Übersetzungsprüfung | `pnpm exec vitest run server/lint-i18n.test.ts` | Prüft Schlüsselparität, fehlende Schlüssel, nicht registrierte Bereiche und harte Anzeige-Texte. |
| Integrationstests | `TEST_DATABASE_URL='mysql://…/haushaltsmanager_test' pnpm test:integration` | Prüft Datenbankabläufe ausschließlich gegen eine getrennte Testdatenbank. |

### Empfohlene nächste QA-Schritte

1. Eine leere, getrennte Datenbank bereitstellen, deren Name eindeutig `test` oder `_ci` enthält, beispielsweise `haushaltsmanager_test`.
2. Ausschließlich für den Testlauf `TEST_DATABASE_URL` setzen und das aktuelle Schema in dieser Datenbank einrichten. Die URL darf weder in Quellcode noch in Versionsverwaltung gespeichert werden.
3. `pnpm test:integration` ausführen und erst danach die dann verbleibenden fachlichen Fehler einzeln bewerten.
4. Ergänzend die Kernabläufe manuell prüfen: Haushaltswechsel, Aufgaben mit Wiederholung und Rotation, Aufgabenabhängigkeiten, Plankiste-Übertragungen sowie Rechte und Änderungsvorschläge.

## Manueller Kernablauf-Testplan

Dieser Plan ergänzt die automatisierten Tests. Er wird in einem separaten **QA-Haushalt** durchgeführt, damit Testaufgaben, Kommentare und Verlaufseinträge nicht mit echten Haushaltsdaten vermischt werden. Für jeden Durchlauf sollten Testergebnis, Datum, verwendetes Gerät und beobachtete Abweichungen festgehalten werden.

| Nr. | Kernablauf | Prüfschritte | Erwartetes Ergebnis |
|---:|---|---|---|
| 1 | Anmeldung und Haushalt | Anmelden, Profil öffnen, zwischen zwei Haushalten wechseln und wieder zurückwechseln. | Die Sitzung bleibt bestehen; der aktive Haushalt, seine Mitglieder und die Navigation wechseln vollständig. Beim Öffnen erscheint gegebenenfalls nur der Aktivitätsüberblick des gewählten Haushalts. |
| 2 | Haushaltsmitglieder | Zweites Mitglied einladen oder anlegen; Namen und Profilbild prüfen. | Das Mitglied erscheint sofort in Auswahlfeldern, Verantwortlichkeiten und Verlaufseinträgen mit dem richtigen Namen. |
| 3 | Einmalige Aufgabe | Aufgabe mit Name, Beschreibung, Kategorie, verantwortlicher Person und Termin anlegen, bearbeiten und abschließen. | Alle Werte bleiben nach Aktualisierung erhalten. Abschließen erzeugt einen lesbaren Verlaufseintrag und die Aufgabe wechselt in den erledigten Zustand. |
| 4 | Wiederholung und Terminlogik | Wöchentliche und monatliche Aufgabe anlegen. Bei der Monatsregel „gleicher Wochentag“ Monat, Vorkommen und Wochentag wählen; anschließend einen Termin überspringen und wiederherstellen. | Der nächste Termin wird korrekt berechnet. Überspringen und Wiederherstellen wirken auf genau den gewählten Termin. Im Verlauf stehen lesbare Werte wie „Monatlich“, „Am gleichen Wochentag“ und „Donnerstag“, niemals technische Codes. |
| 5 | Rotation | Wiederkehrende Aufgabe mit mindestens zwei Mitgliedern und Rotation anlegen; Rotationsplan öffnen, Zuordnung ändern und einen Termin abschließen. | Die Zuordnung bleibt datumstabil, ausgeschlossene Mitglieder werden nicht geplant und der nächste Termin übernimmt die erwartete Person. |
| 6 | Abhängigkeiten | Drei Aufgaben A → B → C anlegen; prüfen, ob A als indirekte Voraussetzung von C sichtbar ist. Einen Zyklusversuch ausführen. | Indirekte Voraussetzungen werden nachvollziehbar dargestellt. Selbstbezüge, Duplikate und Zyklen werden abgewiesen. |
| 7 | Aufgabenrechte und Vorschläge | Aufgabe mit verantwortlicher Person anlegen. Mit einem anderen Mitglied eine Änderung vorschlagen, als verantwortliche Person annehmen und einen zweiten Vorschlag zurückziehen. | Nicht verantwortliche Mitglieder ändern nicht direkt. Vorschläge zeigen alte und neue Werte, Annahme übernimmt alles, Rückzug ist bestätigt und jeder Schritt erscheint lesbar im Verlauf. |
| 8 | Verlauf und Übersetzungen | In Aufgaben-Dialog und globalem Verlauf die Aktionen Erstellen, Aktualisieren, Vorschlag, Annahme, Ablehnung und Rückzug öffnen. App-Sprache nacheinander auf Deutsch und Englisch stellen. | Aktions-Badges und Feldwerte sind lokalisiert; keine Codes wie `change_proposed`, `same_weekday`, `weekly` oder `months` erscheinen. Alte und neue Werte bleiben unterscheidbar. |
| 9 | Einkauf und Inventar | Einkaufsartikel anlegen, Menge ändern, abschließen und einen Artikel ins Inventar übernehmen. | Status, Menge, Kategorie und Verlauf werden korrekt übernommen; Fotos oder Anhänge bleiben erreichbar. |
| 10 | Ausleihen | Inventargegenstand zur Ausleihe freigeben, Anfrage stellen, annehmen, Rückgabe dokumentieren und optional widerrufen. | Statuswechsel, Beteiligte und verknüpfte Aufgabe sind verständlich sichtbar; keine Berechtigung wird umgangen. |
| 11 | Plankiste, Variablen und Phasen | Plan mit Eingabe- und Rechenvariable, Einkauf, Aufgaben, Abhängigkeiten und mindestens zwei Phasen erstellen. Variablenwerte ändern und Plan in Haushalt übertragen. | Werte werden außerhalb des Editors korrekt aufgelöst, Einheiten sind plausibel und die Übertragung erzeugt reale Einkaufsartikel und Aufgaben in Phasenreihenfolge. |
| 12 | Plansack und Projektstart | Plan in Plansack speichern, in einen anderen QA-Haushalt importieren und als Projekt starten. Eine spätere Phase danach starten. | Import enthält alle vorgesehenen Daten ohne Verantwortliche. Das Projekt hält Variablen und Phasen bereit; Aufgaben und Einkäufe entstehen erst beim Start der jeweiligen Phase. |
| 13 | Mobile Darstellung | Die Schritte 3, 4, 7 und 11 auf einem schmalen Mobilgerät oder im Mobilmodus prüfen. | Dialoge bleiben scrollbar, Eingaben und Schaltflächen sind erreichbar, und lange Verlaufswerte brechen lesbar um. |
| 14 | Haushaltsbilanz | Je eine Zahlung und Arbeitszeit manuell erfassen; beim Abschließen einer Aufgabe, eines Zwischenziels und eines Einkaufs jeweils einen Aufwand hinzufügen. Als Haushaltsersteller die Auswahl anderer Mitglieder einmal aktivieren. Einen eigenen Eintrag innerhalb und außerhalb von fünf Tagen bearbeiten bzw. löschen. | Geld und Arbeitszeit werden je Mitglied getrennt summiert. Quellen stehen als Aufgabe, Zwischenziel oder Einkauf am Eintrag. Andere Mitglieder sind nur nach Freigabe auswählbar. Eigene Einträge sind bis einschließlich fünf Tage korrigierbar; alle Bilanzaktionen erscheinen im Verlauf ohne technische Codes und in der Haushaltssprache. |

> **Abnahmekriterium:** Ein Kernablauf gilt erst als bestanden, wenn Daten nach einem Neuladen erhalten bleiben, berechtigte und nicht berechtigte Rollen wie vorgesehen reagieren und keine technische Zeichenfolge in einer sichtbaren Oberfläche verbleibt.

## Bilanz – geprüfte Kernregeln (17. August 2026)

Die Bilanz trennt **Geldzahlungen** und **Arbeitszeit** bewusst. Sie verwendet keine Stundenlohn- oder Umrechnungsannahme. Datenfreie Tests prüfen die Fünf-Tage-Frist für Korrekturen einschließlich der Grenzsekunde sowie die getrennte Summierung von Zahlungen und Arbeitsminuten; dabei werden auch aktive Mitglieder ohne eigenen Eintrag in der Übersicht geführt.

| Prüfschritt | Ergebnis |
|---|---|
| Bilanzregeln | Fünf-Tage-Korrekturfrist und centgenaue Geldnormalisierung bestanden |
| Bilanzsummen | Zahlungen und Arbeitszeit getrennt; Mitglieder ohne Eintrag sichtbar |
| Übersetzungen | Neuer Namensraum `balance` in allen sieben Sprachen; Übersetzungsprüfung grün |
| Bilanz-Verlaufstexte | Haushaltssprachige Beschreibungen für Erfassung, Änderung und Löschung getestet |
| Mehrfacherfassung | Mehrere vollständige Aufwände für unterschiedliche Mitglieder bleiben erhalten; unvollständige Zeilen werden einzeln ignoriert |
| Bilanz-Verlauf | Bilanzposten werden dem neuesten zugehörigen Verlaufseintrag zugeordnet und können gezielt geöffnet werden |
| Detaillierte Bilanzverläufe | Zahlung oder Arbeitszeit, Person, Zweck, Quelle und bei Einkäufen die konkreten Artikel werden strukturiert protokolliert |
| Normale Verlaufseinträge | Sammelabschlüsse beim Einkauf, Kalenderereignisse und Projekte speichern strukturierten Kontext und werden als Detailblock dargestellt |
| Mengenanzeige | Ganze Mengen erscheinen ohne Nachkommastellen; präzise Teilmengen und Einheiten bleiben lokal lesbar erhalten |
| Dynamische Projektvariablen | Aufgaben- und Einkaufsanzeigen lösen gespeicherte `VAR…`-Texte aus dem verknüpften Projekt auf; bei Einkaufsartikeln wird alternativ das Projekt der verknüpften Aufgabe verwendet |
| Berechnete Projektvariablen | Direkte und formelbasierte, voneinander abhängige Projektvariablen werden inklusive Einheit in Aufgaben, Einkaufsnamen, Details und Notizen aufgelöst |
| Projektvariablen-Überschreibung | Formeln bleiben im Projekt sichtbar und bearbeitbar; abweichende manuelle Ergebnisse werden mit Warnhinweis gekennzeichnet |
| Dynamische Karten und Projektstart | Aufgabenkarten lösen Namen und Beschreibungen aus dem Projekt auf; Projektstarts übertragen unveränderte Vorlagentexte samt Projektzuordnung |
| Projektvariablenverwaltung | Projektbereich unterstützt wie die Plankiste Eingabewerte mit Einheiten, Bereichen, Schieberegler und Sperre sowie sichtbare und editierbare Formeln mit gekennzeichneten Überschreibungen |
| Projektstart mit Variablenmengen | Variable Einkaufsmen­gen werden für die Datenbank numerisch berechnet; fehlende Werte werden sicher abgewiesen und können keinen `VAR…`-Text ins Zahlenfeld schreiben |
| Rekursive Anzeigenauflösung | Direkte Werte, Formeln aus Variablendefinitionen, Abhängigkeiten, Rundungen und Einheiten werden in Namen, Beschreibungen und Notizen gezielt geprüft |
| Aufklappbare Projektvariablen | Aufgaben- und Einkaufsanzeigen verwenden die bewährte VarText-Anzeige der Plankiste; Formeldefinitionen und Überschreibungen werden dafür in berechenbare Anzeigevariablen überführt |
| Aufgabengebundene Variableneingabe | Projektaufgaben öffnen aus den Details einen Dialog für entsperrte Eingabevariablen; Speicherung aktualisiert anschließend alle Projektvariablenanzeigen |
| Vollständiger Standardlauf | 47 Testdateien und 373 datenbankfreie Tests bestanden |

Die Datenbankabläufe der Bilanz werden nach Bereitstellung von `TEST_DATABASE_URL` in den gesonderten Integrationstestlauf aufgenommen. Die produktive Datenbank wurde ausschließlich um zwei neue Tabellen erweitert; vorhandene Haushalts- und Verlaufsdaten wurden nicht verändert.
