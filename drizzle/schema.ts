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
 * Shopping items - household shopping list with categories
 */
export const shoppingItems = mysqlTable("shopping_items", {
  id: int("id").autoincrement().primaryKey(),
  householdId: int("householdId").notNull().references(() => households.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  category: mysqlEnum("category", ["Lebensmittel", "Haushalt", "Pflege", "Sonstiges"]).notNull(),
  quantity: varchar("quantity", { length: 100 }),
  notes: text("notes"),
  isCompleted: boolean("isCompleted").default(false).notNull(),
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
 */
export const tasks = mysqlTable("tasks", {
  id: int("id").autoincrement().primaryKey(),
  householdId: int("householdId").notNull().references(() => households.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  assignedTo: int("assignedTo").references(() => householdMembers.id),
  frequency: mysqlEnum("frequency", ["once", "daily", "weekly", "monthly", "custom"]).default("once").notNull(),
  customFrequencyDays: int("customFrequencyDays"),
  repeatInterval: int("repeatInterval"),
  repeatUnit: mysqlEnum("repeatUnit", ["days", "weeks", "months"]),
  enableRotation: boolean("enableRotation").default(false).notNull(),
  requiredPersons: int("requiredPersons"),
  dueDate: datetime("dueDate"),
  projectId: int("projectId").references(() => projects.id, { onDelete: "set null" }),
  isCompleted: boolean("isCompleted").default(false).notNull(),
  completedBy: int("completedBy").references(() => householdMembers.id),
  completedAt: timestamp("completedAt"),
  createdBy: int("createdBy").notNull().references(() => householdMembers.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Task = typeof tasks.$inferSelect;
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
 * Task dependencies - relationships between household tasks
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
 */
export const projects = mysqlTable("projects", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  startDate: datetime("startDate"),
  endDate: datetime("endDate"),
  status: mysqlEnum("status", ["planning", "active", "completed", "cancelled"]).default("planning").notNull(),
  isNeighborhoodProject: boolean("isNeighborhoodProject").default(false).notNull(),
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
 * Project tasks - tasks within projects with dependencies
 */
export const projectTasks = mysqlTable("project_tasks", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull().references(() => projects.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  assignedTo: int("assignedTo").references(() => householdMembers.id),
  dueDate: datetime("dueDate"),
  isCompleted: boolean("isCompleted").default(false).notNull(),
  completedBy: int("completedBy").references(() => householdMembers.id),
  completedAt: timestamp("completedAt"),
  createdBy: int("createdBy").notNull().references(() => householdMembers.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ProjectTask = typeof projectTasks.$inferSelect;
export type InsertProjectTask = typeof projectTasks.$inferInsert;

/**
 * Project task dependencies - relationships between project tasks
 */
export const projectTaskDependencies = mysqlTable("project_task_dependencies", {
  id: int("id").autoincrement().primaryKey(),
  taskId: int("taskId").notNull().references(() => projectTasks.id, { onDelete: "cascade" }),
  dependsOnTaskId: int("dependsOnTaskId").notNull().references(() => projectTasks.id, { onDelete: "cascade" }),
  dependencyType: mysqlEnum("dependencyType", ["prerequisite", "followup", "parallel"]).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ProjectTaskDependency = typeof projectTaskDependencies.$inferSelect;
export type InsertProjectTaskDependency = typeof projectTaskDependencies.$inferInsert;

/**
 * Activity history - comprehensive tracking of all actions
 */
export const activityHistory = mysqlTable("activity_history", {
  id: int("id").autoincrement().primaryKey(),
  householdId: int("householdId").notNull().references(() => households.id, { onDelete: "cascade" }),
  memberId: int("memberId").notNull().references(() => householdMembers.id),
  activityType: mysqlEnum("activityType", ["shopping", "task", "project", "member", "other"]).notNull(),
  action: varchar("action", { length: 100 }).notNull(),
  description: text("description").notNull(),
  relatedItemId: int("relatedItemId"),
  comment: text("comment"),
  photoUrl: text("photoUrl"),
  photoUrls: json("photoUrls").$type<string[]>(),
  metadata: json("metadata").$type<Record<string, any>>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ActivityHistory = typeof activityHistory.$inferSelect;
export type InsertActivityHistory = typeof activityHistory.$inferInsert;

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
  projectTasksAssigned: many(projectTasks, { relationName: "assignedTo" }),
  projectTasksCompleted: many(projectTasks, { relationName: "completedBy" }),
  projectTasksCreated: many(projectTasks, { relationName: "createdBy" }),
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
  projectTasks: many(projectTasks),
}));

export const projectTasksRelations = relations(projectTasks, ({ one, many }) => ({
  project: one(projects, {
    fields: [projectTasks.projectId],
    references: [projects.id],
  }),
  assignedMember: one(householdMembers, {
    fields: [projectTasks.assignedTo],
    references: [householdMembers.id],
  }),
  completedByMember: one(householdMembers, {
    fields: [projectTasks.completedBy],
    references: [householdMembers.id],
  }),
  createdByMember: one(householdMembers, {
    fields: [projectTasks.createdBy],
    references: [householdMembers.id],
  }),
  dependencies: many(projectTaskDependencies, { relationName: "taskDependencies" }),
  dependents: many(projectTaskDependencies, { relationName: "dependentTasks" }),
}));
