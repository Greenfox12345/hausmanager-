CREATE TABLE `activity_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`householdId` int NOT NULL,
	`memberId` int NOT NULL,
	`activityType` enum('shopping','task','project','member','other') NOT NULL,
	`action` varchar(100) NOT NULL,
	`description` text NOT NULL,
	`relatedItemId` int,
	`comment` text,
	`photoUrl` text,
	`photoUrls` json,
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `activity_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `household_members` (
	`id` int AUTO_INCREMENT NOT NULL,
	`householdId` int NOT NULL,
	`userId` int,
	`memberName` varchar(255) NOT NULL,
	`passwordHash` text NOT NULL,
	`photoUrl` text,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `household_members_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `households` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`passwordHash` text NOT NULL,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `households_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`householdId` int NOT NULL,
	`memberId` int NOT NULL,
	`type` enum('task_assigned','task_due','task_completed','comment_added','reminder','general') NOT NULL,
	`title` varchar(255) NOT NULL,
	`message` text NOT NULL,
	`relatedTaskId` int,
	`relatedProjectId` int,
	`isRead` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `project_households` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`householdId` int NOT NULL,
	`joinedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `project_households_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `project_task_dependencies` (
	`id` int AUTO_INCREMENT NOT NULL,
	`taskId` int NOT NULL,
	`dependsOnTaskId` int NOT NULL,
	`dependencyType` enum('prerequisite','followup','parallel') NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `project_task_dependencies_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `project_tasks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`assignedTo` int,
	`dueDate` datetime,
	`isCompleted` boolean NOT NULL DEFAULT false,
	`completedBy` int,
	`completedAt` timestamp,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `project_tasks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `projects` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`startDate` datetime,
	`endDate` datetime,
	`status` enum('planning','active','completed','cancelled') NOT NULL DEFAULT 'planning',
	`isNeighborhoodProject` boolean NOT NULL DEFAULT false,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `projects_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `shopping_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`householdId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`category` enum('Lebensmittel','Haushalt','Pflege','Sonstiges') NOT NULL,
	`quantity` varchar(100),
	`notes` text,
	`isCompleted` boolean NOT NULL DEFAULT false,
	`addedBy` int NOT NULL,
	`completedBy` int,
	`completedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `shopping_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `task_dependencies` (
	`id` int AUTO_INCREMENT NOT NULL,
	`taskId` int NOT NULL,
	`dependsOnTaskId` int NOT NULL,
	`dependencyType` enum('prerequisite','followup') NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `task_dependencies_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `task_rotation_exclusions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`taskId` int NOT NULL,
	`memberId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `task_rotation_exclusions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tasks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`householdId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`assignedTo` int,
	`frequency` enum('once','daily','weekly','monthly','custom') NOT NULL DEFAULT 'once',
	`customFrequencyDays` int,
	`repeatInterval` int,
	`repeatUnit` enum('days','weeks','months'),
	`enableRotation` boolean NOT NULL DEFAULT false,
	`requiredPersons` int,
	`dueDate` datetime,
	`projectId` int,
	`isCompleted` boolean NOT NULL DEFAULT false,
	`completedBy` int,
	`completedAt` timestamp,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tasks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`openId` varchar(64) NOT NULL,
	`name` text,
	`email` varchar(320),
	`loginMethod` varchar(64),
	`role` enum('user','admin') NOT NULL DEFAULT 'user',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`lastSignedIn` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_openId_unique` UNIQUE(`openId`)
);
--> statement-breakpoint
ALTER TABLE `activity_history` ADD CONSTRAINT `activity_history_householdId_households_id_fk` FOREIGN KEY (`householdId`) REFERENCES `households`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `activity_history` ADD CONSTRAINT `activity_history_memberId_household_members_id_fk` FOREIGN KEY (`memberId`) REFERENCES `household_members`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `household_members` ADD CONSTRAINT `household_members_householdId_households_id_fk` FOREIGN KEY (`householdId`) REFERENCES `households`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `household_members` ADD CONSTRAINT `household_members_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `households` ADD CONSTRAINT `households_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_householdId_households_id_fk` FOREIGN KEY (`householdId`) REFERENCES `households`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_memberId_household_members_id_fk` FOREIGN KEY (`memberId`) REFERENCES `household_members`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `project_households` ADD CONSTRAINT `project_households_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `project_households` ADD CONSTRAINT `project_households_householdId_households_id_fk` FOREIGN KEY (`householdId`) REFERENCES `households`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `project_task_dependencies` ADD CONSTRAINT `project_task_dependencies_taskId_project_tasks_id_fk` FOREIGN KEY (`taskId`) REFERENCES `project_tasks`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `project_task_dependencies` ADD CONSTRAINT `project_task_dependencies_dependsOnTaskId_project_tasks_id_fk` FOREIGN KEY (`dependsOnTaskId`) REFERENCES `project_tasks`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `project_tasks` ADD CONSTRAINT `project_tasks_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `project_tasks` ADD CONSTRAINT `project_tasks_assignedTo_household_members_id_fk` FOREIGN KEY (`assignedTo`) REFERENCES `household_members`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `project_tasks` ADD CONSTRAINT `project_tasks_completedBy_household_members_id_fk` FOREIGN KEY (`completedBy`) REFERENCES `household_members`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `project_tasks` ADD CONSTRAINT `project_tasks_createdBy_household_members_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `household_members`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `projects` ADD CONSTRAINT `projects_createdBy_household_members_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `household_members`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `shopping_items` ADD CONSTRAINT `shopping_items_householdId_households_id_fk` FOREIGN KEY (`householdId`) REFERENCES `households`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `shopping_items` ADD CONSTRAINT `shopping_items_addedBy_household_members_id_fk` FOREIGN KEY (`addedBy`) REFERENCES `household_members`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `shopping_items` ADD CONSTRAINT `shopping_items_completedBy_household_members_id_fk` FOREIGN KEY (`completedBy`) REFERENCES `household_members`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `task_dependencies` ADD CONSTRAINT `task_dependencies_taskId_tasks_id_fk` FOREIGN KEY (`taskId`) REFERENCES `tasks`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `task_dependencies` ADD CONSTRAINT `task_dependencies_dependsOnTaskId_tasks_id_fk` FOREIGN KEY (`dependsOnTaskId`) REFERENCES `tasks`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `task_rotation_exclusions` ADD CONSTRAINT `task_rotation_exclusions_taskId_tasks_id_fk` FOREIGN KEY (`taskId`) REFERENCES `tasks`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `task_rotation_exclusions` ADD CONSTRAINT `task_rotation_exclusions_memberId_household_members_id_fk` FOREIGN KEY (`memberId`) REFERENCES `household_members`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tasks` ADD CONSTRAINT `tasks_householdId_households_id_fk` FOREIGN KEY (`householdId`) REFERENCES `households`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tasks` ADD CONSTRAINT `tasks_assignedTo_household_members_id_fk` FOREIGN KEY (`assignedTo`) REFERENCES `household_members`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tasks` ADD CONSTRAINT `tasks_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tasks` ADD CONSTRAINT `tasks_completedBy_household_members_id_fk` FOREIGN KEY (`completedBy`) REFERENCES `household_members`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tasks` ADD CONSTRAINT `tasks_createdBy_household_members_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `household_members`(`id`) ON DELETE no action ON UPDATE no action;