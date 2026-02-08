CREATE TABLE `household_connections` (
	`id` int AUTO_INCREMENT NOT NULL,
	`requestingHouseholdId` int NOT NULL,
	`targetHouseholdId` int NOT NULL,
	`status` enum('pending','accepted','rejected') NOT NULL DEFAULT 'pending',
	`requestedBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `household_connections_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `shared_tasks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`taskId` int NOT NULL,
	`householdId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `shared_tasks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `household_connections` ADD CONSTRAINT `household_connections_requestingHouseholdId_households_id_fk` FOREIGN KEY (`requestingHouseholdId`) REFERENCES `households`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `household_connections` ADD CONSTRAINT `household_connections_targetHouseholdId_households_id_fk` FOREIGN KEY (`targetHouseholdId`) REFERENCES `households`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `household_connections` ADD CONSTRAINT `household_connections_requestedBy_household_members_id_fk` FOREIGN KEY (`requestedBy`) REFERENCES `household_members`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `shared_tasks` ADD CONSTRAINT `shared_tasks_taskId_tasks_id_fk` FOREIGN KEY (`taskId`) REFERENCES `tasks`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `shared_tasks` ADD CONSTRAINT `shared_tasks_householdId_households_id_fk` FOREIGN KEY (`householdId`) REFERENCES `households`(`id`) ON DELETE cascade ON UPDATE no action;