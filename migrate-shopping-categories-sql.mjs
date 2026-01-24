import mysql from "mysql2/promise";

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

const connection = await mysql.createConnection(DATABASE_URL);

console.log("Starting shopping categories migration...");

try {
  // Step 0: Create shopping_categories table if it doesn't exist
  console.log("Creating shopping_categories table...");
  await connection.query(`
    CREATE TABLE IF NOT EXISTS shopping_categories (
      id INT AUTO_INCREMENT PRIMARY KEY,
      householdId INT NOT NULL,
      name VARCHAR(100) NOT NULL,
      createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (householdId) REFERENCES households(id) ON DELETE CASCADE
    )
  `);
  console.log("✓ shopping_categories table ready");
  
  // Step 0.5: Add categoryId column to shopping_items if it doesn't exist
  console.log("Adding categoryId column to shopping_items...");
  try {
    await connection.query(`
      ALTER TABLE shopping_items 
      ADD COLUMN categoryId INT NULL
    `);
    console.log("✓ categoryId column added");
  } catch (err) {
    if (err.code === 'ER_DUP_FIELDNAME') {
      console.log("✓ categoryId column already exists");
    } else {
      throw err;
    }
  }

  // Step 1: Get all households
  const [households] = await connection.query(`SELECT id, name FROM households`);
  console.log(`Found ${households.length} households`);

  for (const household of households) {
    console.log(`\nProcessing household: ${household.name} (ID: ${household.id})`);

    // Step 2: Create default categories for this household
    const defaultCategories = ["Lebensmittel", "Haushalt", "Pflege", "Sonstiges"];
    const categoryMap = {}; // old name -> new ID

    for (const categoryName of defaultCategories) {
      const [result] = await connection.query(
        `INSERT INTO shopping_categories (householdId, name, createdAt, updatedAt) VALUES (?, ?, NOW(), NOW())`,
        [household.id, categoryName]
      );
      
      categoryMap[categoryName] = result.insertId;
      console.log(`  Created category: ${categoryName} (ID: ${result.insertId})`);
    }

    // Step 3: Get all shopping items for this household that still have the old category column
    const [items] = await connection.query(
      `SELECT id, category FROM shopping_items WHERE householdId = ? AND category IS NOT NULL`,
      [household.id]
    );

    console.log(`  Found ${items.length} items to migrate`);

    // Step 4: Update each item with the new categoryId
    for (const item of items) {
      const newCategoryId = categoryMap[item.category];
      if (newCategoryId) {
        await connection.query(
          `UPDATE shopping_items SET categoryId = ? WHERE id = ?`,
          [newCategoryId, item.id]
        );
        console.log(`    Updated item ${item.id}: ${item.category} -> categoryId ${newCategoryId}`);
      }
    }
  }

  // Step 5: Drop the old category column
  console.log("\nDropping old category column...");
  await connection.query(`ALTER TABLE shopping_items DROP COLUMN category`);
  console.log("✓ Old category column dropped");

  console.log("\n✓ Migration completed successfully!");
} catch (error) {
  console.error("Migration failed:", error);
  process.exit(1);
} finally {
  await connection.end();
}
