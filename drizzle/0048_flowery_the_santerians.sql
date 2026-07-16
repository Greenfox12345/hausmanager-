CREATE TABLE `plan_instance_shopping_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`instanceId` int NOT NULL,
	`templateItemId` int,
	`name` varchar(255) NOT NULL,
	`categoryId` int,
	`quantity` decimal(10,3),
	`unitId` int,
	`notes` text,
	`sortOrder` int NOT NULL DEFAULT 0,
	`isTransferred` boolean NOT NULL DEFAULT false,
	`shoppingItemId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `plan_instance_shopping_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `plan_template_instances` (
	`id` int AUTO_INCREMENT NOT NULL,
	`templateId` int NOT NULL,
	`householdId` int NOT NULL,
	`startedByMemberId` int,
	`label` varchar(255),
	`status` enum('active','completed','cancelled') NOT NULL DEFAULT 'active',
	`startedAt` timestamp NOT NULL DEFAULT (now()),
	`completedAt` timestamp,
	CONSTRAINT `plan_template_instances_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `plan_template_shopping_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`templateId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`categoryId` int,
	`quantity` decimal(10,3),
	`unitId` int,
	`notes` text,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `plan_template_shopping_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `plan_templates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`householdId` int NOT NULL,
	`createdByMemberId` int,
	`name` varchar(255) NOT NULL,
	`description` text,
	`type` enum('shopping','tasks','project','mixed') NOT NULL DEFAULT 'shopping',
	`tags` json DEFAULT ('[]'),
	`usageCount` int NOT NULL DEFAULT 0,
	`lastUsedAt` timestamp,
	`isArchived` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `plan_templates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `plan_instance_shopping_items` ADD CONSTRAINT `plan_instance_shopping_items_instanceId_plan_template_instances_id_fk` FOREIGN KEY (`instanceId`) REFERENCES `plan_template_instances`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `plan_instance_shopping_items` ADD CONSTRAINT `plan_instance_shopping_items_templateItemId_plan_template_shopping_items_id_fk` FOREIGN KEY (`templateItemId`) REFERENCES `plan_template_shopping_items`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `plan_instance_shopping_items` ADD CONSTRAINT `plan_instance_shopping_items_categoryId_shopping_categories_id_fk` FOREIGN KEY (`categoryId`) REFERENCES `shopping_categories`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `plan_instance_shopping_items` ADD CONSTRAINT `plan_instance_shopping_items_unitId_item_units_id_fk` FOREIGN KEY (`unitId`) REFERENCES `item_units`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `plan_instance_shopping_items` ADD CONSTRAINT `plan_instance_shopping_items_shoppingItemId_shopping_items_id_fk` FOREIGN KEY (`shoppingItemId`) REFERENCES `shopping_items`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `plan_template_instances` ADD CONSTRAINT `plan_template_instances_templateId_plan_templates_id_fk` FOREIGN KEY (`templateId`) REFERENCES `plan_templates`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `plan_template_instances` ADD CONSTRAINT `plan_template_instances_householdId_households_id_fk` FOREIGN KEY (`householdId`) REFERENCES `households`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `plan_template_instances` ADD CONSTRAINT `plan_template_instances_startedByMemberId_household_members_id_fk` FOREIGN KEY (`startedByMemberId`) REFERENCES `household_members`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `plan_template_shopping_items` ADD CONSTRAINT `plan_template_shopping_items_templateId_plan_templates_id_fk` FOREIGN KEY (`templateId`) REFERENCES `plan_templates`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `plan_template_shopping_items` ADD CONSTRAINT `plan_template_shopping_items_categoryId_shopping_categories_id_fk` FOREIGN KEY (`categoryId`) REFERENCES `shopping_categories`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `plan_template_shopping_items` ADD CONSTRAINT `plan_template_shopping_items_unitId_item_units_id_fk` FOREIGN KEY (`unitId`) REFERENCES `item_units`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `plan_templates` ADD CONSTRAINT `plan_templates_householdId_households_id_fk` FOREIGN KEY (`householdId`) REFERENCES `households`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `plan_templates` ADD CONSTRAINT `plan_templates_createdByMemberId_household_members_id_fk` FOREIGN KEY (`createdByMemberId`) REFERENCES `household_members`(`id`) ON DELETE set null ON UPDATE no action;