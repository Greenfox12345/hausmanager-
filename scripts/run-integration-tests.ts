import { spawnSync } from "node:child_process";

const testDatabaseUrl = process.env.TEST_DATABASE_URL;

if (!testDatabaseUrl) {
  console.error("Integrationstests benötigen TEST_DATABASE_URL. Es wird keine Standard- oder Produktivdatenbank verwendet.");
  process.exit(1);
}

let databaseName = "";
try {
  databaseName = new URL(testDatabaseUrl).pathname.replace(/^\//, "").toLowerCase();
} catch {
  console.error("TEST_DATABASE_URL ist keine gültige Datenbank-URL.");
  process.exit(1);
}

if (!databaseName.includes("test") && !databaseName.includes("_ci")) {
  console.error("Die Datenbank in TEST_DATABASE_URL muss eindeutig als Test- oder CI-Datenbank benannt sein.");
  process.exit(1);
}

const command = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const result = spawnSync(command, ["exec", "vitest", "run"], {
  stdio: "inherit",
  env: {
    ...process.env,
    DATABASE_URL: testDatabaseUrl,
    NODE_ENV: "test",
  },
});

process.exit(result.status ?? 1);
