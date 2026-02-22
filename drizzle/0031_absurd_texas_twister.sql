CREATE TABLE `task_occurrence_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`taskId` int NOT NULL,
	`occurrenceNumber` int NOT NULL,
	`inventoryItemId` int NOT NULL,
	`borrowStartDate` datetime,
	`borrowEndDate` datetime,
	`borrowStatus` enum('pending','borrowed','returned','overdue') NOT NULL DEFAULT 'pending',
	`borrowRequestId` int,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `task_occurrence_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `task_occurrence_items` ADD CONSTRAINT `task_occurrence_items_taskId_tasks_id_fk` FOREIGN KEY (`taskId`) REFERENCES `tasks`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `task_occurrence_items` ADD CONSTRAINT `task_occurrence_items_inventoryItemId_inventory_items_id_fk` FOREIGN KEY (`inventoryItemId`) REFERENCES `inventory_items`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `task_occurrence_items` ADD CONSTRAINT `task_occurrence_items_borrowRequestId_borrow_requests_id_fk` FOREIGN KEY (`borrowRequestId`) REFERENCES `borrow_requests`(`id`) ON DELETE no action ON UPDATE no action;