ALTER TABLE `task_rotation_occurrence_notes` ADD `isSpecial` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `task_rotation_occurrence_notes` ADD `specialName` varchar(255);--> statement-breakpoint
ALTER TABLE `task_rotation_occurrence_notes` ADD `specialDate` timestamp;