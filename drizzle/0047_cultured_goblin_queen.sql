CREATE TABLE `borrow_quantity_returns` (
	`id` int AUTO_INCREMENT NOT NULL,
	`borrowRequestId` int NOT NULL,
	`returnedQty` int NOT NULL,
	`returnedByMemberId` int,
	`note` text,
	`returnedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `borrow_quantity_returns_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `borrow_requests` ADD `loanQuantity` int DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `borrow_requests` ADD `returnedQuantity` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `borrow_quantity_returns` ADD CONSTRAINT `borrow_quantity_returns_borrowRequestId_borrow_requests_id_fk` FOREIGN KEY (`borrowRequestId`) REFERENCES `borrow_requests`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `borrow_quantity_returns` ADD CONSTRAINT `borrow_quantity_returns_returnedByMemberId_household_members_id_fk` FOREIGN KEY (`returnedByMemberId`) REFERENCES `household_members`(`id`) ON DELETE set null ON UPDATE no action;