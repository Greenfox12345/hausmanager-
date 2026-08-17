import { defineConfig } from "vitest/config";
import path from "path";

const templateRoot = path.resolve(import.meta.dirname);

/**
 * Integrationstests greifen ausschließlich über TEST_DATABASE_URL auf eine getrennte Testdatenbank zu.
 */
export default defineConfig({
  root: templateRoot,
  resolve: {
    alias: {
      "@": path.resolve(templateRoot, "client", "src"),
      "@shared": path.resolve(templateRoot, "shared"),
      "@assets": path.resolve(templateRoot, "attached_assets"),
    },
  },
  test: {
    environment: "node",
    include: ["server/**/*.integration.test.ts"],
    setupFiles: ["./vitest.setup.ts"],
    env: {
      NODE_ENV: "test",
    },
  },
});
