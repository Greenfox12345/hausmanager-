/**
 * One-time migration: Fix tasks where dueDate points to a skipped occurrence.
 * For each task with enableRotation=true and occurrenceNumber=1 isSkipped=true,
 * advance dueDate to the next non-skipped occurrence.
 */
import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config({ path: ".env" });

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

function advanceByInterval(date, repeatInterval, repeatUnit) {
  const next = new Date(date);
  if (repeatUnit === "days") next.setDate(next.getDate() + repeatInterval);
  else if (repeatUnit === "weeks") next.setDate(next.getDate() + repeatInterval * 7);
  else if (repeatUnit === "months") next.setMonth(next.getMonth() + repeatInterval);
  return next;
}

function calcOccurrenceNumber(dueDate, date, repeatInterval, repeatUnit) {
  const due = new Date(dueDate);
  const target = new Date(date);
  const dueDateStr = due.toISOString().slice(0, 10);
  const targetStr = target.toISOString().slice(0, 10);
  if (dueDateStr === targetStr) return 1;
  let current = new Date(due);
  let occNum = 1;
  for (let i = 0; i < 500; i++) {
    current = advanceByInterval(current, repeatInterval, repeatUnit);
    occNum++;
    if (current.toISOString().slice(0, 10) === targetStr) return occNum;
    if (current > target) return null;
  }
  return null;
}

const conn = await mysql.createConnection(DATABASE_URL);

// Find all tasks with repeatInterval and occurrenceNotes where occurrenceNumber=1 is skipped
const [tasks] = await conn.execute(`
  SELECT t.id, t.dueDate, t.repeatInterval, t.repeatUnit
  FROM tasks t
  JOIN task_rotation_occurrence_notes ron ON t.id = ron.taskId
  WHERE ron.occurrenceNumber = 1 AND ron.isSkipped = 1
    AND t.dueDate IS NOT NULL AND t.repeatInterval IS NOT NULL
`);

console.log(`Found ${tasks.length} tasks to fix`);

for (const task of tasks) {
  const { id, dueDate, repeatInterval, repeatUnit } = task;
  
  // Get all skipped occurrenceNumbers for this task
  const [skippedRows] = await conn.execute(
    `SELECT occurrenceNumber FROM task_rotation_occurrence_notes WHERE taskId = ? AND isSkipped = 1`,
    [id]
  );
  const skippedNums = new Set(skippedRows.map(r => r.occurrenceNumber));
  
  // Advance dueDate past all skipped occurrences
  let nextDate = new Date(dueDate);
  let maxIter = 500;
  while (maxIter-- > 0) {
    nextDate = advanceByInterval(nextDate, repeatInterval, repeatUnit);
    const occNum = calcOccurrenceNumber(dueDate, nextDate, repeatInterval, repeatUnit);
    if (occNum === null || !skippedNums.has(occNum)) break;
  }
  
  const nextDateStr = `${nextDate.getFullYear()}-${String(nextDate.getMonth()+1).padStart(2,'0')}-${String(nextDate.getDate()).padStart(2,'0')} ${String(nextDate.getHours()).padStart(2,'0')}:${String(nextDate.getMinutes()).padStart(2,'0')}:00`;
  
  console.log(`Task ${id}: dueDate ${new Date(dueDate).toISOString().slice(0,10)} → ${nextDateStr}`);
  
  await conn.execute(
    `UPDATE tasks SET dueDate = ? WHERE id = ?`,
    [nextDateStr, id]
  );
}

console.log("Migration complete");
await conn.end();
