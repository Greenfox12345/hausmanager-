import { beforeAll } from 'vitest';

function isSafeTestDatabaseUrl(value: string): boolean {
  try {
    const databaseName = new URL(value).pathname.replace(/^\//, "").toLowerCase();
    return databaseName.includes("test") || databaseName.includes("_ci");
  } catch {
    return false;
  }
}

/**
 * CRITICAL: Prevent tests from accessing production database
 * 
 * This setup file ensures that tests NEVER connect to the production database.
 * Any test that tries to use the database will fail immediately.
 */

beforeAll(() => {
  // Override DATABASE_URL to prevent accidental production database access
  if (process.env.NODE_ENV !== 'test') {
    throw new Error(
      'Tests must run with NODE_ENV=test to prevent production database access!'
    );
  }

  const testDatabaseUrl = process.env.TEST_DATABASE_URL;

  if (testDatabaseUrl) {
    if (!isSafeTestDatabaseUrl(testDatabaseUrl)) {
      throw new Error(
        "TEST_DATABASE_URL muss auf eine eindeutig benannte Test- oder CI-Datenbank zeigen."
      );
    }
    process.env.DATABASE_URL = testDatabaseUrl;
    console.warn("ℹ️  Datenbanktests verwenden die explizit konfigurierte Testdatenbank.");
    return;
  }

  // Ohne explizite Testdatenbank bleibt der produktive Datenbankzugriff blockiert.
  process.env.DATABASE_URL = 'mysql://test:test@localhost:3306/test_db_does_not_exist';
  console.warn('⚠️  Datenbanktests sind ohne TEST_DATABASE_URL deaktiviert, um Produktivdaten zu schützen.');
  console.warn('⚠️  Datenbankfreie Unit-Tests können weiterhin sicher ausgeführt werden.');
});
