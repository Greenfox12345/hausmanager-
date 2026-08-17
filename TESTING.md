# Teststrategie

## Grundsatz

Automatisierte Tests dürfen **niemals** auf die Produktivdatenbank zugreifen. Daher überschreibt `vitest.setup.ts` die Umgebungsvariable `DATABASE_URL` standardmäßig mit einer absichtlich nicht erreichbaren Adresse.

## Datenbankfreie Unit-Tests

Neue Logik sollte, soweit möglich, in datenbankfreien Unit-Tests abgesichert werden. Beispielsweise kann die Logik für Wiederholungen direkt getestet werden, ohne Haushalts- oder Aufgabendaten in einer Datenbank anzulegen.

```bash
pnpm exec vitest run server/taskCompletion.logic.test.ts --pool=threads --poolOptions.threads.singleThread
```

## Datenbank-Integrationstests

Bestehende Integrationstests benötigen eine **separate** Datenbank. Die URL wird ausschließlich über `TEST_DATABASE_URL` übergeben. Die Sicherheitsprüfung akzeptiert nur Datenbanknamen, die `test` oder `_ci` enthalten.

```bash
TEST_DATABASE_URL='mysql://…/haushaltsmanager_test' pnpm test:integration
```

> Die Anwendung setzt bei Integrationstests `DATABASE_URL` ausschließlich auf `TEST_DATABASE_URL`. Eine nicht als Test- oder CI-Datenbank erkennbare URL wird abgelehnt.

## Nächster Schritt

Für vollständig grüne Integrationstests muss eine isolierte Testdatenbank bereitgestellt und mit dem aktuellen Schema migriert werden. Bis dahin sind die betroffenen Alttests bewusst nicht als Nachweis für einen Fehler in der Produktivfunktion zu werten.

## QA-Audit vom 17. August 2026

Der reguläre vollständige Testlauf wurde ohne `TEST_DATABASE_URL` ausgeführt. Dabei bestanden **354 Tests**, **71 Tests wurden übersprungen** und **48 Tests in 24 Testdateien** schlugen fehl. Die Fehlschläge betreffen ausschließlich Tests, die eine Datenbankverbindung benötigen; die erkennbare Ursache ist die beabsichtigte nicht erreichbare Sicherheits-URL (`ECONNREFUSED`).

> Das Ergebnis ist kein Hinweis auf 48 bestätigte Funktionsfehler. Es bestätigt, dass die Schutzvorkehrung gegen versehentlichen Zugriff auf Produktivdaten greift. Erst ein Lauf gegen eine isolierte Testdatenbank kann diese Integrationstests fachlich bewerten.

Zusätzlich bestanden am selben Tag die Übersetzungsprüfung mit **22 Tests** sowie die TypeScript-Prüfung ohne Fehler.

| Testart | Sicherer Befehl | Zweck |
|---|---|---|
| Datenfreie Unit-Tests | `pnpm test` | Prüft Logik ohne Zugriff auf Haushaltsdaten. Datenbankabhängige Alttests scheitern dabei absichtlich sicher. |
| Einzelner Logiktest | `pnpm exec vitest run server/<testdatei>.test.ts --pool=threads --poolOptions.threads.singleThread` | Schneller Test einer gekapselten Logikänderung. |
| Übersetzungsprüfung | `pnpm exec vitest run server/lint-i18n.test.ts` | Prüft Schlüsselparität, fehlende Schlüssel, nicht registrierte Bereiche und harte Anzeige-Texte. |
| Integrationstests | `TEST_DATABASE_URL='mysql://…/haushaltsmanager_test' pnpm test:integration` | Prüft Datenbankabläufe ausschließlich gegen eine getrennte Testdatenbank. |

### Empfohlene nächste QA-Schritte

1. Eine leere, getrennte Datenbank bereitstellen, deren Name eindeutig `test` oder `_ci` enthält, beispielsweise `haushaltsmanager_test`.
2. Ausschließlich für den Testlauf `TEST_DATABASE_URL` setzen und das aktuelle Schema in dieser Datenbank einrichten. Die URL darf weder in Quellcode noch in Versionsverwaltung gespeichert werden.
3. `pnpm test:integration` ausführen und erst danach die dann verbleibenden fachlichen Fehler einzeln bewerten.
4. Ergänzend die Kernabläufe manuell prüfen: Haushaltswechsel, Aufgaben mit Wiederholung und Rotation, Aufgabenabhängigkeiten, Plankiste-Übertragungen sowie Rechte und Änderungsvorschläge.
