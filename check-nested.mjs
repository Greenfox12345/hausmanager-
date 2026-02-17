import { db } from './server/db.ts';
import { sql } from 'drizzle-orm';

const rows = await db.execute(sql`SELECT id, name, CAST(assignedTo AS CHAR) as val FROM tasks WHERE assignedTo IS NOT NULL LIMIT 10`);
console.log(JSON.stringify(rows[0], null, 2));
process.exit(0);
