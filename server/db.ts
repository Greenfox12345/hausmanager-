import { eq, and, desc, sql, or } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { 
  InsertUser, 
  users, 
  households, 
  householdMembers,
  shoppingItems,
  shoppingCategories,
  tasks,
  projects,
  projectHouseholds,
  activityHistory,
  taskRotationExclusions,
  taskRotationSchedule,
  taskRotationOccurrenceNotes,
  inventoryItems,
  inventoryOwnership,
  borrowRequests,
  borrowGuidelines,
  borrowReturnPhotos,
  calendarEvents,
  type Household,
  type HouseholdMember,
  type ShoppingItem,
  type ShoppingCategory,
  type Task,
  type Project,
  type ActivityHistory,
  type InventoryItem,
  type InventoryOwnership,
  type BorrowRequest,
  type BorrowGuideline,
  type BorrowReturnPhoto,
  type CalendarEvent,
  type InsertCalendarEvent,
  type TaskRotationSchedule,
  type InsertTaskRotationSchedule,
  type TaskRotationOccurrenceNote,
  type InsertTaskRotationOccurrenceNote
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

  const items = await db.select().from(shoppingItems)
    .where(eq(shoppingItems.householdId, householdId))
    .orderBy(shoppingItems.isCompleted, desc(shoppingItems.createdAt));
  
  // Deserialize photoUrls from JSON string
  return items.map(item => ({
    ...item,
    photoUrls: item.photoUrls ? JSON.parse(item.photoUrls as any) : undefined
  }));
}

export async function createShoppingItem(data: {
  householdId: number;
  name: string;
  categoryId: number;
  details?: string;
  photoUrls?: string[] | {url: string, filename: string}[];
  notes?: string;
  addedBy: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const insertData: any = { ...data };
  if (data.photoUrls) {
    insertData.photoUrls = JSON.stringify(data.photoUrls);
  }

  const result = await db.insert(shoppingItems).values(insertData);
  return Number(result[0].insertId);
}

export async function updateShoppingItem(id: number, data: {
  name?: string;
  categoryId?: number;
  details?: string;
  photoUrls?: string[] | {url: string, filename: string}[];
  notes?: string;
  isCompleted?: boolean;
  completedBy?: number | null;
  completedAt?: Date | null;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const updateData: any = { ...data };
  if (data.photoUrls) {
    updateData.photoUrls = JSON.stringify(data.photoUrls);
  }

  await db.update(shoppingItems)
    .set(updateData)
    .where(eq(shoppingItems.id, id));
}

export async function deleteShoppingItem(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(shoppingItems).where(eq(shoppingItems.id, id));
}

// Shopping categories management
export async function getShoppingCategories(householdId: number): Promise<ShoppingCategory[]> {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(shoppingCategories)
    .where(eq(shoppingCategories.householdId, householdId))
    .orderBy(shoppingCategories.name);
}

export async function createShoppingCategory(data: {
  householdId: number;
  name: string;
  color?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(shoppingCategories).values(data);
  return Number(result[0].insertId);
}

export async function updateShoppingCategory(id: number, data: { name?: string; color?: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(shoppingCategories).set(data).where(eq(shoppingCategories.id, id));
}

export async function deleteShoppingCategory(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(shoppingCategories).where(eq(shoppingCategories.id, id));
}

export async function linkItemsToTask(itemIds: number[], taskId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Update all items to link them to the task
  for (const itemId of itemIds) {
    await db.update(shoppingItems)
      .set({ taskId })
      .where(eq(shoppingItems.id, itemId));
  }
}

export async function unlinkItemsFromTask(itemIds: number[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Update all items to unlink them from tasks
  for (const itemId of itemIds) {
    await db.update(shoppingItems)
      .set({ taskId: null })
      .where(eq(shoppingItems.id, itemId));
  }
}

// Tasks management
export async function getTasks(householdId: number): Promise<(Task & { sharedHouseholdCount?: number, isSharedWithUs?: boolean, assignedToNames?: string })[]> {
  const db = await getDb();
  if (!db) return [];

  // Use raw SQL to avoid Drizzle caching issues
  const [tasksResult] = await db.execute(
    sql`SELECT * FROM tasks 
        WHERE householdId = ${householdId} 
           OR JSON_SEARCH(sharedHouseholdIds, 'one', CAST(${householdId} AS CHAR)) IS NOT NULL
        ORDER BY isCompleted, createdAt DESC`
  );

  const rawTasks = tasksResult as unknown as any[];

  // Parse JSON fields that come as strings from raw SQL
  const jsonFields = ['assignedTo', 'projectIds', 'sharedHouseholdIds', 'skippedDates', 'completionPhotoUrls', 'completionFileUrls'];
  const tasksWithSharing = rawTasks.map(task => {
    const parsed = { ...task };
    for (const field of jsonFields) {
      if (parsed[field] && typeof parsed[field] === 'string') {
        try {
          parsed[field] = JSON.parse(parsed[field]);
        } catch {
          // leave as-is if not valid JSON
        }
      }
    }
    // Convert boolean fields (MySQL returns 0/1 from raw SQL)
    if (typeof parsed.isCompleted === 'number') parsed.isCompleted = parsed.isCompleted === 1;
    if (typeof parsed.enableRotation === 'number') parsed.enableRotation = parsed.enableRotation === 1;
    if (typeof parsed.irregularRecurrence === 'number') parsed.irregularRecurrence = parsed.irregularRecurrence === 1;
    return parsed;
  });

  // Get all household members to resolve names - also get members from shared households
  const allHouseholdIds = new Set<number>();
  allHouseholdIds.add(householdId);
  tasksWithSharing.forEach(task => {
    if (task.sharedHouseholdIds && Array.isArray(task.sharedHouseholdIds)) {
      task.sharedHouseholdIds.forEach((id: number) => allHouseholdIds.add(id));
    }
    if (task.householdId) allHouseholdIds.add(task.householdId);
  });

  const householdIdList = Array.from(allHouseholdIds);
  const [membersResult] = await db.execute(
    sql`SELECT id, memberName, householdId FROM household_members WHERE householdId IN (${sql.raw(householdIdList.join(','))})`
  );
  
  const members = membersResult as unknown as { id: number; memberName: string; householdId: number }[];

  // Resolve assignedToNames in JavaScript
  const tasksWithNames = tasksWithSharing.map(task => {
    let assignedToNames: string | null = null;
    
    if (task.assignedTo && Array.isArray(task.assignedTo) && task.assignedTo.length > 0) {
      const names = task.assignedTo
        .map((id: number) => members.find(m => m.id === id)?.memberName)
        .filter((name: string | undefined) => name !== undefined);
      
      assignedToNames = names.length > 0 ? names.join(", ") : null;
    }
    
    return {
      ...task,
      assignedToNames,
    };
  });

  return tasksWithNames as any;
}

export async function createTask(data: {
  householdId: number;
  name: string;
  description?: string;
  assignedTo?: number[]; // Array of member IDs
  frequency?: "once" | "daily" | "weekly" | "monthly" | "custom";
  customFrequencyDays?: number;
  repeatInterval?: number;
  repeatUnit?: "days" | "weeks" | "months" | "irregular";
  irregularRecurrence?: boolean;
  monthlyRecurrenceMode?: "same_date" | "same_weekday";
  enableRotation?: boolean;
  requiredPersons?: number;
  dueDate?: Date;
  projectIds?: number[];
  nonResponsiblePermission?: "full" | "milestones_reminders" | "view_only";
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

  // Flatten assignedTo to prevent nested arrays [[id]] -> [id]
  if (data.assignedTo !== undefined && data.assignedTo !== null) {
    const raw = data.assignedTo as any;
    if (Array.isArray(raw)) {
      data.assignedTo = raw.flat().filter((v: any) => typeof v === 'number') as any;
    } else if (typeof raw === 'number') {
      data.assignedTo = [raw] as any;
    } else if (typeof raw === 'string') {
      try {
        const parsed = JSON.parse(raw);
        data.assignedTo = (Array.isArray(parsed) ? parsed.flat() : [parsed]).filter((v: any) => typeof v === 'number') as any;
      } catch {
        data.assignedTo = [] as any;
      }
    }
  }

  // Flatten sharedHouseholdIds to prevent nested arrays
  if (data.sharedHouseholdIds !== undefined && data.sharedHouseholdIds !== null) {
    const raw = data.sharedHouseholdIds as any;
    if (Array.isArray(raw)) {
      data.sharedHouseholdIds = raw.flat().filter((v: any) => typeof v === 'number') as any;
    }
  }

  // Flatten projectIds to prevent nested arrays
  if (data.projectIds !== undefined && data.projectIds !== null) {
    const raw = data.projectIds as any;
    if (Array.isArray(raw)) {
      data.projectIds = raw.flat().filter((v: any) => typeof v === 'number') as any;
    }
  }

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
  activityType: "shopping" | "task" | "project" | "member" | "inventory" | "other";
  action: string;
  description: string;
  relatedItemId?: number;
  comment?: string;
  photoUrl?: string;
  photoUrls?: string[] | {url: string, filename: string}[];
  fileUrls?: string[] | {url: string, filename: string}[];
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

// ===== Inventory Functions =====

export async function getInventoryItems(householdId: number) {
  const db = await getDb();
  if (!db) return [];

  const items = await db.select({
    id: inventoryItems.id,
    name: inventoryItems.name,
    details: inventoryItems.details,
    categoryId: inventoryItems.categoryId,
    categoryName: shoppingCategories.name,
    categoryColor: shoppingCategories.color,
    photoUrls: inventoryItems.photoUrls,
    ownershipType: inventoryItems.ownershipType,
    createdBy: inventoryItems.createdBy,
    creatorName: householdMembers.memberName,
    createdAt: inventoryItems.createdAt,
    updatedAt: inventoryItems.updatedAt,
  })
    .from(inventoryItems)
    .leftJoin(shoppingCategories, eq(inventoryItems.categoryId, shoppingCategories.id))
    .leftJoin(householdMembers, eq(inventoryItems.createdBy, householdMembers.id))
    .where(eq(inventoryItems.householdId, householdId))
    .orderBy(desc(inventoryItems.createdAt));

  // Get owners for each item
  const itemsWithOwners = await Promise.all(items.map(async (item) => {
    const owners = await db.select({
      memberId: inventoryOwnership.memberId,
      memberName: householdMembers.memberName,
    })
      .from(inventoryOwnership)
      .leftJoin(householdMembers, eq(inventoryOwnership.memberId, householdMembers.id))
      .where(eq(inventoryOwnership.inventoryItemId, item.id));

    return {
      ...item,
      owners: owners.map(o => ({ memberId: o.memberId, memberName: o.memberName || '' })),
    };
  }));

  return itemsWithOwners;
}

export async function getInventoryItemById(itemId: number) {
  const db = await getDb();
  if (!db) return null;

  const [item] = await db.select({
    id: inventoryItems.id,
    householdId: inventoryItems.householdId,
    name: inventoryItems.name,
    details: inventoryItems.details,
    categoryId: inventoryItems.categoryId,
    categoryName: shoppingCategories.name,
    categoryColor: shoppingCategories.color,
    photoUrls: inventoryItems.photoUrls,
    ownershipType: inventoryItems.ownershipType,
    createdBy: inventoryItems.createdBy,
    creatorName: householdMembers.memberName,
    createdAt: inventoryItems.createdAt,
    updatedAt: inventoryItems.updatedAt,
  })
    .from(inventoryItems)
    .leftJoin(shoppingCategories, eq(inventoryItems.categoryId, shoppingCategories.id))
    .leftJoin(householdMembers, eq(inventoryItems.createdBy, householdMembers.id))
    .where(eq(inventoryItems.id, itemId));

  if (!item) return null;

  // Get owners
  const owners = await db.select({
    memberId: inventoryOwnership.memberId,
    memberName: householdMembers.memberName,
  })
    .from(inventoryOwnership)
    .leftJoin(householdMembers, eq(inventoryOwnership.memberId, householdMembers.id))
    .where(eq(inventoryOwnership.inventoryItemId, item.id));

  return {
    ...item,
    owners: owners.map(o => ({ memberId: o.memberId, memberName: o.memberName || '' })),
  };
}

export async function addInventoryItem(data: {
  householdId: number;
  memberId: number;
  name: string;
  details?: string;
  categoryId: number;
  photoUrls?: string[] | {url: string, filename: string}[];
  ownershipType: 'personal' | 'household';
  ownerIds?: number[];
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const insertData: any = {
    householdId: data.householdId,
    name: data.name,
    categoryId: data.categoryId,
    photoUrls: data.photoUrls || [],
    ownershipType: data.ownershipType,
    createdBy: data.memberId,
  };

  if (data.details) {
    insertData.details = data.details;
  }

  const [newItem] = await db.insert(inventoryItems).values(insertData);

  const itemId = newItem.insertId;

  // Add owners if personal ownership
  if (data.ownershipType === 'personal' && data.ownerIds && data.ownerIds.length > 0) {
    await Promise.all(data.ownerIds.map(ownerId =>
      db.insert(inventoryOwnership).values({
        inventoryItemId: itemId,
        memberId: ownerId,
      })
    ));
  }

  return { id: itemId };
}

export async function updateInventoryItem(data: {
  itemId: number;
  name?: string;
  details?: string;
  categoryId?: number;
  photoUrls?: string[] | {url: string, filename: string}[];
  ownershipType?: 'personal' | 'household';
  ownerIds?: number[];
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const updateData: any = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.details !== undefined) updateData.details = data.details;
  if (data.categoryId !== undefined) updateData.categoryId = data.categoryId;
  if (data.photoUrls !== undefined) updateData.photoUrls = data.photoUrls;
  if (data.ownershipType !== undefined) updateData.ownershipType = data.ownershipType;

  await db.update(inventoryItems)
    .set(updateData)
    .where(eq(inventoryItems.id, data.itemId));

  // Update owners if provided
  if (data.ownerIds !== undefined) {
    // Delete existing owners
    await db.delete(inventoryOwnership).where(eq(inventoryOwnership.inventoryItemId, data.itemId));

    // Add new owners if personal ownership
    if (data.ownershipType === 'personal' && data.ownerIds.length > 0) {
      await Promise.all(data.ownerIds.map(ownerId =>
        db.insert(inventoryOwnership).values({
          inventoryItemId: data.itemId,
          memberId: ownerId,
        })
      ));
    }
  }

  return { success: true };
}

export async function deleteInventoryItem(itemId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Delete ownership records first (cascade should handle this, but explicit is safer)
  await db.delete(inventoryOwnership).where(eq(inventoryOwnership.inventoryItemId, itemId));
  
  // Delete the item
  await db.delete(inventoryItems).where(eq(inventoryItems.id, itemId));

  return { success: true };
}

export async function getLinkedShoppingItems(taskId: number): Promise<ShoppingItem[]> {
  const db = await getDb();
  if (!db) return [];

  const items = await db.select().from(shoppingItems)
    .where(eq(shoppingItems.taskId, taskId));
  
  // Deserialize photoUrls from JSON string
  return items.map(item => ({
    ...item,
    photoUrls: item.photoUrls ? JSON.parse(item.photoUrls as any) : undefined
  }));
}

// ============================================
// Borrow Requests
// ============================================

export async function createBorrowRequest(data: {
  inventoryItemId: number;
  borrowerHouseholdId: number;
  borrowerMemberId: number;
  ownerHouseholdId: number;
  startDate: Date;
  endDate: Date;
  requestMessage?: string;
  status?: "pending" | "approved" | "active" | "completed" | "rejected" | "cancelled";
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [result] = await db.insert(borrowRequests).values({
    inventoryItemId: data.inventoryItemId,
    borrowerHouseholdId: data.borrowerHouseholdId,
    borrowerMemberId: data.borrowerMemberId,
    ownerHouseholdId: data.ownerHouseholdId,
    startDate: data.startDate,
    endDate: data.endDate,
    requestMessage: data.requestMessage,
    status: data.status || "pending",
  });

  return result.insertId;
}

export async function getBorrowRequestById(requestId: number) {
  const db = await getDb();
  if (!db) return null;

  const [request] = await db.select().from(borrowRequests)
    .where(eq(borrowRequests.id, requestId));

  return request || null;
}

export async function getBorrowRequestsByItem(itemId: number) {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(borrowRequests)
    .where(eq(borrowRequests.inventoryItemId, itemId))
    .orderBy(borrowRequests.createdAt);
}

export async function getBorrowRequestsByBorrower(memberId: number) {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(borrowRequests)
    .where(eq(borrowRequests.borrowerMemberId, memberId))
    .orderBy(borrowRequests.createdAt);
}

export async function getBorrowRequestsByOwner(householdId: number) {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(borrowRequests)
    .where(eq(borrowRequests.ownerHouseholdId, householdId))
    .orderBy(borrowRequests.createdAt);
}

export async function updateBorrowRequestStatus(data: {
  requestId: number;
  status: "pending" | "approved" | "active" | "completed" | "rejected" | "cancelled";
  approvedBy?: number;
  approvedAt?: Date;
  borrowedAt?: Date;
  returnedAt?: Date;
  responseMessage?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const updateData: any = {
    status: data.status,
  };

  if (data.approvedBy !== undefined) updateData.approvedBy = data.approvedBy;
  if (data.approvedAt !== undefined) updateData.approvedAt = data.approvedAt;
  if (data.borrowedAt !== undefined) updateData.borrowedAt = data.borrowedAt;
  if (data.returnedAt !== undefined) updateData.returnedAt = data.returnedAt;
  if (data.responseMessage !== undefined) updateData.responseMessage = data.responseMessage;

  await db.update(borrowRequests)
    .set(updateData)
    .where(eq(borrowRequests.id, data.requestId));

  return { success: true };
}

// ===== Borrow Guidelines Functions =====

export async function createBorrowGuideline(data: {
  inventoryItemId: number;
  instructionsText?: string;
  checklistItems?: Array<{id: string, label: string, required: boolean}>;
  photoRequirements?: Array<{id: string, label: string, examplePhotoUrl?: string, required: boolean}>;
  createdBy: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [result] = await db.insert(borrowGuidelines).values({
    inventoryItemId: data.inventoryItemId,
    instructionsText: data.instructionsText,
    checklistItems: data.checklistItems as any,
    photoRequirements: data.photoRequirements as any,
    createdBy: data.createdBy,
  });

  return result.insertId;
}

export async function getBorrowGuidelineByItemId(itemId: number) {
  const db = await getDb();
  if (!db) return null;

  const [guideline] = await db.select().from(borrowGuidelines)
    .where(eq(borrowGuidelines.inventoryItemId, itemId));

  return guideline || null;
}

export async function updateBorrowGuideline(data: {
  id: number;
  instructionsText?: string;
  checklistItems?: Array<{id: string, label: string, required: boolean}>;
  photoRequirements?: Array<{id: string, label: string, examplePhotoUrl?: string, required: boolean}>;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const updateData: any = {};
  if (data.instructionsText !== undefined) updateData.instructionsText = data.instructionsText;
  if (data.checklistItems !== undefined) updateData.checklistItems = data.checklistItems as any;
  if (data.photoRequirements !== undefined) updateData.photoRequirements = data.photoRequirements as any;

  await db.update(borrowGuidelines)
    .set(updateData)
    .where(eq(borrowGuidelines.id, data.id));
}

export async function deleteBorrowGuideline(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(borrowGuidelines).where(eq(borrowGuidelines.id, id));
}

// ===== Borrow Return Photos Functions =====

export async function createBorrowReturnPhoto(data: {
  borrowRequestId: number;
  photoRequirementId?: string;
  photoUrl: string;
  filename?: string;
  uploadedBy: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [result] = await db.insert(borrowReturnPhotos).values({
    borrowRequestId: data.borrowRequestId,
    photoRequirementId: data.photoRequirementId,
    photoUrl: data.photoUrl,
    filename: data.filename,
    uploadedBy: data.uploadedBy,
  });

  return result.insertId;
}

export async function getBorrowReturnPhotosByRequestId(requestId: number) {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(borrowReturnPhotos)
    .where(eq(borrowReturnPhotos.borrowRequestId, requestId))
    .orderBy(borrowReturnPhotos.uploadedAt);
}

// ==================== Calendar Events ====================

export async function createCalendarEvent(data: InsertCalendarEvent) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [result] = await db.insert(calendarEvents).values(data);
  return result.insertId;
}

export async function getCalendarEventById(id: number) {
  const db = await getDb();
  if (!db) return null;

  const [event] = await db.select().from(calendarEvents).where(eq(calendarEvents.id, id));
  return event || null;
}

export async function getCalendarEventsByHousehold(householdId: number) {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(calendarEvents)
    .where(eq(calendarEvents.householdId, householdId))
    .orderBy(calendarEvents.startDate);
}

export async function getCalendarEventsByBorrowRequest(borrowRequestId: number) {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(calendarEvents)
    .where(eq(calendarEvents.relatedBorrowId, borrowRequestId))
    .orderBy(calendarEvents.startDate);
}

export async function markCalendarEventCompleted(eventId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(calendarEvents)
    .set({ 
      isCompleted: true, 
      completedAt: new Date() 
    })
    .where(eq(calendarEvents.id, eventId));
}

export async function deleteCalendarEvent(eventId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(calendarEvents).where(eq(calendarEvents.id, eventId));
}

export async function deleteCalendarEventsByBorrowRequest(borrowRequestId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(calendarEvents)
    .where(eq(calendarEvents.relatedBorrowId, borrowRequestId));
}

// ==================== Task Rotation Schedule ====================

/**
 * Get rotation schedule for a task
 * Returns schedule entries grouped by occurrence number with member details and notes
 */
export async function getRotationSchedule(taskId: number) {
  const db = await getDb();
  if (!db) return [];

  // Get schedule entries
  const scheduleEntries = await db.select().from(taskRotationSchedule)
    .where(eq(taskRotationSchedule.taskId, taskId))
    .orderBy(taskRotationSchedule.occurrenceNumber, taskRotationSchedule.position);

  // Get notes for all occurrences
  const notes = await db.select().from(taskRotationOccurrenceNotes)
    .where(eq(taskRotationOccurrenceNotes.taskId, taskId));

  // Group by occurrence number
  const grouped: Record<number, { members: { position: number; memberId: number }[]; notes?: string }> = {};
  
  for (const entry of scheduleEntries) {
    if (!grouped[entry.occurrenceNumber]) {
      grouped[entry.occurrenceNumber] = { members: [] };
    }
    grouped[entry.occurrenceNumber].members.push({
      position: entry.position,
      memberId: entry.memberId,
    });
  }

  // Add notes to grouped data
  for (const note of notes) {
    if (grouped[note.occurrenceNumber]) {
      grouped[note.occurrenceNumber].notes = note.notes || undefined;
    }
  }

  // Convert to array format
  return Object.entries(grouped).map(([occurrenceNumber, data]) => ({
    occurrenceNumber: parseInt(occurrenceNumber),
    members: data.members.sort((a, b) => a.position - b.position),
    notes: data.notes,
  }));
}

/**
 * Set rotation schedule for a task
 * Replaces all existing schedule entries and notes
 */
export async function setRotationSchedule(
  taskId: number,
  schedule: Array<{
    occurrenceNumber: number;
    members: Array<{ position: number; memberId: number }>;
    notes?: string;
  }>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Delete existing schedule and notes
  await db.delete(taskRotationSchedule).where(eq(taskRotationSchedule.taskId, taskId));
  await db.delete(taskRotationOccurrenceNotes).where(eq(taskRotationOccurrenceNotes.taskId, taskId));

  // Insert new schedule entries
  for (const occurrence of schedule) {
    for (const member of occurrence.members) {
      await db.insert(taskRotationSchedule).values({
        taskId,
        occurrenceNumber: occurrence.occurrenceNumber,
        position: member.position,
        memberId: member.memberId,
      });
    }

    // Insert notes if provided
    if (occurrence.notes) {
      await db.insert(taskRotationOccurrenceNotes).values({
        taskId,
        occurrenceNumber: occurrence.occurrenceNumber,
        notes: occurrence.notes,
      });
    }
  }

  return { success: true };
}

/**
 * Extend rotation schedule by adding one more occurrence
 * Used when completing tasks to maintain 3 future occurrences
 */
export async function extendRotationSchedule(
  taskId: number,
  newOccurrenceNumber: number,
  members: Array<{ position: number; memberId: number }>,
  notes?: string
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Insert new schedule entries
  for (const member of members) {
    await db.insert(taskRotationSchedule).values({
      taskId,
      occurrenceNumber: newOccurrenceNumber,
      position: member.position,
      memberId: member.memberId,
    });
  }

  // Insert notes if provided
  if (notes) {
    await db.insert(taskRotationOccurrenceNotes).values({
      taskId,
      occurrenceNumber: newOccurrenceNumber,
      notes,
    });
  }

  return { success: true };
}

/**
 * Shift rotation schedule down by one occurrence
 * Used when completing a task - occurrence 2 becomes 1, occurrence 3 becomes 2, etc.
 */
export async function shiftRotationSchedule(taskId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get current schedule
  const currentSchedule = await getRotationSchedule(taskId);
  if (currentSchedule.length === 0) return { success: true };

  // Delete all existing entries
  await db.delete(taskRotationSchedule).where(eq(taskRotationSchedule.taskId, taskId));
  await db.delete(taskRotationOccurrenceNotes).where(eq(taskRotationOccurrenceNotes.taskId, taskId));

  // Re-insert with decremented occurrence numbers
  for (const occurrence of currentSchedule) {
    const newOccurrenceNumber = occurrence.occurrenceNumber - 1;
    if (newOccurrenceNumber < 1) continue; // Skip occurrence 1 (it was just completed)

    for (const member of occurrence.members) {
      await db.insert(taskRotationSchedule).values({
        taskId,
        occurrenceNumber: newOccurrenceNumber,
        position: member.position,
        memberId: member.memberId,
      });
    }

    if (occurrence.notes) {
      await db.insert(taskRotationOccurrenceNotes).values({
        taskId,
        occurrenceNumber: newOccurrenceNumber,
        notes: occurrence.notes,
      });
    }
  }

  return { success: true };
}
