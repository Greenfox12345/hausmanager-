/**
 * Legt plan_template_task_items und plan_instance_task_items direkt per SQL an.
 */
const mysql = require("mysql2/promise");
require("dotenv").config();

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);

  await conn.execute(`
    CREATE TABLE IF NOT EXISTS plan_template_task_items (
      id INT AUTO_INCREMENT PRIMARY KEY,
      templateId INT NOT NULL,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      assignedToMemberIds JSON,
      dueDaysFromStart INT,
      frequency ENUM('once','daily','weekly','monthly','custom') NOT NULL DEFAULT 'once',
      customFrequencyDays INT,
      repeatInterval INT,
      repeatUnit ENUM('days','weeks','months','irregular'),
      durationDays INT DEFAULT 0,
      durationMinutes INT DEFAULT 0,
      enableRotation TINYINT(1) NOT NULL DEFAULT 0,
      requiredPersons INT,
      sortOrder INT NOT NULL DEFAULT 0,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (templateId) REFERENCES plan_templates(id) ON DELETE CASCADE
    )
  `);
  console.log("plan_template_task_items: OK");

  await conn.execute(`
    CREATE TABLE IF NOT EXISTS plan_instance_task_items (
      id INT AUTO_INCREMENT PRIMARY KEY,
      instanceId INT NOT NULL,
      templateItemId INT,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      assignedToMemberIds JSON,
      dueDaysFromStart INT,
      frequency ENUM('once','daily','weekly','monthly','custom') NOT NULL DEFAULT 'once',
      customFrequencyDays INT,
      repeatInterval INT,
      repeatUnit ENUM('days','weeks','months','irregular'),
      durationDays INT DEFAULT 0,
      durationMinutes INT DEFAULT 0,
      enableRotation TINYINT(1) NOT NULL DEFAULT 0,
      requiredPersons INT,
      sortOrder INT NOT NULL DEFAULT 0,
      isTransferred TINYINT(1) NOT NULL DEFAULT 0,
      taskId INT,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (instanceId) REFERENCES plan_template_instances(id) ON DELETE CASCADE,
      FOREIGN KEY (templateItemId) REFERENCES plan_template_task_items(id) ON DELETE SET NULL,
      FOREIGN KEY (taskId) REFERENCES tasks(id) ON DELETE SET NULL
    )
  `);
  console.log("plan_instance_task_items: OK");

  await conn.end();
  console.log("Fertig!");
}

main().catch(e => { console.error(e); process.exit(1); });
