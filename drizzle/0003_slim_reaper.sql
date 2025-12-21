ALTER TABLE `tasks` ADD `repeatInterval` int;--> statement-breakpoint
ALTER TABLE `tasks` ADD `repeatUnit` enum('days','weeks','months');--> statement-breakpoint
ALTER TABLE `tasks` ADD `requiredPersons` int;