import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean, datetime, json } from "drizzle-orm/mysql-core";
import { relations } from "drizzle-orm";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).unique(),
  name: text("name").notNull(),
  email: varchar("email", { length: 320 }).unique(),
  passwordHash: text("passwordHash"),
  loginMethod: varchar("loginMethod", { length: 64 }).default("email").notNull(),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Households table - represents a family or group managing together
 */
export const households = mysqlTable("households", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  passwordHash: text("passwordHash"),
  inviteCode: varchar("inviteCode", { length: 20 }).unique(),
  createdBy: int("createdBy").notNull().references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Household = typeof households.$inferSelect;
export type InsertHousehold = typeof households.$inferInsert;

/**
 * Household members - users belonging to households with specific roles
 */
export const householdMembers = mysqlTable("household_members", {
  id: int("id").autoincrement().primaryKey(),
  householdId: int("householdId").notNull().references(() => households.id, { onDelete: "cascade" }),
  userId: int("userId").references(() => users.id, { onDelete: "cascade" }),
  memberName: varchar("memberName", { length: 255 }).notNull(),
  passwordHash: text("passwordHash"), // Nullable for new user-based auth system
  photoUrl: text("photoUrl"),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type HouseholdMember = typeof householdMembers.$inferSelect;
export type InsertHouseholdMember = typeof householdMembers.$inferInsert;

/**
 * Notifications table - stores in-app and push notifications for household members
 */
export const notificationPreferences = mysqlTable("notification_preferences", {
  id: int("id").primaryKey().autoincrement(),
  householdId: int("householdId").notNull(),
  memberId: int("memberId").notNull(),
  enableTaskAssigned: boolean("enableTaskAssigned").default(true),
  enableTaskDue: boolean("enableTaskDue").default(true),
  enableTaskCompleted: boolean("enableTaskCompleted").default(true),
  enableComments: boolean("enableComments").default(true),
  enableBrowserPush: boolean("enableBrowserPush").default(false),
  dndStartTime: varchar("dndStartTime", { length: 5 }),
  dndEndTime: varchar("dndEndTime", { length: 5 }),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow(),
});

export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  householdId: int("householdId").notNull().references(() => households.id, { onDelete: "cascade" }),
  memberId: int("memberId").notNull().references(() => householdMembers.id, { onDelete: "cascade" }),
  type: mysqlEnum("type", ["task_assigned", "task_due", "task_completed", "comment_added", "reminder", "general"]).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  relatedTaskId: int("relatedTaskId"),
  relatedProjectId: int("relatedProjectId"),
  isRead: boolean("isRead").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;

/**
 * Shopping categories - customizable categories for shopping items
 */
export const shoppingCategories = mysqlTable("shopping_categories", {
  id: int("id").autoincrement().primaryKey(),
  householdId: int("householdId").notNull().references(() => households.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 100 }).notNull(),
  color: varchar("color", { length: 7 }).default("#6B7280").notNull(), // Hex color code
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ShoppingCategory = typeof shoppingCategories.$inferSelect;
export type InsertShoppingCategory = typeof shoppingCategories.$inferInsert;

/**
 * Shopping items - household shopping list with categories
 */
export const shoppingItems = mysqlTable("shopping_items", {
  id: int("id").autoincrement().primaryKey(),
  householdId: int("householdId").notNull().references(() => households.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  categoryId: int("categoryId").notNull().references(() => shoppingCategories.id, { onDelete: "restrict" }),
  details: varchar("details", { length: 100 }),
  photoUrls: json("photoUrls").$type<string[] | {url: string, filename: string}[]>().default([]),
  notes: text("notes"),
  isCompleted: boolean("isCompleted").default(false).notNull(),
  taskId: int("taskId").references(() => tasks.id, { onDelete: "set null" }),
  addedBy: int("addedBy").notNull().references(() => householdMembers.id),
  completedBy: int("completedBy").references(() => householdMembers.id),
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ShoppingItem = typeof shoppingItems.$inferSelect;
export type InsertShoppingItem = typeof shoppingItems.$inferInsert;

/**
 * Tasks - household tasks with rotation and recurring schedules
 * Tasks can be linked to multiple projects via projectIds JSON array
 */
export const tasks = mysqlTable("tasks", {
  id: int("id").autoincrement().primaryKey(),
  householdId: int("householdId").notNull().references(() => households.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  assignedTo: json("assignedTo").$type<number[]>(), // Array of household member IDs
  frequency: mysqlEnum("frequency", ["once", "daily", "weekly", "monthly", "custom"]).default("once").notNull(),
  customFrequencyDays: int("customFrequencyDays"),
  repeatInterval: int("repeatInterval"),
  repeatUnit: mysqlEnum("repeatUnit", ["days", "weeks", "months", "irregular"]),
  irregularRecurrence: boolean("irregularRecurrence").default(false), // If true, rotation shows "Termin 1", "Termin 2" instead of dates
  monthlyRecurrenceMode: mysqlEnum("monthlyRecurrenceMode", ["same_date", "same_weekday"]).default("same_date"), // For monthly tasks: repeat on same date (15th) or same weekday (3rd Thursday)
  monthlyWeekday: int("monthlyWeekday"), // 0-6 (Sunday-Saturday) for same_weekday mode
  monthlyOccurrence: int("monthlyOccurrence"), // 1-5 (1st, 2nd, 3rd, 4th, 5th/last) for same_weekday mode
  enableRotation: boolean("enableRotation").default(false).notNull(),
  requiredPersons: int("requiredPersons"),
  dueDate: datetime("dueDate"),
  durationDays: int("durationDays").default(0), // Duration in days
  durationMinutes: int("durationMinutes").default(0), // Duration in minutes (0-1439, max 23:59)
  projectIds: json("projectIds").$type<number[]>(),
  isCompleted: boolean("isCompleted").default(false).notNull(),
  completedBy: int("completedBy").references(() => householdMembers.id),
  completedAt: timestamp("completedAt"),
  completionPhotoUrls: json("completionPhotoUrls").$type<{url: string, filename: string}[]>(),
  completionFileUrls: json("completionFileUrls").$type<{url: string, filename: string}[]>(),
  skippedDates: json("skippedDates").$type<string[]>(), // ISO date strings of skipped occurrences for recurring tasks
  sharedHouseholdIds: json("sharedHouseholdIds").$type<number[]>(), // IDs of households this task is shared with
  nonResponsiblePermission: mysqlEnum("nonResponsiblePermission", ["full", "milestones_reminders", "view_only"]).default("full").notNull(), // Permission level for non-responsible members
  createdBy: int("createdBy").notNull().references(() => householdMembers.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Task = typeof tasks.$inferSelect; // Includes monthlyRecurrenceMode field
export type InsertTask = typeof tasks.$inferInsert;

/**
 * Task rotation exclusions - members excluded from specific task rotations
 */
export const taskRotationExclusions = mysqlTable("task_rotation_exclusions", {
  id: int("id").autoincrement().primaryKey(),
  taskId: int("taskId").notNull().references(() => tasks.id, { onDelete: "cascade" }),
  memberId: int("memberId").notNull().references(() => householdMembers.id, { onDelete: "cascade" }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type TaskRotationExclusion = typeof taskRotationExclusions.$inferSelect;
export type InsertTaskRotationExclusion = typeof taskRotationExclusions.$inferInsert;

/**
 * Task rotation schedule - pre-planned assignments for recurring tasks with rotation
 * Stores which members are assigned to which future occurrence of a rotating task
 */
export const taskRotationSchedule = mysqlTable("task_rotation_schedule", {
  id: int("id").autoincrement().primaryKey(),
  taskId: int("taskId").notNull().references(() => tasks.id, { onDelete: "cascade" }),
  occurrenceNumber: int("occurrenceNumber").notNull(), // 1 = next occurrence, 2 = second occurrence, etc.
  position: int("position").notNull(), // 1 = first person, 2 = second person (for requiredPersons > 1)
  memberId: int("memberId").notNull().references(() => householdMembers.id, { onDelete: "cascade" }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type TaskRotationSchedule = typeof taskRotationSchedule.$inferSelect;
export type InsertTaskRotationSchedule = typeof taskRotationSchedule.$inferInsert;

/**
 * Task rotation occurrence notes - notes for specific occurrences of rotating tasks
 * One note per occurrence, shared across all positions/members
 */
export const taskRotationOccurrenceNotes = mysqlTable("task_rotation_occurrence_notes", {
  id: int("id").autoincrement().primaryKey(),
  taskId: int("taskId").notNull().references(() => tasks.id, { onDelete: "cascade" }),
  occurrenceNumber: int("occurrenceNumber").notNull(), // 1 = next occurrence, 2 = second occurrence, etc.
  notes: text("notes"),
  isSkipped: boolean("isSkipped").default(false).notNull(), // Toggle for skipped status
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type TaskRotationOccurrenceNote = typeof taskRotationOccurrenceNotes.$inferSelect & { isSkipped: boolean };
export type InsertTaskRotationOccurrenceNote = typeof taskRotationOccurrenceNotes.$inferInsert & { isSkipped?: boolean };

/**
 * Task dependencies - relationships between household tasks
 * Used for both regular tasks and project-linked tasks
 */
export const taskDependencies = mysqlTable("task_dependencies", {
  id: int("id").autoincrement().primaryKey(),
  taskId: int("taskId").notNull().references(() => tasks.id, { onDelete: "cascade" }),
  dependsOnTaskId: int("dependsOnTaskId").notNull().references(() => tasks.id, { onDelete: "cascade" }),
  dependencyType: mysqlEnum("dependencyType", ["prerequisite", "followup"]).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type TaskDependency = typeof taskDependencies.$inferSelect;
export type InsertTaskDependency = typeof taskDependencies.$inferInsert;

/**
 * Projects - multi-household collaborative projects
 * Tasks are linked to projects via tasks.projectIds JSON array
 */
export const projects = mysqlTable("projects", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  startDate: datetime("startDate"),
  endDate: datetime("endDate"),
  status: mysqlEnum("status", ["planning", "active", "completed", "cancelled"]).default("planning").notNull(),
  isNeighborhoodProject: boolean("isNeighborhoodProject").default(false).notNull(),
  isArchived: boolean("isArchived").default(false).notNull(),
  createdBy: int("createdBy").notNull().references(() => householdMembers.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Project = typeof projects.$inferSelect;
export type InsertProject = typeof projects.$inferInsert;

/**
 * Project households - households participating in a project
 */
export const projectHouseholds = mysqlTable("project_households", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull().references(() => projects.id, { onDelete: "cascade" }),
  householdId: int("householdId").notNull().references(() => households.id, { onDelete: "cascade" }),
  joinedAt: timestamp("joinedAt").defaultNow().notNull(),
});

export type ProjectHousehold = typeof projectHouseholds.$inferSelect;
export type InsertProjectHousehold = typeof projectHouseholds.$inferInsert;

/**
 * Inventory items - household inventory management
 */
export const inventoryItems = mysqlTable("inventory_items", {
  id: int("id").autoincrement().primaryKey(),
  householdId: int("householdId").notNull().references(() => households.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  details: text("details"),
  categoryId: int("categoryId").notNull().references(() => shoppingCategories.id, { onDelete: "restrict" }),
  photoUrls: json("photoUrls").$type<string[] | {url: string, filename: string}[]>().default([]),
  ownershipType: mysqlEnum("ownershipType", ["personal", "household"]).default("household").notNull(),
  createdBy: int("createdBy").notNull().references(() => householdMembers.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type InventoryItem = typeof inventoryItems.$inferSelect;
export type InsertInventoryItem = typeof inventoryItems.$inferInsert;

/**
 * Inventory ownership - tracks personal ownership of inventory items
 */
export const inventoryOwnership = mysqlTable("inventory_ownership", {
  id: int("id").autoincrement().primaryKey(),
  inventoryItemId: int("inventoryItemId").notNull().references(() => inventoryItems.id, { onDelete: "cascade" }),
  memberId: int("memberId").notNull().references(() => householdMembers.id, { onDelete: "cascade" }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type InventoryOwnership = typeof inventoryOwnership.$inferSelect;
export type InsertInventoryOwnership = typeof inventoryOwnership.$inferInsert;

/**
 * Activity history for tracking actions across the household
 */
export const activityHistory = mysqlTable("activity_history", {
  id: int("id").autoincrement().primaryKey(),
  householdId: int("householdId").notNull().references(() => households.id, { onDelete: "cascade" }),
  memberId: int("memberId").notNull().references(() => householdMembers.id),
  activityType: mysqlEnum("activityType", ["shopping", "task", "project", "member", "inventory", "other"]).notNull(),
  action: varchar("action", { length: 100 }).notNull(),
  description: text("description").notNull(),
  relatedItemId: int("relatedItemId"),
  comment: text("comment"),
  photoUrl: text("photoUrl"),
  photoUrls: json("photoUrls").$type<string[] | {url: string, filename: string}[]>(),
  fileUrls: json("fileUrls").$type<string[] | {url: string, filename: string}[]>(),
  metadata: json("metadata").$type<Record<string, any>>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ActivityHistory = typeof activityHistory.$inferSelect;
export type InsertActivityHistory = typeof activityHistory.$inferInsert;

/**
 * Borrow requests for inventory items
 * Supports both household-internal and future cross-household borrowing
 */
export const borrowRequests = mysqlTable("borrow_requests", {
  id: int("id").autoincrement().primaryKey(),
  inventoryItemId: int("inventoryItemId").notNull().references(() => inventoryItems.id, { onDelete: "cascade" }),
  borrowerHouseholdId: int("borrowerHouseholdId").notNull().references(() => households.id),
  borrowerMemberId: int("borrowerMemberId").notNull().references(() => householdMembers.id),
  ownerHouseholdId: int("ownerHouseholdId").notNull().references(() => households.id),
  status: mysqlEnum("status", ["pending", "approved", "active", "completed", "rejected", "cancelled"]).default("pending").notNull(),
  startDate: timestamp("startDate").notNull(),
  endDate: timestamp("endDate").notNull(),
  requestMessage: text("requestMessage"),
  responseMessage: text("responseMessage"),
  approvedBy: int("approvedBy").references(() => householdMembers.id),
  approvedAt: timestamp("approvedAt"),
  borrowedAt: timestamp("borrowedAt"), // When item was actually picked up
  returnedAt: timestamp("returnedAt"), // When item was actually returned
  calendarEventId: int("calendarEventId"), // Link to calendar event (future)
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type BorrowRequest = typeof borrowRequests.$inferSelect;
export type InsertBorrowRequest = typeof borrowRequests.$inferInsert;

/**
 * Calendar events - for tasks, borrows, and other scheduled activities
 */
export const calendarEvents = mysqlTable("calendar_events", {
  id: int("id").autoincrement().primaryKey(),
  householdId: int("householdId").notNull().references(() => households.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  startDate: timestamp("startDate").notNull(),
  endDate: timestamp("endDate"),
  eventType: mysqlEnum("eventType", ["task", "borrow_start", "borrow_return", "reminder", "other"]).default("other").notNull(),
  icon: varchar("icon", { length: 10 }), // Emoji icon for visual distinction
  relatedTaskId: int("relatedTaskId").references(() => tasks.id, { onDelete: "cascade" }),
  relatedBorrowId: int("relatedBorrowId").references(() => borrowRequests.id, { onDelete: "cascade" }),
  isCompleted: boolean("isCompleted").default(false).notNull(),
  completedAt: timestamp("completedAt"),
  createdBy: int("createdBy").notNull().references(() => householdMembers.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CalendarEvent = typeof calendarEvents.$inferSelect;
export type InsertCalendarEvent = typeof calendarEvents.$inferInsert;

/**
 * Borrow guidelines for inventory items
 * Defines rules, checklists, and photo requirements for borrowing
 */
export const borrowGuidelines = mysqlTable("borrow_guidelines", {
  id: int("id").autoincrement().primaryKey(),
  inventoryItemId: int("inventoryItemId").notNull().references(() => inventoryItems.id, { onDelete: "cascade" }),
  instructionsText: text("instructionsText"), // Free-text instructions (e.g., "Vollgetankt zurückgeben")
  checklistItems: json("checklistItems").$type<Array<{id: string, label: string, required: boolean}>>(), // Checklist items as JSON
  photoRequirements: json("photoRequirements").$type<Array<{id: string, label: string, examplePhotoUrl?: string, required: boolean}>>(), // Photo requirements with optional example
  createdBy: int("createdBy").notNull().references(() => householdMembers.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type BorrowGuideline = typeof borrowGuidelines.$inferSelect;
export type InsertBorrowGuideline = typeof borrowGuidelines.$inferInsert;

/**
 * Photos taken during borrow return process
 * Links to borrow request and guideline photo requirement
 */
export const borrowReturnPhotos = mysqlTable("borrow_return_photos", {
  id: int("id").autoincrement().primaryKey(),
  borrowRequestId: int("borrowRequestId").notNull().references(() => borrowRequests.id, { onDelete: "cascade" }),
  photoRequirementId: varchar("photoRequirementId", { length: 255 }), // ID from borrowGuidelines.photoRequirements
  photoUrl: text("photoUrl").notNull(),
  filename: varchar("filename", { length: 255 }),
  uploadedBy: int("uploadedBy").notNull().references(() => householdMembers.id),
  uploadedAt: timestamp("uploadedAt").defaultNow().notNull(),
});

export type BorrowReturnPhoto = typeof borrowReturnPhotos.$inferSelect;
export type InsertBorrowReturnPhoto = typeof borrowReturnPhotos.$inferInsert;

/**
 * Relations for better query experience
 */
export const householdsRelations = relations(households, ({ many, one }) => ({
  members: many(householdMembers),
  shoppingItems: many(shoppingItems),
  tasks: many(tasks),
  projectHouseholds: many(projectHouseholds),
  activityHistory: many(activityHistory),
  creator: one(users, {
    fields: [households.createdBy],
    references: [users.id],
  }),
}));

export const householdMembersRelations = relations(householdMembers, ({ one, many }) => ({
  household: one(households, {
    fields: [householdMembers.householdId],
    references: [households.id],
  }),
  user: one(users, {
    fields: [householdMembers.userId],
    references: [users.id],
  }),
  shoppingItemsAdded: many(shoppingItems, { relationName: "addedBy" }),
  shoppingItemsCompleted: many(shoppingItems, { relationName: "completedBy" }),
  tasksAssigned: many(tasks, { relationName: "assignedTo" }),
  tasksCompleted: many(tasks, { relationName: "completedBy" }),
  tasksCreated: many(tasks, { relationName: "createdBy" }),
  projectsCreated: many(projects),
  activityHistory: many(activityHistory),
  taskRotationExclusions: many(taskRotationExclusions),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  creator: one(householdMembers, {
    fields: [projects.createdBy],
    references: [householdMembers.id],
  }),
  projectHouseholds: many(projectHouseholds),
}));


/**
 * Household connections - represents relationships between households (neighborhood network)
 * Status: pending (invitation sent), accepted (connected), rejected
 */
export const householdConnections = mysqlTable("household_connections", {
  id: int("id").autoincrement().primaryKey(),
  requestingHouseholdId: int("requestingHouseholdId").notNull().references(() => households.id, { onDelete: "cascade" }),
  targetHouseholdId: int("targetHouseholdId").notNull().references(() => households.id, { onDelete: "cascade" }),
  status: mysqlEnum("status", ["pending", "accepted", "rejected"]).default("pending").notNull(),
  requestedBy: int("requestedBy").notNull().references(() => householdMembers.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type HouseholdConnection = typeof householdConnections.$inferSelect;
export type InsertHouseholdConnection = typeof householdConnections.$inferInsert;

/**
 * Shared tasks - links tasks to multiple households for cross-household collaboration
 */
export const sharedTasks = mysqlTable("shared_tasks", {
  id: int("id").autoincrement().primaryKey(),
  taskId: int("taskId").notNull().references(() => tasks.id, { onDelete: "cascade" }),
  householdId: int("householdId").notNull().references(() => households.id, { onDelete: "cascade" }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type SharedTask = typeof sharedTasks.$inferSelect;
export type InsertSharedTask = typeof sharedTasks.$inferInsert;

/**
 * Relations for household connections
 */
export const householdConnectionsRelations = relations(householdConnections, ({ one }) => ({
  requestingHousehold: one(households, {
    fields: [householdConnections.requestingHouseholdId],
    references: [households.id],
    relationName: "requestingHousehold",
  }),
  targetHousehold: one(households, {
    fields: [householdConnections.targetHouseholdId],
    references: [households.id],
    relationName: "targetHousehold",
  }),
  requester: one(householdMembers, {
    fields: [householdConnections.requestedBy],
    references: [householdMembers.id],
  }),
}));

/**
 * Relations for shared tasks
 */
export const sharedTasksRelations = relations(sharedTasks, ({ one }) => ({
  task: one(tasks, {
    fields: [sharedTasks.taskId],
    references: [tasks.id],
  }),
  household: one(households, {
    fields: [sharedTasks.householdId],
    references: [households.id],
  }),
}));
