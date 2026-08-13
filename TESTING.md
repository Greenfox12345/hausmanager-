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
