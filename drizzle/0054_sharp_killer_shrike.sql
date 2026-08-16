CREATE TABLE `task_change_proposals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`householdId` int NOT NULL,
	`taskId` int NOT NULL,
	`proposedByMemberId` int NOT NULL,
	`proposalType` enum('update','complete','delete') NOT NULL,
	`payload` json NOT NULL,
	`note` text,
	`status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
	`reviewedByMemberId` int,
	`reviewNote` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`reviewedAt` timestamp,
	CONSTRAINT `task_change_proposals_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `task_change_proposals` ADD CONSTRAINT `task_change_proposals_householdId_households_id_fk` FOREIGN KEY (`householdId`) REFERENCES `households`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `task_change_proposals` ADD CONSTRAINT `task_change_proposals_taskId_tasks_id_fk` FOREIGN KEY (`taskId`) REFERENCES `tasks`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `task_change_proposals` ADD CONSTRAINT `task_change_proposals_proposedByMemberId_household_members_id_fk` FOREIGN KEY (`proposedByMemberId`) REFERENCES `household_members`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `task_change_proposals` ADD CONSTRAINT `task_change_proposals_reviewedByMemberId_household_members_id_fk` FOREIGN KEY (`reviewedByMemberId`) REFERENCES `household_members`(`id`) ON DELETE set null ON UPDATE no action;