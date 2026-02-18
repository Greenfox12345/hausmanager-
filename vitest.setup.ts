import { beforeAll } from 'vitest';

/**
 * CRITICAL: Prevent tests from accessing production database
 * 
 * This setup file ensures that tests NEVER connect to the production database.
 * Any test that tries to use the database will fail immediately.
 */

beforeAll(() => {
  // Override DATABASE_URL to prevent accidental production database access
  if (process.env.NODE_ENV !== 'test') {
    throw new Error(
      'Tests must run with NODE_ENV=test to prevent production database access!'
    );
  }

  // Set a dummy database URL that will fail if tests try to connect
  process.env.DATABASE_URL = 'mysql://test:test@localhost:3306/test_db_does_not_exist';
  
  console.warn('⚠️  Database tests are DISABLED to protect production data');
  console.warn('⚠️  Only unit tests without database access should be written');
});
