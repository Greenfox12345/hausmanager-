CREATE TABLE `task_rotation_occurrence_notes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`taskId` int NOT NULL,
	`occurrenceNumber` int NOT NULL,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `task_rotation_occurrence_notes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `task_rotation_occurrence_notes` ADD CONSTRAINT `task_rotation_occurrence_notes_taskId_tasks_id_fk` FOREIGN KEY (`taskId`) REFERENCES `tasks`(`id`) ON DELETE cascade ON UPDATE no action;