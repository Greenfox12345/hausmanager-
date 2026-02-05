CREATE TABLE `borrow_guidelines` (
	`id` int AUTO_INCREMENT NOT NULL,
	`inventoryItemId` int NOT NULL,
	`instructionsText` text,
	`checklistItems` json,
	`photoRequirements` json,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `borrow_guidelines_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `borrow_return_photos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`borrowRequestId` int NOT NULL,
	`photoRequirementId` varchar(255),
	`photoUrl` text NOT NULL,
	`filename` varchar(255),
	`uploadedBy` int NOT NULL,
	`uploadedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `borrow_return_photos_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `borrow_guidelines` ADD CONSTRAINT `borrow_guidelines_inventoryItemId_inventory_items_id_fk` FOREIGN KEY (`inventoryItemId`) REFERENCES `inventory_items`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `borrow_guidelines` ADD CONSTRAINT `borrow_guidelines_createdBy_household_members_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `household_members`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `borrow_return_photos` ADD CONSTRAINT `borrow_return_photos_borrowRequestId_borrow_requests_id_fk` FOREIGN KEY (`borrowRequestId`) REFERENCES `borrow_requests`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `borrow_return_photos` ADD CONSTRAINT `borrow_return_photos_uploadedBy_household_members_id_fk` FOREIGN KEY (`uploadedBy`) REFERENCES `household_members`(`id`) ON DELETE no action ON UPDATE no action;