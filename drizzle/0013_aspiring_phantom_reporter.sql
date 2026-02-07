CREATE TABLE `calendar_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`householdId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`startDate` timestamp NOT NULL,
	`endDate` timestamp,
	`eventType` enum('task','borrow_start','borrow_return','reminder','other') NOT NULL DEFAULT 'other',
	`icon` varchar(10),
	`relatedTaskId` int,
	`relatedBorrowId` int,
	`isCompleted` boolean NOT NULL DEFAULT false,
	`completedAt` timestamp,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `calendar_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `calendar_events` ADD CONSTRAINT `calendar_events_householdId_households_id_fk` FOREIGN KEY (`householdId`) REFERENCES `households`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `calendar_events` ADD CONSTRAINT `calendar_events_relatedTaskId_tasks_id_fk` FOREIGN KEY (`relatedTaskId`) REFERENCES `tasks`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `calendar_events` ADD CONSTRAINT `calendar_events_relatedBorrowId_borrow_requests_id_fk` FOREIGN KEY (`relatedBorrowId`) REFERENCES `borrow_requests`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `calendar_events` ADD CONSTRAINT `calendar_events_createdBy_household_members_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `household_members`(`id`) ON DELETE no action ON UPDATE no action;