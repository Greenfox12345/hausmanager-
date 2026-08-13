CREATE TABLE `plan_bag_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`snapshot` json NOT NULL,
	`createdAt` datetime NOT NULL,
	`updatedAt` datetime NOT NULL,
	CONSTRAINT `plan_bag_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `plan_bag_shares` (
	`id` int AUTO_INCREMENT NOT NULL,
	`bagItemId` int NOT NULL,
	`token` varchar(64) NOT NULL,
	`createdAt` datetime NOT NULL,
	`expiresAt` datetime,
	CONSTRAINT `plan_bag_shares_id` PRIMARY KEY(`id`),
	CONSTRAINT `plan_bag_shares_token_unique` UNIQUE(`token`)
);
--> statement-breakpoint
ALTER TABLE `plan_instance_shopping_items` MODIFY COLUMN `quantity` varchar(255);--> statement-breakpoint
ALTER TABLE `plan_template_shopping_items` MODIFY COLUMN `quantity` varchar(255);--> statement-breakpoint
ALTER TABLE `plan_template_task_items` ADD `phaseId` varchar(64);--> statement-breakpoint
ALTER TABLE `plan_templates` ADD `phases` json;--> statement-breakpoint
ALTER TABLE `projects` ADD `planTemplateId` int;--> statement-breakpoint
ALTER TABLE `projects` ADD `planPhases` json;--> statement-breakpoint
ALTER TABLE `projects` ADD `planVariables` json;--> statement-breakpoint
ALTER TABLE `projects` ADD `planShoppingItems` json;--> statement-breakpoint
ALTER TABLE `projects` ADD `planTaskItems` json;--> statement-breakpoint
ALTER TABLE `projects` ADD `enableVariables` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `task_rotation_occurrence_notes` ADD `occurrenceDate` datetime;--> statement-breakpoint
ALTER TABLE `plan_bag_shares` ADD CONSTRAINT `plan_bag_shares_bagItemId_plan_bag_items_id_fk` FOREIGN KEY (`bagItemId`) REFERENCES `plan_bag_items`(`id`) ON DELETE cascade ON UPDATE no action;