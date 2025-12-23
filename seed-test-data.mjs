import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import bcrypt from "bcrypt";
import { households, householdMembers, shoppingItems, tasks, taskRotationExclusions } from "./drizzle/schema.js";

const connection = await mysql.createConnection(process.env.DATABASE_URL);
const db = drizzle(connection);

async function seed() {
  console.log("🌱 Seeding test data...");

  // Create test household
  const householdResult = await db.insert(households).values({
    householdName: "Familie Müller",
    passwordHash: await bcrypt.hash("test123", 10),
  });
  const householdId = Number(householdResult[0].insertId);
  console.log(`✅ Created household: Familie Müller (ID: ${householdId})`);

  // Create household members
  const members = [
    { name: "Anna", password: "anna123" },
    { name: "Ben", password: "ben123" },
    { name: "Clara", password: "clara123" },
    { name: "David", password: "david123" },
  ];

  const memberIds = [];
  for (const member of members) {
    const result = await db.insert(householdMembers).values({
      householdId,
      userId: null,
      memberName: member.name,
      passwordHash: await bcrypt.hash(member.password, 10),
      isActive: true,
    });
    memberIds.push(Number(result[0].insertId));
    console.log(`✅ Created member: ${member.name}`);
  }

  // Create sample shopping items
  const shoppingCategories = ["Lebensmittel", "Haushalt", "Pflege", "Sonstiges"];
  const shoppingItems = [
    { name: "Milch", category: "Lebensmittel", completed: false },
    { name: "Brot", category: "Lebensmittel", completed: false },
    { name: "Äpfel", category: "Lebensmittel", completed: true },
    { name: "Spülmittel", category: "Haushalt", completed: false },
    { name: "Toilettenpapier", category: "Haushalt", completed: false },
    { name: "Zahnpasta", category: "Pflege", completed: false },
  ];

  for (const item of shoppingItems) {
    await db.insert(shoppingItems).values({
      householdId,
      itemName: item.name,
      category: item.category,
      isCompleted: item.completed,
      addedBy: memberIds[0],
    });
  }
  console.log(`✅ Created ${shoppingItems.length} shopping items`);

  // Create sample tasks
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(10, 0, 0, 0);

  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 7);
  nextWeek.setHours(14, 0, 0, 0);

  const tasks = [
    {
      name: "Müll rausbringen",
      description: "Gelbe Tonne und Restmüll",
      assignedTo: memberIds[0],
      dueDate: tomorrow,
      frequency: "weekly",
      repeatInterval: 1,
      repeatUnit: "weeks",
      enableRotation: true,
      requiredPersons: 1,
    },
    {
      name: "Wocheneinkauf",
      description: "Großeinkauf für die Woche",
      assignedTo: memberIds[1],
      dueDate: nextWeek,
      frequency: "weekly",
      repeatInterval: 1,
      repeatUnit: "weeks",
      enableRotation: false,
      requiredPersons: null,
    },
    {
      name: "Bad putzen",
      description: "Komplette Badreinigung",
      assignedTo: memberIds[2],
      dueDate: nextWeek,
      frequency: "weekly",
      repeatInterval: 2,
      repeatUnit: "weeks",
      enableRotation: true,
      requiredPersons: 1,
    },
  ];

  for (const task of tasks) {
    const result = await db.insert(tasks).values({
      householdId,
      name: task.name,
      description: task.description,
      assignedTo: task.assignedTo,
      frequency: task.frequency,
      repeatInterval: task.repeatInterval,
      repeatUnit: task.repeatUnit,
      enableRotation: task.enableRotation,
      requiredPersons: task.requiredPersons,
      dueDate: task.dueDate,
      isCompleted: false,
      createdBy: memberIds[0],
    });
    const taskId = Number(result[0].insertId);

    // Add rotation exclusions (exclude last member from first task)
    if (task.enableRotation && task.name === "Müll rausbringen") {
      await db.insert(taskRotationExclusions).values({
        taskId,
        memberId: memberIds[3],
      });
    }
  }
  console.log(`✅ Created ${tasks.length} tasks`);

  console.log("\n🎉 Seeding complete!");
  console.log("\n📝 Login credentials:");
  console.log("Household: Familie Müller");
  console.log("Household Password: test123");
  console.log("\nMembers:");
  members.forEach((m) => console.log(`  - ${m.name}: ${m.password}`));

  process.exit(0);
}

seed().catch((error) => {
  console.error("❌ Seeding failed:", error);
  process.exit(1);
});
