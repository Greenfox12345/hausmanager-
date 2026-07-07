CREATE TABLE `item_units` (
	`id` int AUTO_INCREMENT NOT NULL,
	`householdId` int NOT NULL,
	`name` varchar(50) NOT NULL,
	`symbol` varchar(10),
	`sortOrder` int NOT NULL DEFAULT 0,
	`isDefault` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `item_units_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `inventory_items` ADD `quantity` decimal(10,3);--> statement-breakpoint
ALTER TABLE `inventory_items` ADD `unitId` int;--> statement-breakpoint
ALTER TABLE `shopping_items` ADD `quantity` decimal(10,3);--> statement-breakpoint
ALTER TABLE `shopping_items` ADD `unitId` int;--> statement-breakpoint
ALTER TABLE `item_units` ADD CONSTRAINT `item_units_householdId_households_id_fk` FOREIGN KEY (`householdId`) REFERENCES `households`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `inventory_items` ADD CONSTRAINT `inventory_items_unitId_item_units_id_fk` FOREIGN KEY (`unitId`) REFERENCES `item_units`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `shopping_items` ADD CONSTRAINT `shopping_items_unitId_item_units_id_fk` FOREIGN KEY (`unitId`) REFERENCES `item_units`(`id`) ON DELETE set null ON UPDATE no action;