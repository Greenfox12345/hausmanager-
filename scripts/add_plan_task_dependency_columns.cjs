/**
 * Fügt prerequisiteItemIds und followupItemIds als JSON-Spalten zu
 * plan_template_task_items und plan_instance_task_items hinzu.
 */
const mysql = require("mysql2/promise");

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  console.log("Verbunden mit DB");

  const queries = [
    // plan_template_task_items
    `ALTER TABLE plan_template_task_items
       ADD COLUMN IF NOT EXISTS prerequisiteItemIds JSON NULL,
       ADD COLUMN IF NOT EXISTS followupItemIds JSON NULL`,
    // plan_instance_task_items
    `ALTER TABLE plan_instance_task_items
       ADD COLUMN IF NOT EXISTS prerequisiteItemIds JSON NULL,
       ADD COLUMN IF NOT EXISTS followupItemIds JSON NULL`,
  ];

  for (const q of queries) {
    try {
      await conn.execute(q);
      console.log("OK:", q.substring(0, 60));
    } catch (e) {
      if (e.code === "ER_DUP_FIELDNAME") {
        console.log("Spalte existiert bereits, überspringe.");
      } else {
        throw e;
      }
    }
  }

  await conn.end();
  console.log("Fertig.");
}

main().catch((e) => { console.error(e); process.exit(1); });
