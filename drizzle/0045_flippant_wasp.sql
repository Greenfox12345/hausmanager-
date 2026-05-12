DROP TABLE `task_categories`;--> statement-breakpoint
ALTER TABLE `task_category_assignments` DROP FOREIGN KEY `task_category_assignments_categoryId_task_categories_id_fk`;
--> statement-breakpoint
ALTER TABLE `task_category_assignments` ADD CONSTRAINT `task_category_assignments_categoryId_shopping_categories_id_fk` FOREIGN KEY (`categoryId`) REFERENCES `shopping_categories`(`id`) ON DELETE cascade ON UPDATE no action;