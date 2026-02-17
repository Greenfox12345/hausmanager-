CREATE TABLE `task_rotation_schedule` (
	`id` int AUTO_INCREMENT NOT NULL,
	`taskId` int NOT NULL,
	`occurrenceNumber` int NOT NULL,
	`position` int NOT NULL,
	`memberId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `task_rotation_schedule_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `task_rotation_schedule` ADD CONSTRAINT `task_rotation_schedule_taskId_tasks_id_fk` FOREIGN KEY (`taskId`) REFERENCES `tasks`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `task_rotation_schedule` ADD CONSTRAINT `task_rotation_schedule_memberId_household_members_id_fk` FOREIGN KEY (`memberId`) REFERENCES `household_members`(`id`) ON DELETE set null ON UPDATE no action;