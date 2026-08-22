import { appendFileSync, chmodSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import mysql from "mysql2/promise";

const outputPath = process.env.EXPORT_PATH;
const databaseUrl = process.env.DATABASE_URL;

if (!outputPath) throw new Error("EXPORT_PATH muss auf eine SQL-Zieldatei zeigen.");
if (!databaseUrl) throw new Error("DATABASE_URL ist nicht verfügbar.");

const absoluteOutputPath = resolve(outputPath);
mkdirSync(dirname(absoluteOutputPath), { recursive: true, mode: 0o700 });
rmSync(absoluteOutputPath, { force: true });

const identifier = (value) => `\`${String(value).replaceAll("`", "``")}\``;
const sqlValue = (value) => {
  if (value === null || value === undefined) return "NULL";
  if (Buffer.isBuffer(value)) return `X'${value.toString("hex")}'`;
  if (typeof value === "bigint") return value.toString();
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "NULL";
  if (typeof value === "boolean") return value ? "1" : "0";
  if (typeof value === "object" && !(value instanceof Date)) return mysql.escape(JSON.stringify(value));
  return mysql.escape(value);
};

const append = (content) => appendFileSync(absoluteOutputPath, content, { mode: 0o600 });
const connection = await mysql.createConnection(databaseUrl);

try {
  const [databaseRows] = await connection.query("SELECT DATABASE() AS databaseName");
  const databaseName = databaseRows[0]?.databaseName;
  if (!databaseName) throw new Error("Der aktive Datenbankname konnte nicht ermittelt werden.");

  const createdAt = new Date().toISOString();
  writeFileSync(absoluteOutputPath, [
    `-- Vollständiger Haushaltsmanager-Datenexport`,
    `-- Erstellt: ${createdAt}`,
    `-- Datenbank: ${databaseName}`,
    `-- Hinweis: Diese Datei enthält persönliche Daten und Zugangsdaten-Hashwerte.`,
    "SET NAMES utf8mb4;",
    "SET FOREIGN_KEY_CHECKS=0;",
    `CREATE DATABASE IF NOT EXISTS ${identifier(databaseName)};`,
    `USE ${identifier(databaseName)};`,
    "",
  ].join("\n"), { mode: 0o600 });
  chmodSync(absoluteOutputPath, 0o600);

  const [tableRows] = await connection.query("SHOW FULL TABLES WHERE Table_type = 'BASE TABLE'");
  const tableNames = tableRows.map((row) => Object.entries(row).find(([key]) => key !== "Table_type")?.[1]).filter(Boolean);

  for (const tableName of tableNames) {
    const [createRows] = await connection.query(`SHOW CREATE TABLE ${identifier(tableName)}`);
    const createStatement = createRows[0]?.["Create Table"];
    if (!createStatement) throw new Error(`Die Tabellenstruktur für ${tableName} konnte nicht gelesen werden.`);

    append(`\n-- Tabelle ${tableName}\nDROP TABLE IF EXISTS ${identifier(tableName)};\n${createStatement};\n`);

    const [rows, fields] = await connection.query(`SELECT * FROM ${identifier(tableName)}`);
    if (!rows.length) continue;

    const columnNames = fields.map((field) => identifier(field.name)).join(", ");
    const batchSize = 250;
    for (let offset = 0; offset < rows.length; offset += batchSize) {
      const batch = rows.slice(offset, offset + batchSize);
      const values = batch.map((row) => `(${fields.map((field) => sqlValue(row[field.name])).join(", ")})`).join(",\n");
      append(`INSERT INTO ${identifier(tableName)} (${columnNames}) VALUES\n${values};\n`);
    }
  }

  append("\nSET FOREIGN_KEY_CHECKS=1;\n");
  process.stdout.write(`Vollständiger SQL-Export mit ${tableNames.length} Tabellen erstellt.\n`);
} finally {
  await connection.end();
}

process.exit(0);
