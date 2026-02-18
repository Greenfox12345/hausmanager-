# Database Backup System

This directory contains automatic database backups for the Haushaltsmanager application.

## Automatic Backups

- **Schedule**: Every day at 2:00 AM
- **Retention**: Last 30 backups are kept
- **Format**: JSON files containing all database tables

## Manual Backup

To create a backup manually:

```bash
cd /home/ubuntu/haushaltsmanager
node scripts/backup-database.mjs
```

## Restore from Backup

### List available backups

```bash
node scripts/restore-database.mjs
```

### Restore latest backup

```bash
node scripts/restore-database.mjs latest
```

### Restore specific backup

```bash
node scripts/restore-database.mjs backup-2026-02-18T13-49-22-897Z.json
```

## ⚠️ Important Notes

- **Restoring a backup will DELETE all current data** in the database
- Always create a fresh backup before restoring an old one
- Backups are stored as JSON files and can be inspected with any text editor
- The backup system works with any database (MySQL, TiDB, PostgreSQL, etc.)

## Backup Contents

Each backup includes:
- users
- households
- household_members
- tasks
- projects
- shopping_items
- shopping_categories
- activity_history
- notifications
- notification_preferences

## Troubleshooting

If a backup or restore fails:

1. Check that DATABASE_URL is set correctly
2. Verify database connection is working
3. Check file permissions in the backups directory
4. Review error messages in the console output
