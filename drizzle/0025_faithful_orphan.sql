ALTER TABLE `tasks` MODIFY COLUMN `repeatUnit` enum('days','weeks','months');--> statement-breakpoint
ALTER TABLE `tasks` DROP COLUMN `irregularRecurrence`;