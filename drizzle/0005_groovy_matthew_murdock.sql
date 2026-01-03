ALTER TABLE `tasks` DROP FOREIGN KEY `tasks_projectId_projects_id_fk`;
--> statement-breakpoint
ALTER TABLE `tasks` ADD `projectIds` json DEFAULT ('[]');--> statement-breakpoint
ALTER TABLE `tasks` DROP COLUMN `projectId`;