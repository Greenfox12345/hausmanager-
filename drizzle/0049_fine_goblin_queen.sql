CREATE TABLE `plan_instance_task_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`instanceId` int NOT NULL,
	`templateItemId` int,
	`name` varchar(255) NOT NULL,
	`description` text,
	`assignedToMemberIds` json,
	`dueDaysFromStart` int,
	`frequency` enum('once','daily','weekly','monthly','custom') NOT NULL DEFAULT 'once',
	`customFrequencyDays` int,
	`repeatInterval` int,
	`repeatUnit` enum('days','weeks','months','irregular'),
	`durationDays` int DEFAULT 0,
	`durationMinutes` int DEFAULT 0,
	`enableRotation` boolean NOT NULL DEFAULT false,
	`requiredPersons` int,
	`prerequisiteItemIds` json,
	`followupItemIds` json,
	`sortOrder` int NOT NULL DEFAULT 0,
	`isTransferred` boolean NOT NULL DEFAULT false,
	`taskId` int,
	`createdAt` datetime NOT NULL,
	CONSTRAINT `plan_instance_task_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `plan_template_task_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`templateId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`assignedToMemberIds` json,
	`dueDaysFromStart` int,
	`frequency` enum('once','daily','weekly','monthly','custom') NOT NULL DEFAULT 'once',
	`customFrequencyDays` int,
	`repeatInterval` int,
	`repeatUnit` enum('days','weeks','months','irregular'),
	`durationDays` int DEFAULT 0,
	`durationMinutes` int DEFAULT 0,
	`enableRotation` boolean NOT NULL DEFAULT false,
	`requiredPersons` int,
	`prerequisiteItemIds` json,
	`followupItemIds` json,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` datetime NOT NULL,
	CONSTRAINT `plan_template_task_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `plan_template_instances` MODIFY COLUMN `startedAt` datetime NOT NULL;--> statement-breakpoint
ALTER TABLE `plan_template_instances` MODIFY COLUMN `completedAt` datetime;--> statement-breakpoint
ALTER TABLE `plan_template_shopping_items` MODIFY COLUMN `createdAt` datetime NOT NULL;--> statement-breakpoint
ALTER TABLE `plan_templates` MODIFY COLUMN `lastUsedAt` datetime;--> statement-breakpoint
ALTER TABLE `plan_templates` MODIFY COLUMN `createdAt` datetime NOT NULL;--> statement-breakpoint
ALTER TABLE `plan_templates` MODIFY COLUMN `updatedAt` datetime NOT NULL;--> statement-breakpoint
ALTER TABLE `plan_templates` ADD `enableVariables` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `plan_templates` ADD `variables` json;--> statement-breakpoint
ALTER TABLE `plan_instance_task_items` ADD CONSTRAINT `plan_instance_task_items_instanceId_plan_template_instances_id_fk` FOREIGN KEY (`instanceId`) REFERENCES `plan_template_instances`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `plan_instance_task_items` ADD CONSTRAINT `plan_instance_task_items_templateItemId_plan_template_task_items_id_fk` FOREIGN KEY (`templateItemId`) REFERENCES `plan_template_task_items`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `plan_instance_task_items` ADD CONSTRAINT `plan_instance_task_items_taskId_tasks_id_fk` FOREIGN KEY (`taskId`) REFERENCES `tasks`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `plan_template_task_items` ADD CONSTRAINT `plan_template_task_items_templateId_plan_templates_id_fk` FOREIGN KEY (`templateId`) REFERENCES `plan_templates`(`id`) ON DELETE cascade ON UPDATE no action;