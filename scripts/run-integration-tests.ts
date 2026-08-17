import { spawnSync } from "node:child_process";
import { isSafeTestDatabaseUrl } from "../shared/testDatabaseSafety";

const testDatabaseUrl = process.env.TEST_DATABASE_URL;

if (!testDatabaseUrl) {
  console.error("Integrationstests benötigen TEST_DATABASE_URL. Es wird keine Standard- oder Produktivdatenbank verwendet.");
  process.exit(1);
}

if (!isSafeTestDatabaseUrl(testDatabaseUrl)) {
  console.error("Die Datenbank in TEST_DATABASE_URL muss eindeutig als Test- oder CI-Datenbank benannt sein.");
  process.exit(1);
}

const command = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const result = spawnSync(command, ["exec", "vitest", "run", "--config", "vitest.integration.config.ts"], {
  stdio: "inherit",
  env: {
    ...process.env,
    DATABASE_URL: testDatabaseUrl,
    NODE_ENV: "test",
  },
});

process.exit(result.status ?? 1);
