import { createConnection } from "mysql2/promise";
import { readFileSync } from "fs";

const env = readFileSync("/home/ubuntu/.user_env", "utf-8");
env.split("\n").forEach(l => {
  const m = l.match(/^export\s+(\w+)="?([^"]*)"?/);
  if (m) process.env[m[1]] = m[2];
});

const conn = await createConnection(process.env.DATABASE_URL);

try {
  await conn.query(`ALTER TABLE plan_templates 
    ADD COLUMN enableVariables TINYINT(1) NOT NULL DEFAULT 0,
    ADD COLUMN variables JSON NULL`);
  console.log("✅ Spalten enableVariables und variables hinzugefügt");
} catch (e) {
  if (e.code === "ER_DUP_FIELDNAME") {
    console.log("ℹ️  Spalten existieren bereits");
  } else {
    throw e;
  }
}

await conn.end();
