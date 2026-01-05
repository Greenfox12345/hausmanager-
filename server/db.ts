import { eq, and, desc, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { 
  InsertUser, 
  users, 
  households, 
  householdMembers,
  shoppingItems,
  tasks,
  projects,
  projectHouseholds,
  activityHistory,
  taskRotationExclusions,
  type Household,
  type HouseholdMember,
  type ShoppingItem,
  type Task,
  type Project,
  type ActivityHistory
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: Partial<InsertUser> & { openId: string }): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    // name is required for insert, use empty string as default if not provided
    const values: InsertUser = {
      openId: user.openId,
      name: user.name ?? "",
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      (values as any)[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);
    
    // Handle name separately since it's required
    if (user.name !== undefined) {
      values.name = user.name;
      updateSet.name = user.name;
    }

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// Household management
export async function createHousehold(name: string, passwordHash: string, createdBy: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(households).values({
    name,
    passwordHash,
    createdBy,
  });

  return Number(result[0].insertId);
}

export async function getHouseholdById(id: number): Promise<Household | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(households).where(eq(households.id, id)).limit(1);
  return result[0];
}

export async function getHouseholdByName(name: string): Promise<Household | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(households).where(eq(households.name, name)).limit(1);
  return result[0];
}

export async function getAllHouseholds(): Promise<Household[]> {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(households).orderBy(desc(households.createdAt));
}

// Household member management
export async function createHouseholdMember(data: {
  householdId: number;
  userId: number | null;
  memberName: string;
  passwordHash: string;
  photoUrl?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(householdMembers).values(data);
  return Number(result[0].insertId);
}

export async function getHouseholdMemberById(id: number): Promise<HouseholdMember | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(householdMembers).where(eq(householdMembers.id, id)).limit(1);
  return result[0];
}

export async function getHouseholdMembers(householdId: number): Promise<HouseholdMember[]> {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(householdMembers)
    .where(eq(householdMembers.householdId, householdId))
    .orderBy(householdMembers.memberName);
}

export async function getHouseholdMemberByName(householdId: number, memberName: string): Promise<HouseholdMember | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(householdMembers)
    .where(and(
      eq(householdMembers.householdId, householdId),
      eq(householdMembers.memberName, memberName)
    ))
    .limit(1);
  
  return result[0];
}

export async function updateHouseholdMember(id: number, data: Partial<HouseholdMember>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(householdMembers).set(data).where(eq(householdMembers.id, id));
}

export async function deleteHouseholdMember(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(householdMembers).where(eq(householdMembers.id, id));
}

// Shopping items management
export async function getShoppingItems(householdId: number): Promise<ShoppingItem[]> {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(shoppingItems)
    .where(eq(shoppingItems.householdId, householdId))
    .orderBy(shoppingItems.isCompleted, desc(shoppingItems.createdAt));
}

export async function createShoppingItem(data: {
  householdId: number;
  name: string;
  category: "Lebensmittel" | "Haushalt" | "Pflege" | "Sonstiges";
  quantity?: string;
  notes?: string;
  addedBy: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(shoppingItems).values(data);
  return Number(result[0].insertId);
}

export async function updateShoppingItem(id: number, data: Partial<ShoppingItem>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(shoppingItems).set(data).where(eq(shoppingItems.id, id));
}

export async function deleteShoppingItem(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(shoppingItems).where(eq(shoppingItems.id, id));
}

// Tasks management
export async function getTasks(householdId: number): Promise<Task[]> {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(tasks)
    .where(eq(tasks.householdId, householdId))
    .orderBy(tasks.isCompleted, desc(tasks.createdAt));
}

export async function createTask(data: {
  householdId: number;
  name: string;
  description?: string;
  assignedTo?: number;
  frequency?: "once" | "daily" | "weekly" | "monthly" | "custom";
  customFrequencyDays?: number;
  repeatInterval?: number;
  repeatUnit?: "days" | "weeks" | "months";
  enableRotation?: boolean;
  requiredPersons?: number;
  dueDate?: Date;
  projectIds?: number[];
  createdBy: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(tasks).values(data);
  return Number(result[0].insertId);
}

export async function updateTask(id: number, data: Partial<Task>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(tasks).set(data).where(eq(tasks.id, id));
}

export async function deleteTask(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(tasks).where(eq(tasks.id, id));
}

export async function createTaskRotationExclusions(taskId: number, memberIds: number[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  if (memberIds.length === 0) return;

  const exclusions = memberIds.map(memberId => ({
    taskId,
    memberId,
  }));

  await db.insert(taskRotationExclusions).values(exclusions);
}

// Projects management
export async function getProjects(householdId: number): Promise<Project[]> {
  const db = await getDb();
  if (!db) return [];

  const projectIds = await db.select({ projectId: projectHouseholds.projectId })
    .from(projectHouseholds)
    .where(eq(projectHouseholds.householdId, householdId));

  if (projectIds.length === 0) return [];

  return db.select().from(projects)
    .where(eq(projects.id, projectIds[0]!.projectId))
    .orderBy(desc(projects.createdAt));
}

export async function createProject(data: {
  name: string;
  description?: string;
  startDate?: Date;
  endDate?: Date;
  status?: "planning" | "active" | "completed" | "cancelled";
  isNeighborhoodProject?: boolean;
  createdBy: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(projects).values(data);
  return Number(result[0].insertId);
}

export async function updateProject(id: number, data: Partial<Project>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(projects).set(data).where(eq(projects.id, id));
}

export async function deleteProject(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(projects).where(eq(projects.id, id));
}

// Activity history
export async function createActivityLog(data: {
  householdId: number;
  memberId: number;
  activityType: "shopping" | "task" | "project" | "member" | "other";
  action: string;
  description: string;
  relatedItemId?: number;
  comment?: string;
  photoUrl?: string;
  photoUrls?: string[];
  metadata?: Record<string, any>;
  completedDate?: Date; // For recurring tasks: the actual date this occurrence was completed
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(activityHistory).values(data);
  return Number(result[0].insertId);
}

export async function getActivityHistory(householdId: number, limit: number = 30, offset: number = 0) {
  const db = await getDb();
  if (!db) return { activities: [], total: 0 };

  // Get total count
  const countResult = await db.select({ count: sql<number>`count(*)` }).from(activityHistory)
    .where(eq(activityHistory.householdId, householdId));
  const total = Number(countResult[0]?.count || 0);

  // Get activities with task details if relatedItemId exists and activityType is 'task'
  const activities = await db.select().from(activityHistory)
    .where(eq(activityHistory.householdId, householdId))
    .orderBy(desc(activityHistory.createdAt))
    .limit(limit)
    .offset(offset);

  // Enrich activities with task details
  const enrichedActivities = await Promise.all(
    activities.map(async (activity) => {
      if (activity.activityType === 'task' && activity.relatedItemId) {
        const taskResult = await db.select().from(tasks)
          .where(eq(tasks.id, activity.relatedItemId))
          .limit(1);
        
        if (taskResult.length > 0) {
          const task = taskResult[0];
          return {
            ...activity,
            taskDetails: {
              name: task.name,
              description: task.description,
              assignedTo: task.assignedTo,
              dueDate: task.dueDate,
            },
          };
        }
      }
      return activity;
    })
  );

  return { activities: enrichedActivities, total };
}

export async function getActivityHistoryByTaskId(taskId: number, householdId: number) {
  const db = await getDb();
  if (!db) return [];

  // Get all activities related to this specific task
  const activities = await db.select().from(activityHistory)
    .where(
      and(
        eq(activityHistory.householdId, householdId),
        eq(activityHistory.relatedItemId, taskId),
        eq(activityHistory.activityType, 'task')
      )
    )
    .orderBy(desc(activityHistory.createdAt));

  return activities;
}

// Admin function to delete household and all related data
export async function deleteHousehold(householdId: number) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot delete household: database not available");
    return false;
  }

  try {
    // Get all tasks for this household first
    const householdTasks = await db.select({ id: tasks.id })
      .from(tasks)
      .where(eq(tasks.householdId, householdId));
    
    // Delete task rotation exclusions for these tasks
    for (const task of householdTasks) {
      await db.delete(taskRotationExclusions).where(eq(taskRotationExclusions.taskId, task.id));
    }
    
    // Delete in order to respect foreign key constraints
    await db.delete(activityHistory).where(eq(activityHistory.householdId, householdId));
    await db.delete(projectHouseholds).where(eq(projectHouseholds.householdId, householdId));
    await db.delete(shoppingItems).where(eq(shoppingItems.householdId, householdId));
    await db.delete(tasks).where(eq(tasks.householdId, householdId));
    await db.delete(householdMembers).where(eq(householdMembers.householdId, householdId));
    await db.delete(households).where(eq(households.id, householdId));
    
    return true;
  } catch (error) {
    console.error("[Database] Failed to delete household:", error);
    return false;
  }
}
