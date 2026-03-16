CREATE TABLE `inventory_item_allowed_households` (
	`id` int AUTO_INCREMENT NOT NULL,
	`inventoryItemId` int NOT NULL,
	`allowedHouseholdId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `inventory_item_allowed_households_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `inventory_items` ADD `visibility` enum('private','connected','selected') DEFAULT 'private' NOT NULL;--> statement-breakpoint
ALTER TABLE `inventory_item_allowed_households` ADD CONSTRAINT `inventory_item_allowed_households_inventoryItemId_inventory_items_id_fk` FOREIGN KEY (`inventoryItemId`) REFERENCES `inventory_items`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `inventory_item_allowed_households` ADD CONSTRAINT `inventory_item_allowed_households_allowedHouseholdId_households_id_fk` FOREIGN KEY (`allowedHouseholdId`) REFERENCES `households`(`id`) ON DELETE cascade ON UPDATE no action;