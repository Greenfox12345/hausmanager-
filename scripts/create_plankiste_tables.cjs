/**
 * Erstellt die 4 Plankiste-Tabellen direkt in der Datenbank.
 * Wird einmalig ausgeführt, wenn db:push die Tabellen nicht anlegt.
 */
const mysql = require('../node_modules/mysql2/promise');

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) { console.error('DATABASE_URL fehlt'); process.exit(1); }
  const m = url.match(/mysql:\/\/([^:]+):([^@]+)@([^:/]+):(\d+)\/([^?]+)/);
  if (!m) { console.error('Ungültige DATABASE_URL'); process.exit(1); }
  const [, user, pass, host, port, db] = m;

  const conn = await mysql.createConnection({
    host, port: +port, user, password: pass, database: db,
    ssl: { rejectUnauthorized: false },
    connectTimeout: 10000,
  });

  console.log('Verbunden mit DB:', db);

  const sqls = [
    `CREATE TABLE IF NOT EXISTS \`plan_templates\` (
      \`id\` int NOT NULL AUTO_INCREMENT,
      \`householdId\` int NOT NULL,
      \`createdByMemberId\` int,
      \`name\` varchar(255) NOT NULL,
      \`description\` text,
      \`type\` enum('shopping','tasks','project','mixed') NOT NULL DEFAULT 'shopping',
      \`tags\` json,
      \`usageCount\` int NOT NULL DEFAULT 0,
      \`lastUsedAt\` datetime,
      \`isArchived\` tinyint(1) NOT NULL DEFAULT 0,
      \`createdAt\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`updatedAt\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

    `CREATE TABLE IF NOT EXISTS \`plan_template_shopping_items\` (
      \`id\` int NOT NULL AUTO_INCREMENT,
      \`templateId\` int NOT NULL,
      \`name\` varchar(255) NOT NULL,
      \`categoryId\` int,
      \`quantity\` decimal(10,3),
      \`unitId\` int,
      \`notes\` text,
      \`sortOrder\` int NOT NULL DEFAULT 0,
      \`createdAt\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`),
      CONSTRAINT \`ptsi_templateId_fk\` FOREIGN KEY (\`templateId\`) REFERENCES \`plan_templates\` (\`id\`) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

    `CREATE TABLE IF NOT EXISTS \`plan_template_instances\` (
      \`id\` int NOT NULL AUTO_INCREMENT,
      \`templateId\` int NOT NULL,
      \`householdId\` int NOT NULL,
      \`startedByMemberId\` int,
      \`label\` varchar(255),
      \`status\` enum('active','completed','cancelled') NOT NULL DEFAULT 'active',
      \`startedAt\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`completedAt\` datetime,
      PRIMARY KEY (\`id\`),
      CONSTRAINT \`pti_templateId_fk\` FOREIGN KEY (\`templateId\`) REFERENCES \`plan_templates\` (\`id\`) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

    `CREATE TABLE IF NOT EXISTS \`plan_instance_shopping_items\` (
      \`id\` int NOT NULL AUTO_INCREMENT,
      \`instanceId\` int NOT NULL,
      \`templateItemId\` int,
      \`name\` varchar(255) NOT NULL,
      \`categoryId\` int,
      \`quantity\` decimal(10,3),
      \`unitId\` int,
      \`notes\` text,
      \`sortOrder\` int NOT NULL DEFAULT 0,
      \`isTransferred\` tinyint(1) NOT NULL DEFAULT 0,
      \`shoppingItemId\` int,
      \`createdAt\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`),
      CONSTRAINT \`pisi_instanceId_fk\` FOREIGN KEY (\`instanceId\`) REFERENCES \`plan_template_instances\` (\`id\`) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  ];

  for (const sql of sqls) {
    const tableName = sql.match(/CREATE TABLE IF NOT EXISTS `([^`]+)`/)?.[1];
    try {
      await conn.query(sql);
      console.log(`✓ Tabelle erstellt: ${tableName}`);
    } catch (e) {
      console.error(`✗ Fehler bei ${tableName}:`, e.message);
    }
  }

  await conn.end();
  console.log('Fertig!');
}

main().catch(e => { console.error(e); process.exit(1); });
