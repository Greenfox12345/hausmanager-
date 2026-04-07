ALTER TABLE `inventory_items` DROP FOREIGN KEY `inventory_items_categoryId_shopping_categories_id_fk`;
--> statement-breakpoint
ALTER TABLE `shopping_items` DROP FOREIGN KEY `shopping_items_categoryId_shopping_categories_id_fk`;
--> statement-breakpoint
ALTER TABLE `inventory_items` MODIFY COLUMN `categoryId` int;--> statement-breakpoint
ALTER TABLE `shopping_items` MODIFY COLUMN `categoryId` int;--> statement-breakpoint
ALTER TABLE `inventory_items` ADD CONSTRAINT `inventory_items_categoryId_shopping_categories_id_fk` FOREIGN KEY (`categoryId`) REFERENCES `shopping_categories`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `shopping_items` ADD CONSTRAINT `shopping_items_categoryId_shopping_categories_id_fk` FOREIGN KEY (`categoryId`) REFERENCES `shopping_categories`(`id`) ON DELETE set null ON UPDATE no action;