#!/usr/bin/env node
/**
 * Database Restore Script
 * 
 * Restores the database from a JSON backup file.
 * Usage: node scripts/restore-database.mjs <backup-file>
 *        node scripts/restore-database.mjs latest
 */

import { readdir, readFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';
import mysql from 'mysql2/promise';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const backupDir = path.join(projectRoot, 'backups');

async function listBackups() {
  const files = await readdir(backupDir);
  const backupFiles = files
    .filter(f => f.startsWith('backup-') && f.endsWith('.json'))
    .sort()
    .reverse(); // Newest first

  console.log('\n📦 Available backups:');
  backupFiles.forEach((file, index) => {
    console.log(`   ${index + 1}. ${file}`);
  });
  console.log('');

  return backupFiles;
}

async function restoreBackup(backupFile) {
  let connection;
  
  try {
    // Check if backup file exists
    if (!existsSync(backupFile)) {
      console.error(`❌ Backup file not found: ${backupFile}`);
      process.exit(1);
    }

    console.log('⚠️  WARNING: This will REPLACE all current data in the database!');
    console.log(`   Backup: ${path.basename(backupFile)}`);
    console.log('');

    // Read backup file
    const backupData = JSON.parse(await readFile(backupFile, 'utf-8'));
    console.log(`📅 Backup timestamp: ${backupData.timestamp}`);
    console.log(`📌 Backup version: ${backupData.version}`);
    console.log('');

    // Connect to database
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error('DATABASE_URL not found');
    }

    connection = await mysql.createConnection(databaseUrl);

    console.log('🔄 Restoring database...');

    // Disable foreign key checks temporarily
    await connection.execute('SET FOREIGN_KEY_CHECKS = 0');

    // Restore each table
    for (const [tableName, rows] of Object.entries(backupData.tables)) {
      if (!Array.isArray(rows) || rows.length === 0) {
        console.log(`   ⊘ ${tableName}: skipped (no data)`);
        continue;
      }

      try {
        // Clear existing data
        await connection.execute(`DELETE FROM ${tableName}`);

        // Insert backup data
        const columns = Object.keys(rows[0]);
        const placeholders = columns.map(() => '?').join(', ');
        const insertQuery = `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders})`;

        for (const row of rows) {
          const values = columns.map(col => {
            const value = row[col];
            // Convert JSON objects/arrays to strings
            if (typeof value === 'object' && value !== null) {
              return JSON.stringify(value);
            }
            return value;
          });
          await connection.execute(insertQuery, values);
        }

        console.log(`   ✓ ${tableName}: ${rows.length} rows restored`);
      } catch (error) {
        console.error(`   ❌ ${tableName}: ${error.message}`);
      }
    }

    // Re-enable foreign key checks
    await connection.execute('SET FOREIGN_KEY_CHECKS = 1');

    console.log('');
    console.log('✅ Database restored successfully!');

  } catch (error) {
    console.error('❌ Restore failed:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Main
async function main() {
  const backupArg = process.argv[2];

  if (!backupArg) {
    console.log('Usage: node scripts/restore-database.mjs <backup-file>');
    console.log('       node scripts/restore-database.mjs latest');
    await listBackups();
    process.exit(0);
  }

  let backupFile;

  if (backupArg === 'latest') {
    const backups = await listBackups();
    if (backups.length === 0) {
      console.error('❌ No backups found');
      process.exit(1);
    }
    backupFile = path.join(backupDir, backups[0]);
  } else if (backupArg.includes('/')) {
    // Full path provided
    backupFile = backupArg;
  } else {
    // Filename provided
    backupFile = path.join(backupDir, backupArg);
  }

  await restoreBackup(backupFile);
}

main();
