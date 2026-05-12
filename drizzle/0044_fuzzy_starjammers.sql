CREATE TABLE `task_categories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`householdId` int NOT NULL,
	`name` varchar(100) NOT NULL,
	`color` varchar(7) NOT NULL DEFAULT '#6B7280',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `task_categories_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `task_category_assignments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`taskId` int NOT NULL,
	`categoryId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `task_category_assignments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `task_categories` ADD CONSTRAINT `task_categories_householdId_households_id_fk` FOREIGN KEY (`householdId`) REFERENCES `households`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `task_category_assignments` ADD CONSTRAINT `task_category_assignments_taskId_tasks_id_fk` FOREIGN KEY (`taskId`) REFERENCES `tasks`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `task_category_assignments` ADD CONSTRAINT `task_category_assignments_categoryId_task_categories_id_fk` FOREIGN KEY (`categoryId`) REFERENCES `task_categories`(`id`) ON DELETE cascade ON UPDATE no action;