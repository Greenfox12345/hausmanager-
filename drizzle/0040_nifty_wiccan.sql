ALTER TABLE `activity_history` DROP FOREIGN KEY `activity_history_memberId_household_members_id_fk`;
--> statement-breakpoint
ALTER TABLE `borrow_requests` DROP FOREIGN KEY `borrow_requests_borrowerMemberId_household_members_id_fk`;
--> statement-breakpoint
ALTER TABLE `calendar_events` DROP FOREIGN KEY `calendar_events_createdBy_household_members_id_fk`;
--> statement-breakpoint
ALTER TABLE `household_connections` DROP FOREIGN KEY `household_connections_requestedBy_household_members_id_fk`;
--> statement-breakpoint
ALTER TABLE `inventory_items` DROP FOREIGN KEY `inventory_items_createdBy_household_members_id_fk`;
--> statement-breakpoint
ALTER TABLE `projects` DROP FOREIGN KEY `projects_createdBy_household_members_id_fk`;
--> statement-breakpoint
ALTER TABLE `shopping_items` DROP FOREIGN KEY `shopping_items_addedBy_household_members_id_fk`;
--> statement-breakpoint
ALTER TABLE `tasks` DROP FOREIGN KEY `tasks_createdBy_household_members_id_fk`;
--> statement-breakpoint
ALTER TABLE `activity_history` MODIFY COLUMN `memberId` int;--> statement-breakpoint
ALTER TABLE `borrow_requests` MODIFY COLUMN `borrowerMemberId` int;--> statement-breakpoint
ALTER TABLE `calendar_events` MODIFY COLUMN `createdBy` int;--> statement-breakpoint
ALTER TABLE `household_connections` MODIFY COLUMN `requestedBy` int;--> statement-breakpoint
ALTER TABLE `inventory_items` MODIFY COLUMN `createdBy` int;--> statement-breakpoint
ALTER TABLE `projects` MODIFY COLUMN `createdBy` int;--> statement-breakpoint
ALTER TABLE `shopping_items` MODIFY COLUMN `addedBy` int;--> statement-breakpoint
ALTER TABLE `tasks` MODIFY COLUMN `createdBy` int;--> statement-breakpoint
ALTER TABLE `activity_history` ADD CONSTRAINT `activity_history_memberId_household_members_id_fk` FOREIGN KEY (`memberId`) REFERENCES `household_members`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `borrow_requests` ADD CONSTRAINT `borrow_requests_borrowerMemberId_household_members_id_fk` FOREIGN KEY (`borrowerMemberId`) REFERENCES `household_members`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `calendar_events` ADD CONSTRAINT `calendar_events_createdBy_household_members_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `household_members`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `household_connections` ADD CONSTRAINT `household_connections_requestedBy_household_members_id_fk` FOREIGN KEY (`requestedBy`) REFERENCES `household_members`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `inventory_items` ADD CONSTRAINT `inventory_items_createdBy_household_members_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `household_members`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `projects` ADD CONSTRAINT `projects_createdBy_household_members_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `household_members`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `shopping_items` ADD CONSTRAINT `shopping_items_addedBy_household_members_id_fk` FOREIGN KEY (`addedBy`) REFERENCES `household_members`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tasks` ADD CONSTRAINT `tasks_createdBy_household_members_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `household_members`(`id`) ON DELETE set null ON UPDATE no action;