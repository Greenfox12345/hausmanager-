#!/usr/bin/env node
/**
 * Database Backup Script (Application-Level)
 * 
 * Creates a full backup of all database tables as JSON.
 * Works with any database (MySQL, TiDB, PostgreSQL, etc.)
 * Keeps the last 30 backups and deletes older ones.
 */

import { mkdir, readdir, unlink, writeFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const backupDir = path.join(projectRoot, 'backups');

// List of all tables to backup
const TABLES = [
  'users',
  'households',
  'household_members',
  'tasks',
  'projects',
  'project_tasks',
  'shopping_items',
  'shopping_categories',
  'activity_history',
  'notifications',
  'notification_preferences',
  'neighborhood_projects',
  'neighborhood_participants',
];

async function createBackup() {
  let connection;
  
  try {
    // Create backups directory if it doesn't exist
    await mkdir(backupDir, { recursive: true });

    // Generate backup filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(backupDir, `backup-${timestamp}.json`);

    console.log('🔄 Creating database backup...');
    console.log(`   File: ${backupFile}`);

    // Connect to database
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error('DATABASE_URL not found');
    }

    connection = await mysql.createConnection(databaseUrl);
    const db = drizzle(connection);

    const backup = {
      timestamp: new Date().toISOString(),
      version: '1.0',
      tables: {},
    };

    // Backup each table
    for (const table of TABLES) {
      try {
        const [rows] = await connection.execute(`SELECT * FROM ${table}`);
        backup.tables[table] = rows;
        console.log(`   ✓ ${table}: ${rows.length} rows`);
      } catch (error) {
        console.warn(`   ⚠️  ${table}: ${error.message}`);
        backup.tables[table] = [];
      }
    }

    // Write backup file
    await writeFile(backupFile, JSON.stringify(backup, null, 2), 'utf-8');

    console.log('✅ Backup created successfully!');

    // Clean up old backups (keep last 30)
    await cleanupOldBackups();

  } catch (error) {
    console.error('❌ Backup failed:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

async function cleanupOldBackups() {
  try {
    const files = await readdir(backupDir);
    const backupFiles = files
      .filter(f => f.startsWith('backup-') && f.endsWith('.json'))
      .map(f => ({
        name: f,
        path: path.join(backupDir, f),
      }))
      .sort((a, b) => b.name.localeCompare(a.name)); // Sort newest first

    // Keep only the last 30 backups
    const filesToDelete = backupFiles.slice(30);

    if (filesToDelete.length > 0) {
      console.log(`🗑️  Deleting ${filesToDelete.length} old backup(s)...`);
      for (const file of filesToDelete) {
        await unlink(file.path);
      }
    }

    console.log(`📦 Total backups: ${backupFiles.length - filesToDelete.length}`);
  } catch (error) {
    console.warn('⚠️  Failed to cleanup old backups:', error.message);
  }
}

// Run backup
createBackup();
