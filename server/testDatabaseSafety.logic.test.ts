import { describe, expect, it } from "vitest";
import { isSafeTestDatabaseUrl } from "../shared/testDatabaseSafety";

describe("isSafeTestDatabaseUrl", () => {
  it("akzeptiert eindeutig benannte Test- und CI-Datenbanken", () => {
    expect(isSafeTestDatabaseUrl("mysql://user:password@localhost:3306/haushaltsmanager_test")).toBe(true);
    expect(isSafeTestDatabaseUrl("mysql://user:password@localhost:3306/haushaltsmanager_ci")).toBe(true);
  });

  it("lehnt fehlende, ungültige und nicht als Test erkennbare URLs ab", () => {
    expect(isSafeTestDatabaseUrl(undefined)).toBe(false);
    expect(isSafeTestDatabaseUrl("keine-datenbank-url")).toBe(false);
    expect(isSafeTestDatabaseUrl("mysql://user:password@localhost:3306/haushaltsmanager")).toBe(false);
  });
});
