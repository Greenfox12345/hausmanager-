import { db } from './server/db.js';
import { getTasks } from './server/db.js';

async function test() {
  try {
    console.log('Testing getTasks with householdId 510002...');
    const tasks = await getTasks(510002);
    console.log('Success! Found', tasks.length, 'tasks');
    console.log(JSON.stringify(tasks, null, 2));
  } catch (error) {
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
  }
  process.exit(0);
}

test();
