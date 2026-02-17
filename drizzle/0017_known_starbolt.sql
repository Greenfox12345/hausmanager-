ALTER TABLE `tasks` DROP FOREIGN KEY `tasks_assignedTo_household_members_id_fk`;
--> statement-breakpoint
ALTER TABLE `tasks` MODIFY COLUMN `assignedTo` json;