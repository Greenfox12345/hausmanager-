import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "./drizzle/schema.js";

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

const connection = await mysql.createConnection(DATABASE_URL);
const db = drizzle(connection, { schema, mode: "default" });

console.log("Starting shopping categories migration...");

try {
  // Step 1: Get all households
  const households = await db.select().from(schema.households);
  console.log(`Found ${households.length} households`);

  for (const household of households) {
    console.log(`\nProcessing household: ${household.name} (ID: ${household.id})`);

    // Step 2: Create default categories for this household
    const defaultCategories = ["Lebensmittel", "Haushalt", "Pflege", "Sonstiges"];
    const categoryMap = {}; // old name -> new ID

    for (const categoryName of defaultCategories) {
      const [result] = await db
        .insert(schema.shoppingCategories)
        .values({
          householdId: household.id,
          name: categoryName,
        })
        .$returningId();
      
      categoryMap[categoryName] = result.id;
      console.log(`  Created category: ${categoryName} (ID: ${result.id})`);
    }

    // Step 3: Get all shopping items for this household that still have the old category column
    const items = await connection.query(
      `SELECT id, category FROM shopping_items WHERE householdId = ? AND category IS NOT NULL`,
      [household.id]
    );

    const [rows] = items;
    console.log(`  Found ${rows.length} items to migrate`);

    // Step 4: Update each item with the new categoryId
    for (const item of rows) {
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
