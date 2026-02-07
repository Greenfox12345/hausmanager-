import { eq, and, desc, sql } from "drizzle-orm";
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
  type InsertCalendarEvent
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
