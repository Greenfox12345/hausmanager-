import { createConnection } from "mysql2/promise";
import * as dotenv from "dotenv";
import { readFileSync } from "fs";

// .env laden
try {
  const env = readFileSync("/home/ubuntu/.user_env", "utf-8");
  env.split("\n").forEach(line => {
    const m = line.match(/^export\s+(\w+)="?([^"]*)"?/);
    if (m) process.env[m[1]] = m[2];
  });
} catch {}

const url = process.env.DATABASE_URL;
if (!url) { console.log("Keine DATABASE_URL"); process.exit(1); }

const conn = await createConnection(url);

// Alle Vorlagen
const [templates] = await conn.query(
  "SELECT id, name, type, createdAt FROM plan_templates WHERE isArchived=0 ORDER BY createdAt DESC LIMIT 10"
);
console.log("=== Vorlagen ===");
console.table(templates);

// Aufgaben der neuesten Vorlage
if (templates.length > 0) {
  const latest = templates[0];
  const [tasks] = await conn.query(
    "SELECT id, name, frequency, dueDaysFromStart, prerequisiteItemIds, followupItemIds FROM plan_template_task_items WHERE templateId=? ORDER BY sortOrder",
    [latest.id]
  );
  console.log(`\n=== Aufgaben von "${latest.name}" (ID ${latest.id}) ===`);
  console.table(tasks);
}

await conn.end();
