ALTER TABLE `tasks` MODIFY COLUMN `repeatUnit` enum('days','weeks','months','irregular');--> statement-breakpoint
ALTER TABLE `tasks` ADD `irregularRecurrence` boolean DEFAULT false;