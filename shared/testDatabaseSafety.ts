/**
 * Verhindert, dass Integrationstests versehentlich gegen eine Produktivdatenbank laufen.
 * Akzeptiert werden ausschließlich Datenbanken, deren Name eindeutig auf Test oder CI hinweist.
 */
export function isSafeTestDatabaseUrl(value: string | undefined): boolean {
  if (!value) return false;

  try {
    const databaseName = new URL(value).pathname.replace(/^\//, "").toLowerCase();
    return databaseName.includes("test") || databaseName.includes("_ci");
  } catch {
    return false;
  }
}
