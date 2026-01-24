import mysql from "mysql2/promise";

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

const connection = await mysql.createConnection(DATABASE_URL);

console.log("Starting category colors migration...");

try {
  // Step 1: Add color column to shopping_categories
  console.log("Adding color column to shopping_categories...");
  try {
    await connection.query(`
      ALTER TABLE shopping_categories 
      ADD COLUMN color VARCHAR(7) DEFAULT '#6B7280' NOT NULL
    `);
    console.log("✓ color column added");
  } catch (err) {
    if (err.code === 'ER_DUP_FIELDNAME') {
      console.log("✓ color column already exists");
    } else {
      throw err;
    }
  }

  // Step 2: Set default colors for existing categories based on name
  console.log("\nSetting default colors for existing categories...");
  const colorMap = {
    "Lebensmittel": "#DC2626", // red-600
    "Haushalt": "#2563EB", // blue-600
    "Pflege": "#7C3AED", // violet-600
    "Sonstiges": "#6B7280", // gray-500
  };

  for (const [name, color] of Object.entries(colorMap)) {
    const [result] = await connection.query(
      `UPDATE shopping_categories SET color = ? WHERE name = ?`,
      [color, name]
    );
    console.log(`  Updated "${name}" to ${color} (${result.affectedRows} rows)`);
  }

  console.log("\n✓ Migration completed successfully!");
} catch (error) {
  console.error("Migration failed:", error);
  process.exit(1);
} finally {
  await connection.end();
}
