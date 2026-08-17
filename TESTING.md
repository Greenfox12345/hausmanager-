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

Die 24 betroffenen Dateien sind inzwischen eindeutig als Integrationstests gekennzeichnet. Der Standardlauf `pnpm test` besteht daher ohne Datenbankzugriff mit **37 Testdateien und 352 Tests**. Die Integrationstests bleiben vollständig erhalten und können ausschließlich über `pnpm test:integration` mit einer isolierten Testdatenbank ausgeführt werden.

Die Integrationskonfiguration wurde zusätzlich ohne Datenbankverbindung gesammelt: Alle **24 Testdateien mit 126 Tests** lassen sich laden und werden bei einem absichtlich nicht passenden Testnamen erwartungsgemäß übersprungen. Dabei wurde ein veralteter Test für gemeinsame Haushalte repariert, der auf eine nicht vorhandene Hilfsdatei verwies. Er verwendet jetzt die aktuelle Router-Schnittstelle, erzeugt seine Testdaten isoliert und bereinigt sie nach dem Lauf.

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
