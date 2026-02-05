CREATE TABLE `borrow_requests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`inventoryItemId` int NOT NULL,
	`borrowerHouseholdId` int NOT NULL,
	`borrowerMemberId` int NOT NULL,
	`ownerHouseholdId` int NOT NULL,
	`status` enum('pending','approved','active','completed','rejected','cancelled') NOT NULL DEFAULT 'pending',
	`startDate` timestamp NOT NULL,
	`endDate` timestamp NOT NULL,
	`requestMessage` text,
	`responseMessage` text,
	`approvedBy` int,
	`approvedAt` timestamp,
	`borrowedAt` timestamp,
	`returnedAt` timestamp,
	`calendarEventId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `borrow_requests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `borrow_requests` ADD CONSTRAINT `borrow_requests_inventoryItemId_inventory_items_id_fk` FOREIGN KEY (`inventoryItemId`) REFERENCES `inventory_items`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `borrow_requests` ADD CONSTRAINT `borrow_requests_borrowerHouseholdId_households_id_fk` FOREIGN KEY (`borrowerHouseholdId`) REFERENCES `households`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `borrow_requests` ADD CONSTRAINT `borrow_requests_borrowerMemberId_household_members_id_fk` FOREIGN KEY (`borrowerMemberId`) REFERENCES `household_members`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `borrow_requests` ADD CONSTRAINT `borrow_requests_ownerHouseholdId_households_id_fk` FOREIGN KEY (`ownerHouseholdId`) REFERENCES `households`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `borrow_requests` ADD CONSTRAINT `borrow_requests_approvedBy_household_members_id_fk` FOREIGN KEY (`approvedBy`) REFERENCES `household_members`(`id`) ON DELETE no action ON UPDATE no action;