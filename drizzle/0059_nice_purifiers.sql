CREATE TABLE `task_variable_inputs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`householdId` int NOT NULL,
	`taskId` int NOT NULL,
	`projectId` int,
	`variableName` varchar(191) NOT NULL,
	`value` varchar(255) NOT NULL,
	`unit` varchar(64),
	`note` text,
	`photoUrls` json,
	`fileUrls` json,
	`recordedByMemberId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `task_variable_inputs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `tasks` ADD `variableInputNames` json;--> statement-breakpoint
ALTER TABLE `task_variable_inputs` ADD CONSTRAINT `task_variable_inputs_householdId_households_id_fk` FOREIGN KEY (`householdId`) REFERENCES `households`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `task_variable_inputs` ADD CONSTRAINT `task_variable_inputs_taskId_tasks_id_fk` FOREIGN KEY (`taskId`) REFERENCES `tasks`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `task_variable_inputs` ADD CONSTRAINT `task_variable_inputs_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `task_variable_inputs` ADD CONSTRAINT `task_variable_inputs_recordedByMemberId_household_members_id_fk` FOREIGN KEY (`recordedByMemberId`) REFERENCES `household_members`(`id`) ON DELETE cascade ON UPDATE no action;