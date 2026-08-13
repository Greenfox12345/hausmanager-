CREATE TABLE `task_comments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`householdId` int NOT NULL,
	`taskId` int NOT NULL,
	`memberId` int NOT NULL,
	`content` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `task_comments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `notifications` ADD `dedupeKey` varchar(191);--> statement-breakpoint
ALTER TABLE `task_comments` ADD CONSTRAINT `task_comments_householdId_households_id_fk` FOREIGN KEY (`householdId`) REFERENCES `households`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `task_comments` ADD CONSTRAINT `task_comments_taskId_tasks_id_fk` FOREIGN KEY (`taskId`) REFERENCES `tasks`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `task_comments` ADD CONSTRAINT `task_comments_memberId_household_members_id_fk` FOREIGN KEY (`memberId`) REFERENCES `household_members`(`id`) ON DELETE cascade ON UPDATE no action;