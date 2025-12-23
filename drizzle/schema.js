import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean, datetime, json } from "drizzle-orm/mysql-core";
import { relations } from "drizzle-orm";
/**
 * Core user table backing auth flow.
 */
export var users = mysqlTable("users", {
    id: int("id").autoincrement().primaryKey(),
    openId: varchar("openId", { length: 64 }).notNull().unique(),
    name: text("name"),
    email: varchar("email", { length: 320 }),
    loginMethod: varchar("loginMethod", { length: 64 }),
    role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
    lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});
/**
 * Households table - represents a family or group managing together
 */
export var households = mysqlTable("households", {
    id: int("id").autoincrement().primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    passwordHash: text("passwordHash").notNull(),
    createdBy: int("createdBy").notNull().references(function () { return users.id; }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
/**
 * Household members - users belonging to households with specific roles
 */
export var householdMembers = mysqlTable("household_members", {
    id: int("id").autoincrement().primaryKey(),
    householdId: int("householdId").notNull().references(function () { return households.id; }, { onDelete: "cascade" }),
    userId: int("userId").references(function () { return users.id; }, { onDelete: "cascade" }),
    memberName: varchar("memberName", { length: 255 }).notNull(),
    passwordHash: text("passwordHash").notNull(),
    photoUrl: text("photoUrl"),
    isActive: boolean("isActive").default(true).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
/**
 * Shopping items - household shopping list with categories
 */
export var shoppingItems = mysqlTable("shopping_items", {
    id: int("id").autoincrement().primaryKey(),
    householdId: int("householdId").notNull().references(function () { return households.id; }, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    category: mysqlEnum("category", ["Lebensmittel", "Haushalt", "Pflege", "Sonstiges"]).notNull(),
    quantity: varchar("quantity", { length: 100 }),
    notes: text("notes"),
    isCompleted: boolean("isCompleted").default(false).notNull(),
    addedBy: int("addedBy").notNull().references(function () { return householdMembers.id; }),
    completedBy: int("completedBy").references(function () { return householdMembers.id; }),
    completedAt: timestamp("completedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
/**
 * Tasks - household tasks with rotation and recurring schedules
 */
export var tasks = mysqlTable("tasks", {
    id: int("id").autoincrement().primaryKey(),
    householdId: int("householdId").notNull().references(function () { return households.id; }, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    assignedTo: int("assignedTo").references(function () { return householdMembers.id; }),
    frequency: mysqlEnum("frequency", ["once", "daily", "weekly", "monthly", "custom"]).default("once").notNull(),
    customFrequencyDays: int("customFrequencyDays"),
    repeatInterval: int("repeatInterval"),
    repeatUnit: mysqlEnum("repeatUnit", ["days", "weeks", "months"]),
    enableRotation: boolean("enableRotation").default(false).notNull(),
    requiredPersons: int("requiredPersons"),
    dueDate: datetime("dueDate"),
    projectId: int("projectId").references(function () { return projects.id; }, { onDelete: "set null" }),
    isCompleted: boolean("isCompleted").default(false).notNull(),
    completedBy: int("completedBy").references(function () { return householdMembers.id; }),
    completedAt: timestamp("completedAt"),
    createdBy: int("createdBy").notNull().references(function () { return householdMembers.id; }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
/**
 * Task rotation exclusions - members excluded from specific task rotations
 */
export var taskRotationExclusions = mysqlTable("task_rotation_exclusions", {
    id: int("id").autoincrement().primaryKey(),
    taskId: int("taskId").notNull().references(function () { return tasks.id; }, { onDelete: "cascade" }),
    memberId: int("memberId").notNull().references(function () { return householdMembers.id; }, { onDelete: "cascade" }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
});
/**
 * Task dependencies - relationships between household tasks
 */
export var taskDependencies = mysqlTable("task_dependencies", {
    id: int("id").autoincrement().primaryKey(),
    taskId: int("taskId").notNull().references(function () { return tasks.id; }, { onDelete: "cascade" }),
    dependsOnTaskId: int("dependsOnTaskId").notNull().references(function () { return tasks.id; }, { onDelete: "cascade" }),
    dependencyType: mysqlEnum("dependencyType", ["prerequisite", "followup"]).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
});
/**
 * Projects - multi-household collaborative projects
 */
export var projects = mysqlTable("projects", {
    id: int("id").autoincrement().primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    startDate: datetime("startDate"),
    endDate: datetime("endDate"),
    status: mysqlEnum("status", ["planning", "active", "completed", "cancelled"]).default("planning").notNull(),
    isNeighborhoodProject: boolean("isNeighborhoodProject").default(false).notNull(),
    createdBy: int("createdBy").notNull().references(function () { return householdMembers.id; }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
/**
 * Project households - households participating in a project
 */
export var projectHouseholds = mysqlTable("project_households", {
    id: int("id").autoincrement().primaryKey(),
    projectId: int("projectId").notNull().references(function () { return projects.id; }, { onDelete: "cascade" }),
    householdId: int("householdId").notNull().references(function () { return households.id; }, { onDelete: "cascade" }),
    joinedAt: timestamp("joinedAt").defaultNow().notNull(),
});
/**
 * Project tasks - tasks within projects with dependencies
 */
export var projectTasks = mysqlTable("project_tasks", {
    id: int("id").autoincrement().primaryKey(),
    projectId: int("projectId").notNull().references(function () { return projects.id; }, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    assignedTo: int("assignedTo").references(function () { return householdMembers.id; }),
    dueDate: datetime("dueDate"),
    isCompleted: boolean("isCompleted").default(false).notNull(),
    completedBy: int("completedBy").references(function () { return householdMembers.id; }),
    completedAt: timestamp("completedAt"),
    createdBy: int("createdBy").notNull().references(function () { return householdMembers.id; }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
/**
 * Project task dependencies - relationships between project tasks
 */
export var projectTaskDependencies = mysqlTable("project_task_dependencies", {
    id: int("id").autoincrement().primaryKey(),
    taskId: int("taskId").notNull().references(function () { return projectTasks.id; }, { onDelete: "cascade" }),
    dependsOnTaskId: int("dependsOnTaskId").notNull().references(function () { return projectTasks.id; }, { onDelete: "cascade" }),
    dependencyType: mysqlEnum("dependencyType", ["prerequisite", "followup", "parallel"]).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
});
/**
 * Activity history - comprehensive tracking of all actions
 */
export var activityHistory = mysqlTable("activity_history", {
    id: int("id").autoincrement().primaryKey(),
    householdId: int("householdId").notNull().references(function () { return households.id; }, { onDelete: "cascade" }),
    memberId: int("memberId").notNull().references(function () { return householdMembers.id; }),
    activityType: mysqlEnum("activityType", ["shopping", "task", "project", "member", "other"]).notNull(),
    action: varchar("action", { length: 100 }).notNull(),
    description: text("description").notNull(),
    relatedItemId: int("relatedItemId"),
    comment: text("comment"),
    photoUrl: text("photoUrl"),
    photoUrls: json("photoUrls").$type(),
    metadata: json("metadata").$type(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
});
/**
 * Relations for better query experience
 */
export var householdsRelations = relations(households, function (_a) {
    var many = _a.many, one = _a.one;
    return ({
        members: many(householdMembers),
        shoppingItems: many(shoppingItems),
        tasks: many(tasks),
        projectHouseholds: many(projectHouseholds),
        activityHistory: many(activityHistory),
        creator: one(users, {
            fields: [households.createdBy],
            references: [users.id],
        }),
    });
});
export var householdMembersRelations = relations(householdMembers, function (_a) {
    var one = _a.one, many = _a.many;
    return ({
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
    });
});
export var projectsRelations = relations(projects, function (_a) {
    var one = _a.one, many = _a.many;
    return ({
        creator: one(householdMembers, {
            fields: [projects.createdBy],
            references: [householdMembers.id],
        }),
        projectHouseholds: many(projectHouseholds),
        projectTasks: many(projectTasks),
    });
});
export var projectTasksRelations = relations(projectTasks, function (_a) {
    var one = _a.one, many = _a.many;
    return ({
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
    });
});
