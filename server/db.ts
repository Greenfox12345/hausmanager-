import { eq, and, desc, sql, or, inArray, isNull } from "drizzle-orm";
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
  taskDependencies,
  taskRotationExclusions,
  taskRotationSchedule,
  taskRotationOccurrenceNotes,
  inventoryItems,
  inventoryOwnership,
  inventoryItemAllowedHouseholds,
  householdConnections,
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
  type InventoryItemAllowedHousehold,
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


/**
 * Normalize a DATETIME value from db.execute() (raw SQL).
 *
 * Returns a STRING like "2026-04-07 14:00:00" — never a Date object.
 * This prevents Superjson/tRPC from converting to UTC during transport.
 *
 * When new Date("2026-04-07 14:00:00") is called (without 'Z'),
 * JavaScript interprets it as LOCAL time in ANY timezone:
 *   - Server (UTC-4): getHours() = 14 ✓
 *   - Browser (UTC+2): getHours() = 14 ✓
 *
 * This is the "wall-clock time" strategy: the stored time is always
 * interpreted as the local time of whoever reads it.
 */
function normalizeDatetimeFromRawSQL(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === 'string') {
    // Already a string like "2026-11-29 14:30:00" — return as-is
    return value;
  }
  if (value instanceof Date) {
    // mysql2 sometimes returns Date objects — convert back to wall-clock string
    return dateToWallClockString(value);
  }
  return null;
}

/**
 * Convert a Date object to a MySQL DATETIME string using LOCAL components.
 * Use this when writing a Date that was created with the wall-clock strategy
 * (new Date(str) without 'Z') to bypass Drizzle's toISOString() UTC conversion.
 *
 * Example: new Date('2026-04-07T14:00:00') on UTC-4 server
 *   → getHours() = 14, getUTCHours() = 18
 *   → returns '2026-04-07 14:00:00'  ✓ (not '2026-04-07 18:00:00')
 */
export function dateToWallClockString(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

let _db: ReturnType<typeof drizzle> | null = null;;

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
  categoryId?: number | null;
  details?: string;
  photoUrls?: string[] | {url: string, filename: string}[];
  notes?: string;
  neededBy?: number | null; // Unix-Timestamp (ms) – "Gebraucht bis"
  quantity?: number | null;
  unitId?: number | null;
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
  categoryId?: number | null;
  details?: string;
  photoUrls?: string[] | {url: string, filename: string}[];
  notes?: string;
  neededBy?: number | null; // Unix-Timestamp (ms) – "Gebraucht bis"
  quantity?: number | null;
  unitId?: number | null;
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
  const jsonFields = ['assignedTo', 'projectIds', 'sharedHouseholdIds', 'completionPhotoUrls', 'completionFileUrls'];
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
    // Normalize datetime fields: db.execute() returns strings like "2026-11-29 14:30:00"
    // which new Date() would interpret as LOCAL time. We must treat them as UTC
    // (matching Drizzle's mapFromDriverValue: new Date(value.replace(' ','T')+'Z')).
    parsed.dueDate = normalizeDatetimeFromRawSQL(parsed.dueDate);
    parsed.completedAt = normalizeDatetimeFromRawSQL(parsed.completedAt);
    parsed.createdAt = normalizeDatetimeFromRawSQL(parsed.createdAt);
    parsed.updatedAt = normalizeDatetimeFromRawSQL(parsed.updatedAt);
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

  // Load occurrence notes for all tasks that have repeatInterval (for calendar display)
  // For rotation-plan tasks (enableRotation=true): load ALL occurrenceNotes entries (they are the
  // authoritative list of which occurrences exist after deletions/renumbering).
  // For other recurring tasks: only load entries with actual content (notes, skipped, special, specialDate).
  const recurringTaskIds = tasksWithNames
    .filter((t: any) => (t.repeatInterval && t.repeatUnit) || t.repeatUnit === 'irregular')
    .map((t: any) => t.id as number);
  const rotationTaskIds = tasksWithNames
    .filter((t: any) => t.enableRotation === true)
    .map((t: any) => t.id as number);

  let occurrenceNotesMap: Record<number, { occurrenceNumber: number; occurrenceDate?: Date; notes: string; isSkipped: boolean; isSpecial?: boolean; specialName?: string; specialDate?: Date }[]> = {};
  if (recurringTaskIds.length > 0) {
    // For rotation tasks: load all entries (no content filter)
    // For non-rotation tasks: load only entries with content
    const rotationIdSet = new Set(rotationTaskIds);
    const nonRotationIds = recurringTaskIds.filter(id => !rotationIdSet.has(id));
    const allNotesRows: any[] = [];
    if (rotationTaskIds.length > 0) {
      const [rotNotes] = await db.execute(
        sql`SELECT taskId, occurrenceNumber, occurrenceDate, notes, isSkipped, isSpecial, specialName, specialDate FROM task_rotation_occurrence_notes WHERE taskId IN (${sql.raw(rotationTaskIds.join(','))})`
      );
      allNotesRows.push(...(rotNotes as unknown as any[]));
    }
    if (nonRotationIds.length > 0) {
      const [nonRotNotes] = await db.execute(
        sql`SELECT taskId, occurrenceNumber, occurrenceDate, notes, isSkipped, isSpecial, specialName, specialDate FROM task_rotation_occurrence_notes WHERE taskId IN (${sql.raw(nonRotationIds.join(','))}) AND ((notes IS NOT NULL AND notes != '') OR isSkipped = 1 OR isSpecial = 1 OR specialDate IS NOT NULL)`
      );
      allNotesRows.push(...(nonRotNotes as unknown as any[]));
    }
    const notesResult = allNotesRows;
    const notesRows = notesResult as unknown as { taskId: number; occurrenceNumber: number; occurrenceDate?: string | Date; notes: string; isSkipped: number; isSpecial?: number; specialName?: string; specialDate?: string | Date }[];
    for (const row of notesRows) {
      if (!occurrenceNotesMap[row.taskId]) occurrenceNotesMap[row.taskId] = [];
      occurrenceNotesMap[row.taskId].push({
        occurrenceNumber: row.occurrenceNumber,
        occurrenceDate: row.occurrenceDate ? new Date(row.occurrenceDate) : undefined,
        notes: row.notes,
        isSkipped: row.isSkipped === 1,
        isSpecial: row.isSpecial === 1,
        specialName: row.specialName || undefined,
        specialDate: row.specialDate ? new Date(row.specialDate) : undefined,
      });
    }
  }

  const tasksWithOccurrenceNotes = tasksWithNames.map((t: any) => ({
    ...t,
    occurrenceNotes: occurrenceNotesMap[t.id] || [],
  }));

  return tasksWithOccurrenceNotes as any;
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
  dueDateRaw?: string; // Raw SQL string to bypass Drizzle's UTC mapping
  durationDays?: number;
  durationMinutes?: number;
  projectIds?: number[];
  nonResponsiblePermission?: "full" | "milestones_reminders" | "view_only";
  createdBy: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const { dueDateRaw, ...insertData } = data;
  if (dueDateRaw !== undefined) {
    // Write dueDate directly as SQL string to bypass Drizzle's toISOString() UTC conversion
    const { dueDate: _ignored, ...dataWithoutDueDate } = insertData as any;
    const result = await db.insert(tasks).values({
      ...dataWithoutDueDate,
      dueDate: sql.raw(`'${dueDateRaw}'`) as any,
    });
    return Number(result[0].insertId);
  }

  const result = await db.insert(tasks).values(insertData);
  return Number(result[0].insertId);
}

export async function getTaskById(taskId: number): Promise<Task | null> {
  const db = await getDb();
  if (!db) return null;

  const [result] = await db.execute(
    sql`SELECT * FROM tasks WHERE id = ${taskId} LIMIT 1`
  );
  const rows = result as unknown as any[];
  if (!rows || rows.length === 0) return null;

  const task = { ...rows[0] };
  const jsonFields = ['assignedTo', 'projectIds', 'sharedHouseholdIds', 'completionPhotoUrls', 'completionFileUrls'];
  for (const field of jsonFields) {
    if (task[field] && typeof task[field] === 'string') {
      try { task[field] = JSON.parse(task[field]); } catch { /* leave as-is */ }
    }
  }
  if (typeof task.isCompleted === 'number') task.isCompleted = task.isCompleted === 1;
  if (typeof task.enableRotation === 'number') task.enableRotation = task.enableRotation === 1;
  if (typeof task.irregularRecurrence === 'number') task.irregularRecurrence = task.irregularRecurrence === 1;
  // Normalize datetime fields from raw SQL (same as getTasks)
  task.dueDate = normalizeDatetimeFromRawSQL(task.dueDate);
  task.completedAt = normalizeDatetimeFromRawSQL(task.completedAt);
  task.createdAt = normalizeDatetimeFromRawSQL(task.createdAt);
  task.updatedAt = normalizeDatetimeFromRawSQL(task.updatedAt);
  return task as Task;
}

export async function updateTask(id: number, data: Partial<Task> & { dueDateRaw?: string }) {
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

  // If dueDateRaw is provided, write it directly as a SQL string to bypass
  // Drizzle's datetime mapping (which would shift by server timezone via toISOString())
  const { dueDateRaw, ...restData } = data;
  if (dueDateRaw !== undefined) {
    // Remove dueDate from restData to avoid Drizzle's UTC conversion
    const { dueDate: _ignored, ...dataWithoutDueDate } = restData as any;
    await db.update(tasks)
      .set({ ...dataWithoutDueDate, dueDate: sql.raw(`'${dueDateRaw}'`) as any })
      .where(eq(tasks.id, id));
  } else {
    await db.update(tasks).set(restData).where(eq(tasks.id, id));
  }
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
  activityType: "shopping" | "task" | "project" | "member" | "inventory" | "calendar" | "borrow" | "other";
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

export async function getActivityHistory(householdId: number, limit: number = 30, offset: number = 0, activityTypeFilter?: string) {
  const db = await getDb();
  if (!db) return { activities: [], total: 0 };

  // When filtering by 'task', also include borrow entries that are linked to a task
  // When filtering by 'borrow', show all borrow entries
  // For 'task' filter: activityType='task' OR (activityType='borrow' AND metadata.taskId IS NOT NULL)
  let whereCondition;
  if (activityTypeFilter === 'task') {
    whereCondition = and(
      eq(activityHistory.householdId, householdId),
      or(
        eq(activityHistory.activityType, 'task'),
        and(
          eq(activityHistory.activityType, 'borrow'),
          sql`JSON_EXTRACT(${activityHistory.metadata}, '$.taskId') IS NOT NULL`
        )
      )
    );
  } else if (activityTypeFilter) {
    whereCondition = and(
      eq(activityHistory.householdId, householdId),
      eq(activityHistory.activityType, activityTypeFilter as any)
    );
  } else {
    whereCondition = eq(activityHistory.householdId, householdId);
  }

  // Get total count
  const countResult = await db.select({ count: sql<number>`count(*)` }).from(activityHistory)
    .where(whereCondition);
  const total = Number(countResult[0]?.count || 0);

  // Get activities
  const activities = await db.select().from(activityHistory)
    .where(whereCondition)
    .orderBy(desc(activityHistory.createdAt))
    .limit(limit)
    .offset(offset);

  // Enrich activities with task details
  const enrichedActivities = await Promise.all(
    activities.map(async (activity) => {
      // For task activities with relatedItemId, fetch task details
      if (activity.activityType === 'task' && activity.relatedItemId) {
        const taskResult = await db.select().from(tasks)
          .where(eq(tasks.id, activity.relatedItemId))
          .limit(1);
        if (taskResult.length > 0) {
          const task = taskResult[0];
          const dependencyRows = await db.select({
            id: taskDependencies.id,
            dependsOnTaskId: taskDependencies.dependsOnTaskId,
            dependencyType: taskDependencies.dependencyType,
          })
            .from(taskDependencies)
            .where(eq(taskDependencies.taskId, task.id));

          const relatedTaskIds = Array.from(new Set(
            dependencyRows
              .map(dependency => dependency.dependsOnTaskId)
              .filter(relatedTaskId => relatedTaskId !== task.id)
          ));
          const relatedTasks = relatedTaskIds.length > 0
            ? await db.select({ id: tasks.id, name: tasks.name })
              .from(tasks)
              .where(inArray(tasks.id, relatedTaskIds))
            : [];
          const relatedTaskNames = new Map(relatedTasks.map(relatedTask => [relatedTask.id, relatedTask.name]));
          const mapDependencies = (dependencyType: "prerequisite" | "followup") => dependencyRows
            .filter(dependency => dependency.dependencyType === dependencyType)
            .map(dependency => ({
              id: dependency.dependsOnTaskId,
              name: relatedTaskNames.get(dependency.dependsOnTaskId) ?? `#${dependency.dependsOnTaskId}`,
            }));

          return {
            ...activity,
            taskDetails: {
              name: task.name,
              description: task.description,
              assignedTo: task.assignedTo,
              dueDate: task.dueDate ? dateToWallClockString(task.dueDate) : null,
              prerequisites: mapDependencies("prerequisite"),
              followups: mapDependencies("followup"),
            },
          };
        }
      }
      // For borrow activities with taskId in metadata, fetch task details
      if (activity.activityType === 'borrow') {
        const meta = activity.metadata as Record<string, any> | null;
        const taskId = meta?.taskId;
        if (taskId) {
          const taskResult = await db.select().from(tasks)
            .where(eq(tasks.id, taskId))
            .limit(1);
          if (taskResult.length > 0) {
            const task = taskResult[0];
            return {
              ...activity,
              linkedTaskDetails: {
                id: task.id,
                name: task.name,
                taskName: meta?.taskName ?? task.name,
                occurrenceNumber: meta?.occurrenceNumber,
              },
            };
          }
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

  // Parse JSON fields (photoUrls, fileUrls, metadata) if they are strings
  return activities.map(activity => ({
    ...activity,
    photoUrls: typeof activity.photoUrls === 'string' ? JSON.parse(activity.photoUrls) : activity.photoUrls,
    fileUrls: typeof activity.fileUrls === 'string' ? JSON.parse(activity.fileUrls) : activity.fileUrls,
    metadata: typeof activity.metadata === 'string' ? JSON.parse(activity.metadata) : activity.metadata,
  }));
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
    visibility: inventoryItems.visibility,
    createdBy: inventoryItems.createdBy,
    creatorName: householdMembers.memberName,
    createdAt: inventoryItems.createdAt,
    updatedAt: inventoryItems.updatedAt,
    quantity: inventoryItems.quantity,
    unitId: inventoryItems.unitId,
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
    visibility: inventoryItems.visibility,
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
  quantity?: number | null;
  unitId?: number | null;
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
  if (data.quantity !== undefined) insertData.quantity = data.quantity;
  if (data.unitId !== undefined) insertData.unitId = data.unitId;

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
  quantity?: number | null;
  unitId?: number | null;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const updateData: any = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.details !== undefined) updateData.details = data.details;
  if (data.categoryId !== undefined) updateData.categoryId = data.categoryId;
  if (data.photoUrls !== undefined) updateData.photoUrls = data.photoUrls;
  if (data.ownershipType !== undefined) updateData.ownershipType = data.ownershipType;
  if (data.quantity !== undefined) updateData.quantity = data.quantity;
  if (data.unitId !== undefined) updateData.unitId = data.unitId;

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
  loanQuantity?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Convert Date objects to MySQL-compatible format (YYYY-MM-DD HH:MM:SS)
  // Use UTC methods so that a date string like "2026-03-29" sent from the
  // frontend (as ISO UTC midnight) is stored as 2026-03-29, not 2026-03-28.
  const formatDateForMySQL = (date: Date): string => {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day} 00:00:00`;
  };

  const startDateFormatted = formatDateForMySQL(data.startDate);
  const endDateFormatted = formatDateForMySQL(data.endDate);
  const loanQty = data.loanQuantity ?? 1;

  // Use sql template tag from drizzle-orm to properly construct query
  let query;
  
  if (data.requestMessage) {
    query = sql`
      INSERT INTO borrow_requests (
        inventoryItemId, borrowerHouseholdId, borrowerMemberId, ownerHouseholdId,
        status, startDate, endDate, requestMessage, loanQuantity
      ) VALUES (
        ${data.inventoryItemId}, ${data.borrowerHouseholdId}, ${data.borrowerMemberId}, ${data.ownerHouseholdId},
        ${data.status || "pending"}, ${startDateFormatted}, ${endDateFormatted}, ${data.requestMessage}, ${loanQty}
      )
    `;
  } else {
    query = sql`
      INSERT INTO borrow_requests (
        inventoryItemId, borrowerHouseholdId, borrowerMemberId, ownerHouseholdId,
        status, startDate, endDate, loanQuantity
      ) VALUES (
        ${data.inventoryItemId}, ${data.borrowerHouseholdId}, ${data.borrowerMemberId}, ${data.ownerHouseholdId},
        ${data.status || "pending"}, ${startDateFormatted}, ${endDateFormatted}, ${loanQty}
      )
    `;
  }

  const [result] = await db.execute(query);

  return (result as any).insertId;
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
 * Returns the real (DB-only) rotation schedule without virtual padding.
 * Use this when you need to know how many entries are actually stored.
 */
export async function getRealRotationSchedule(taskId: number) {
  const db = await getDb();
  if (!db) return [];

  const scheduleEntries = await db.select().from(taskRotationSchedule)
    .where(eq(taskRotationSchedule.taskId, taskId))
    .orderBy(taskRotationSchedule.occurrenceNumber, taskRotationSchedule.position);

  const notes = await db.select().from(taskRotationOccurrenceNotes)
    .where(eq(taskRotationOccurrenceNotes.taskId, taskId));

  const grouped: Record<number, { members: { position: number; memberId: number }[]; notes?: string; isSkipped?: boolean; isSpecial?: boolean; specialName?: string; specialDate?: Date }> = {};

  for (const entry of scheduleEntries) {
    if (!grouped[entry.occurrenceNumber]) {
      grouped[entry.occurrenceNumber] = { members: [] };
    }
    grouped[entry.occurrenceNumber].members.push({ position: entry.position, memberId: entry.memberId });
  }

  for (const note of notes) {
    if (!grouped[note.occurrenceNumber]) {
      grouped[note.occurrenceNumber] = { members: [] };
    }
    grouped[note.occurrenceNumber].notes = note.notes || undefined;
    grouped[note.occurrenceNumber].isSkipped = (note as TaskRotationOccurrenceNote).isSkipped || false;
    grouped[note.occurrenceNumber].isSpecial = (note as any).isSpecial || false;
    grouped[note.occurrenceNumber].specialName = (note as any).specialName || undefined;
    grouped[note.occurrenceNumber].specialDate = (note as any).specialDate || undefined;
  }

  return Object.entries(grouped)
    .map(([occurrenceNumber, data]) => ({
      occurrenceNumber: parseInt(occurrenceNumber),
      members: data.members.sort((a, b) => a.position - b.position),
      notes: data.notes,
      isSkipped: data.isSkipped || false,
      isSpecial: data.isSpecial || false,
      specialName: data.specialName,
      specialDate: data.specialDate,
    }))
    .sort((a, b) => a.occurrenceNumber - b.occurrenceNumber);
}

/**
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

  const [taskRecord] = await db.select({ dueDate: tasks.dueDate })
    .from(tasks)
    .where(eq(tasks.id, taskId))
    .limit(1);
  const activeDueDate = taskRecord?.dueDate ? new Date(taskRecord.dueDate) : null;
  if (activeDueDate) activeDueDate.setHours(0, 0, 0, 0);

  // Group by occurrence number
  const grouped: Record<number, { members: { position: number; memberId: number }[]; notes?: string; isSkipped?: boolean; isSpecial?: boolean; specialName?: string; occurrenceDate?: Date; specialDate?: Date; calculatedDate?: Date }> = {};
  
  for (const entry of scheduleEntries) {
    if (!grouped[entry.occurrenceNumber]) {
      grouped[entry.occurrenceNumber] = { members: [] };
    }
    grouped[entry.occurrenceNumber].members.push({
      position: entry.position,
      memberId: entry.memberId,
    });
  }

  // Add notes, skip status, and special occurrence data to grouped data
  // Also create entries for special appointments without members
  for (const note of notes) {
    const noteDate = note.occurrenceDate ? new Date(note.occurrenceDate) : null;
    if (noteDate) noteDate.setHours(0, 0, 0, 0);
    // Vergangene reguläre Terminnotizen gehören in den Verlauf. Werden sie
    // hier mit occurrenceNumber=1 gruppiert, könnten sie den aktuellen Plan
    // überschreiben, nachdem dueDate weitergeschoben wurde.
    if (noteDate && activeDueDate && noteDate < activeDueDate && !note.isSpecial) continue;
    if (!grouped[note.occurrenceNumber]) {
      // Create entry for special appointments or notes without members
      grouped[note.occurrenceNumber] = { members: [] };
    }
    grouped[note.occurrenceNumber].notes = note.notes || undefined;
    grouped[note.occurrenceNumber].isSkipped = (note as TaskRotationOccurrenceNote).isSkipped || false;
    grouped[note.occurrenceNumber].isSpecial = (note as any).isSpecial || false;
    grouped[note.occurrenceNumber].specialName = (note as any).specialName || undefined;
    grouped[note.occurrenceNumber].occurrenceDate = (note as any).occurrenceDate || undefined;
    grouped[note.occurrenceNumber].specialDate = (note as any).specialDate || undefined;
  }

  // Convert to array format
  const result = Object.entries(grouped).map(([occurrenceNumber, data]) => ({
    occurrenceNumber: parseInt(occurrenceNumber),
    members: data.members.sort((a, b) => a.position - b.position),
    notes: data.notes,
    isSkipped: data.isSkipped || false,
    isSpecial: data.isSpecial || false,
    specialName: data.specialName,
    occurrenceDate: data.occurrenceDate,
    specialDate: data.specialDate,
  }));

  // Ensure at least 3 occurrences are returned
  const minOccurrences = 3;
  if (result.length < minOccurrences) {
    const maxOccurrence = result.length > 0 ? Math.max(...result.map(r => r.occurrenceNumber)) : 0;
    for (let i = result.length; i < minOccurrences; i++) {
      result.push({
        occurrenceNumber: maxOccurrence + i + 1,
        members: [],
        notes: undefined,
        isSkipped: false,
        isSpecial: false,
        specialName: undefined,
        occurrenceDate: undefined,
        specialDate: undefined,
      });
    }
  }

  return result.sort((a, b) => a.occurrenceNumber - b.occurrenceNumber);
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
    isSkipped?: boolean;
    isSpecial?: boolean;
    specialName?: string;
    occurrenceDate?: Date;
    specialDate?: Date;
  }>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Schedule members are fully replaced. Datumstabile Terminnotizen bleiben
  // jedoch erhalten, damit vergangene Überspringungen nicht verloren gehen.
  await db.delete(taskRotationSchedule).where(eq(taskRotationSchedule.taskId, taskId));
  await db.delete(taskRotationOccurrenceNotes).where(
    and(eq(taskRotationOccurrenceNotes.taskId, taskId), isNull(taskRotationOccurrenceNotes.occurrenceDate)),
  );

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

    // Always use the isSkipped value from the passed schedule (never re-read from DB)
    // Re-reading from DB by occurrence number causes cascade bugs when occurrences are renumbered
    const isSkipped = occurrence.isSkipped ?? false;

    const noteData = {
      taskId,
      occurrenceNumber: occurrence.occurrenceNumber,
      occurrenceDate: occurrence.occurrenceDate || null,
      notes: occurrence.notes || "",
      isSkipped,
      isSpecial: occurrence.isSpecial || false,
      specialName: occurrence.specialName || null,
      specialDate: occurrence.specialDate || null,
    } as typeof taskRotationOccurrenceNotes.$inferInsert;

    if (occurrence.occurrenceDate) {
      const occurrenceDateKey = toOccurrenceDateKey(occurrence.occurrenceDate);
      const [result] = await db.execute(
        sql`SELECT id FROM task_rotation_occurrence_notes WHERE taskId = ${taskId} AND DATE(occurrenceDate) = ${occurrenceDateKey} LIMIT 1`,
      );
      const existing = (result as unknown as { id: number }[])[0];
      if (existing) {
        await db.update(taskRotationOccurrenceNotes)
          .set(noteData as any)
          .where(eq(taskRotationOccurrenceNotes.id, existing.id));
      } else {
        await db.insert(taskRotationOccurrenceNotes).values(noteData);
      }
    } else {
      await db.insert(taskRotationOccurrenceNotes).values(noteData);
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

  // Always insert a notes entry to ensure the occurrence is tracked
  await db.insert(taskRotationOccurrenceNotes).values({
    taskId,
    occurrenceNumber: newOccurrenceNumber,
    notes: notes || "",
  });

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

    // Always insert notes entry to preserve occurrence tracking
    await db.insert(taskRotationOccurrenceNotes).values({
      taskId,
      occurrenceNumber: newOccurrenceNumber,
      notes: occurrence.notes || "",
      isSkipped: occurrence.isSkipped || false,
      isSpecial: occurrence.isSpecial || false,
      specialName: occurrence.specialName || null,
      specialDate: occurrence.specialDate || null,
    } as typeof taskRotationOccurrenceNotes.$inferInsert);
  }

  return { success: true };
}

/**
 * Delete a specific occurrence from rotation schedule
 * Removes the occurrence and renumbers all following occurrences
 */
export async function deleteRotationOccurrence(taskId: number, occurrenceNumber: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get current schedule
  const currentSchedule = await getRotationSchedule(taskId);
  
  // Filter out the occurrence to delete and renumber
  const updatedSchedule = currentSchedule
    .filter(occ => occ.occurrenceNumber !== occurrenceNumber)
    .map((occ, index) => ({
      ...occ,
      occurrenceNumber: index + 1, // Renumber starting from 1
    }));

  // Replace entire schedule with updated version
  await setRotationSchedule(taskId, updatedSchedule);

  return { success: true };
}

/**
 * Skip/mark an occurrence as skipped without deleting it
 * Toggles the isSkipped status
 */
export async function skipRotationOccurrence(taskId: number, occurrenceNumber: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get current schedule to check if occurrence exists and get current skip status
  const currentSchedule = await getRotationSchedule(taskId);
  const occurrence = currentSchedule.find(occ => occ.occurrenceNumber === occurrenceNumber);
  
  if (!occurrence) throw new Error("Occurrence not found");

  // Toggle the skip status
  const newSkipStatus = !occurrence.isSkipped;

  // Check if note record exists
  const existingNote = await db.select()
    .from(taskRotationOccurrenceNotes)
    .where(
      and(
        eq(taskRotationOccurrenceNotes.taskId, taskId),
        eq(taskRotationOccurrenceNotes.occurrenceNumber, occurrenceNumber)
      )
    )
    .limit(1);

  if (existingNote.length > 0) {
    // Update existing record
    await db.update(taskRotationOccurrenceNotes)
      .set({ isSkipped: newSkipStatus } as Partial<typeof taskRotationOccurrenceNotes.$inferSelect>)
      .where(
        and(
          eq(taskRotationOccurrenceNotes.taskId, taskId),
          eq(taskRotationOccurrenceNotes.occurrenceNumber, occurrenceNumber)
        )
      );
  } else {
    // Create new record with skip status
    await db.insert(taskRotationOccurrenceNotes).values({
      taskId,
      occurrenceNumber,
      notes: occurrence.notes || "",
      isSkipped: newSkipStatus,
    } as typeof taskRotationOccurrenceNotes.$inferInsert);
  }

  return { success: true, isSkipped: newSkipStatus };
}

/**
 * Move an occurrence up or down in the schedule
 * Swaps positions with adjacent occurrence
 */
export async function moveRotationOccurrence(
  taskId: number,
  occurrenceNumber: number,
  direction: 'up' | 'down'
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get current schedule
  const currentSchedule = await getRotationSchedule(taskId);
  
  const currentIndex = currentSchedule.findIndex(occ => occ.occurrenceNumber === occurrenceNumber);
  if (currentIndex === -1) throw new Error("Occurrence not found");

  const swapIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
  
  // Check bounds
  if (swapIndex < 0 || swapIndex >= currentSchedule.length) {
    return { success: false, message: "Cannot move occurrence in that direction" };
  }

  // Swap the occurrences
  const temp = currentSchedule[currentIndex];
  currentSchedule[currentIndex] = currentSchedule[swapIndex];
  currentSchedule[swapIndex] = temp;

  // Renumber all occurrences sequentially
  const updatedSchedule = currentSchedule.map((occ, index) => ({
    ...occ,
    occurrenceNumber: index + 1,
  }));

  // Replace entire schedule with updated version
  await setRotationSchedule(taskId, updatedSchedule);

  return { success: true };
}

// ===== Cross-Household Inventory Functions =====

/**
 * Get all household IDs that are connected (accepted) to a given household
 */
export async function getConnectedHouseholdIds(householdId: number): Promise<number[]> {
  const db = await getDb();
  if (!db) return [];
  const connections = await db.select({
    requestingHouseholdId: householdConnections.requestingHouseholdId,
    targetHouseholdId: householdConnections.targetHouseholdId,
  })
    .from(householdConnections)
    .where(
      and(
        or(
          eq(householdConnections.requestingHouseholdId, householdId),
          eq(householdConnections.targetHouseholdId, householdId)
        ),
        eq(householdConnections.status, "accepted")
      )
    );
  return connections.map(c =>
    c.requestingHouseholdId === householdId ? c.targetHouseholdId : c.requestingHouseholdId
  );
}

/**
 * Get inventory items from connected households that are visible to the requesting household.
 * Returns items grouped by household with household name.
 */
export async function getSharedInventoryItems(requestingHouseholdId: number) {
  const db = await getDb();
  if (!db) return [];

  const connectedIds = await getConnectedHouseholdIds(requestingHouseholdId);
  if (connectedIds.length === 0) return [];

  // Get items with visibility = 'connected' from all connected households
  const connectedItems = await db.select({
    id: inventoryItems.id,
    householdId: inventoryItems.householdId,
    householdName: households.name,
    name: inventoryItems.name,
    details: inventoryItems.details,
    categoryId: inventoryItems.categoryId,
    categoryName: shoppingCategories.name,
    categoryColor: shoppingCategories.color,
    photoUrls: inventoryItems.photoUrls,
    ownershipType: inventoryItems.ownershipType,
    visibility: inventoryItems.visibility,
    createdAt: inventoryItems.createdAt,
  })
    .from(inventoryItems)
    .leftJoin(shoppingCategories, eq(inventoryItems.categoryId, shoppingCategories.id))
    .leftJoin(households, eq(inventoryItems.householdId, households.id))
    .where(
      and(
        inArray(inventoryItems.householdId, connectedIds),
        eq(inventoryItems.visibility, "connected")
      )
    )
    .orderBy(inventoryItems.householdId, desc(inventoryItems.createdAt));

  // Get items with visibility = 'selected' where requestingHouseholdId is in allowed list
  const selectedItems = await db.select({
    id: inventoryItems.id,
    householdId: inventoryItems.householdId,
    householdName: households.name,
    name: inventoryItems.name,
    details: inventoryItems.details,
    categoryId: inventoryItems.categoryId,
    categoryName: shoppingCategories.name,
    categoryColor: shoppingCategories.color,
    photoUrls: inventoryItems.photoUrls,
    ownershipType: inventoryItems.ownershipType,
    visibility: inventoryItems.visibility,
    createdAt: inventoryItems.createdAt,
  })
    .from(inventoryItems)
    .leftJoin(shoppingCategories, eq(inventoryItems.categoryId, shoppingCategories.id))
    .leftJoin(households, eq(inventoryItems.householdId, households.id))
    .innerJoin(
      inventoryItemAllowedHouseholds,
      and(
        eq(inventoryItemAllowedHouseholds.inventoryItemId, inventoryItems.id),
        eq(inventoryItemAllowedHouseholds.allowedHouseholdId, requestingHouseholdId)
      )
    )
    .where(
      and(
        inArray(inventoryItems.householdId, connectedIds),
        eq(inventoryItems.visibility, "selected")
      )
    )
    .orderBy(inventoryItems.householdId, desc(inventoryItems.createdAt));

  const allItems = [...connectedItems, ...selectedItems];

  // Deduplicate by id
  const seen = new Set<number>();
  const unique = allItems.filter(item => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });

  return unique;
}

/**
 * Set visibility for an inventory item and update allowed households list
 */
export async function setInventoryItemVisibility(data: {
  itemId: number;
  visibility: 'private' | 'connected' | 'selected';
  allowedHouseholdIds?: number[];
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(inventoryItems)
    .set({ visibility: data.visibility })
    .where(eq(inventoryItems.id, data.itemId));

  // Always clear existing allowed households
  await db.delete(inventoryItemAllowedHouseholds)
    .where(eq(inventoryItemAllowedHouseholds.inventoryItemId, data.itemId));

  // If 'selected', insert new allowed households
  if (data.visibility === 'selected' && data.allowedHouseholdIds && data.allowedHouseholdIds.length > 0) {
    await Promise.all(data.allowedHouseholdIds.map(hid =>
      db.insert(inventoryItemAllowedHouseholds).values({
        inventoryItemId: data.itemId,
        allowedHouseholdId: hid,
      })
    ));
  }

  return { success: true };
}

/**
 * Get allowed household IDs for a specific inventory item
 */
export async function getInventoryItemAllowedHouseholds(itemId: number): Promise<number[]> {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select({ allowedHouseholdId: inventoryItemAllowedHouseholds.allowedHouseholdId })
    .from(inventoryItemAllowedHouseholds)
    .where(eq(inventoryItemAllowedHouseholds.inventoryItemId, itemId));
  return rows.map(r => r.allowedHouseholdId);
}

/**
 * Calculate a deterministic occurrenceNumber for a repeatInterval task based on a date.
 * occurrenceNumber = 1 for dueDate, 2 for dueDate+interval, etc.
 * Returns null if the task has no dueDate or no repeatInterval.
 */
/** Convert a Date to a yyyy-MM-dd string using LOCAL date components.
 * The frontend sends dates as local yyyy-MM-dd strings (e.g. "2025-04-02"),
 * so we must use local date components on the server too for consistency.
 */
function toDateStr(d: Date): string {
  // Wall-clock strategy: use LOCAL components (normalizeDatetimeFromRawSQL gives local dates)
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Normalize a date to UTC midnight for day-level comparison.
 *
 * Drizzle ORM's datetime column:
 *   mapToDriverValue:   date.toISOString() → writes UTC string to MySQL
 *   mapFromDriverValue: new Date(value + 'Z') → reads as UTC Date
 *
 * Therefore all Date objects from the DB are UTC-based.
 * We must use getUTCFullYear/getUTCMonth/getUTCDate to extract the correct calendar date.
 */
function toUTCMidnight(d: Date | string): Date {
  if (typeof d === "string") {
    // yyyy-MM-dd string from frontend: treat as local midnight
    if (/^\d{4}-\d{2}-\d{2}$/.test(d)) {
      const [y, mo, day] = d.split("-").map(Number);
      return new Date(y, mo - 1, day, 0, 0, 0, 0);
    }
    // Other string (e.g. "2026-04-07 14:00:00"): parse without Z → local time
    const parsed = new Date(d.replace(' ', 'T'));
    return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate(), 0, 0, 0, 0);
  }
  // Date object: use LOCAL components (wall-clock strategy)
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

export function calcOccurrenceNumber(
  task: {
    dueDate?: Date | string | null;
    repeatInterval?: number | null;
    repeatUnit?: string | null;
    frequency?: string | null;
    customFrequencyDays?: number | null;
    monthlyRecurrenceMode?: string | null;
  },
  targetDate: Date | string
): number | null {
  if (!task.dueDate) return null;

  const unit = task.repeatUnit
    ?? (task.frequency === "daily" ? "days"
      : task.frequency === "weekly" ? "weeks"
      : task.frequency === "monthly" ? "months"
      : null);
  const interval = task.repeatInterval
    ?? (task.frequency === "custom" ? task.customFrequencyDays : 1)
    ?? 1;

  // Unregelmäßige Aufgaben bestehen aus expliziten Rotationsterminen. Es gibt
  // bewusst keine berechenbare Terminposition.
  if (!unit || unit === "irregular" || !Number.isFinite(interval) || interval < 1) return null;

  // Normalize both dates to local midnight for day-level comparison (wall-clock strategy)
  const due = toUTCMidnight(task.dueDate);
  const target = toUTCMidnight(targetDate);
  if (target.getTime() < due.getTime()) return null;

  const calendarDay = (date: Date) => Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000;

  if (unit === "days" || unit === "weeks") {
    const stepDays = interval * (unit === "weeks" ? 7 : 1);
    const elapsedDays = calendarDay(target) - calendarDay(due);
    return elapsedDays % stepDays === 0 ? (elapsedDays / stepDays) + 1 : null;
  }

  if (unit !== "months") return null;

  const elapsedMonths = (target.getFullYear() - due.getFullYear()) * 12
    + (target.getMonth() - due.getMonth());
  if (elapsedMonths < 0 || elapsedMonths % interval !== 0) return null;

  const targetYear = due.getFullYear() + Math.floor((due.getMonth() + elapsedMonths) / 12);
  const targetMonth = ((due.getMonth() + elapsedMonths) % 12 + 12) % 12;
  const daysInTargetMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
  let expectedDay: number;

  if (task.monthlyRecurrenceMode === "same_weekday") {
    const originalWeekday = due.getDay();
    const weekdayOccurrence = Math.ceil(due.getDate() / 7);
    const firstDayWeekday = new Date(targetYear, targetMonth, 1).getDay();
    const firstMatchingDay = 1 + ((originalWeekday - firstDayWeekday + 7) % 7);
    const candidateDay = firstMatchingDay + (weekdayOccurrence - 1) * 7;
    // Bei einem nicht vorhandenen fünften Wochentag wird, wie in dateUtils,
    // auf den vorherigen gleichartigen Wochentag zurückgefallen.
    expectedDay = candidateDay <= daysInTargetMonth ? candidateDay : candidateDay - 7;
  } else {
    expectedDay = Math.min(due.getDate(), daysInTargetMonth);
  }

  return target.getDate() === expectedDay ? (elapsedMonths / interval) + 1 : null;
}

/**
 * Upsert a note/skip entry for a specific occurrence (by occurrenceNumber).
 * Creates the record if it doesn't exist, updates it otherwise.
 */
export function toOccurrenceDateKey(value: Date | string): string {
  if (typeof value === "string") return value.slice(0, 10);
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Speichert eine Terminnotiz über das konkrete Kalenderdatum. Die Positions-
 * nummer bleibt für ältere Ansichten erhalten, ist für neue Einträge aber
 * nicht mehr der maßgebliche Schlüssel.
 */
export async function upsertOccurrenceNoteByDate(
  taskId: number,
  occurrenceDate: Date | string,
  occurrenceNumber: number,
  data: { notes?: string; isSkipped?: boolean },
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const dateKey = toOccurrenceDateKey(occurrenceDate);
  const [result] = await db.execute(
    sql`SELECT id FROM task_rotation_occurrence_notes WHERE taskId = ${taskId} AND DATE(occurrenceDate) = ${dateKey} LIMIT 1`,
  );
  const existing = (result as unknown as { id: number }[])[0];
  const updateData: Record<string, unknown> = {};
  if (data.notes !== undefined) updateData.notes = data.notes;
  if (data.isSkipped !== undefined) updateData.isSkipped = data.isSkipped;

  if (existing) {
    await db.update(taskRotationOccurrenceNotes)
      .set(updateData as any)
      .where(eq(taskRotationOccurrenceNotes.id, existing.id));
  } else {
    const [year, month, day] = dateKey.split("-").map(Number);
    await db.insert(taskRotationOccurrenceNotes).values({
      taskId,
      occurrenceNumber,
      // Mittagszeit verhindert eine unbeabsichtigte Verschiebung beim Lesen
      // in einer anderen Zeitzone; fachlich maßgeblich ist immer DATE(...).
      occurrenceDate: new Date(year, month - 1, day, 12, 0, 0),
      notes: data.notes ?? "",
      isSkipped: data.isSkipped ?? false,
    } as typeof taskRotationOccurrenceNotes.$inferInsert);
  }

  return { success: true };
}

export async function getSkippedOccurrenceDates(taskId: number): Promise<Set<string>> {
  const db = await getDb();
  if (!db) return new Set();
  const [result] = await db.execute(
    sql`SELECT DATE_FORMAT(occurrenceDate, '%Y-%m-%d') AS occurrenceDate FROM task_rotation_occurrence_notes WHERE taskId = ${taskId} AND isSkipped = 1 AND occurrenceDate IS NOT NULL`,
  );
  const rows = result as unknown as { occurrenceDate: string }[];
  return new Set(rows.map((row) => row.occurrenceDate));
}

export async function upsertOccurrenceNote(
  taskId: number,
  occurrenceNumber: number,
  data: { notes?: string; isSkipped?: boolean }
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const existing = await db.select()
    .from(taskRotationOccurrenceNotes)
    .where(
      and(
        eq(taskRotationOccurrenceNotes.taskId, taskId),
        eq(taskRotationOccurrenceNotes.occurrenceNumber, occurrenceNumber)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    const updateData: Record<string, unknown> = {};
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.isSkipped !== undefined) updateData.isSkipped = data.isSkipped;
    await db.update(taskRotationOccurrenceNotes)
      .set(updateData as any)
      .where(
        and(
          eq(taskRotationOccurrenceNotes.taskId, taskId),
          eq(taskRotationOccurrenceNotes.occurrenceNumber, occurrenceNumber)
        )
      );
  } else {
    await db.insert(taskRotationOccurrenceNotes).values({
      taskId,
      occurrenceNumber,
      notes: data.notes || "",
      isSkipped: data.isSkipped || false,
    } as typeof taskRotationOccurrenceNotes.$inferInsert);
  }

  return { success: true };
}

/**
 * Returns all occurrence numbers that are marked as skipped for a task.
 * This is the single source of truth for skip status (replaces skippedDates).
 */
export async function getSkippedOccurrenceNumbers(taskId: number): Promise<Set<number>> {
  const db = await getDb();
  if (!db) return new Set();

  const [result] = await db.execute(
    sql`SELECT occurrenceNumber FROM task_rotation_occurrence_notes WHERE taskId = ${taskId} AND isSkipped = 1`
  );
  const rows = result as unknown as { occurrenceNumber: number }[];
  return new Set(rows.map(r => r.occurrenceNumber));
}

/**
 * After advancing task.dueDate past a skipped occurrence, shift all occurrenceNotes
 * down by 1 so that occurrenceNumber stays relative to the new dueDate.
 * - Deletes the old occurrenceNumber=1 entry (the one that was just skipped/advanced past)
 * - Decrements all remaining entries by 1 (occurrenceNumber=2 → 1, 3 → 2, etc.)
 */
export async function shiftOccurrenceNotesDown(taskId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  // Delete the consumed entry (occurrenceNumber=1 – the one we just advanced past)
  await db.execute(
    sql`DELETE FROM task_rotation_occurrence_notes WHERE taskId = ${taskId} AND occurrenceNumber = 1`
  );
  // Shift all remaining entries down by 1
  await db.execute(
    sql`UPDATE task_rotation_occurrence_notes SET occurrenceNumber = occurrenceNumber - 1 WHERE taskId = ${taskId} AND occurrenceNumber > 1`
  );
}

/**
 * Clear all isSkipped=true entries up to and including a given occurrence number.
 * Called after completeTask to clean up consumed skip entries.
 */
export async function clearSkippedOccurrencesUpTo(taskId: number, maxOccurrenceNumber: number): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db.execute(
    sql`DELETE FROM task_rotation_occurrence_notes WHERE taskId = ${taskId} AND isSkipped = 1 AND occurrenceNumber <= ${maxOccurrenceNumber} AND (notes IS NULL OR notes = '') AND isSpecial = 0`
  );
}
