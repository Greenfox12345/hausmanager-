CREATE TABLE `balance_entries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`householdId` int NOT NULL,
	`memberId` int NOT NULL,
	`memberName` varchar(255) NOT NULL,
	`recordedByMemberId` int NOT NULL,
	`entryType` enum('payment','work') NOT NULL,
	`amount` decimal(12,2),
	`minutes` int,
	`description` text NOT NULL,
	`sourceType` enum('manual','task','milestone','shopping') NOT NULL DEFAULT 'manual',
	`sourceId` int,
	`occurredAt` datetime NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `balance_entries_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `household_balance_settings` (
	`householdId` int NOT NULL,
	`allowOtherMemberSelection` boolean NOT NULL DEFAULT false,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `household_balance_settings_householdId` PRIMARY KEY(`householdId`)
);
--> statement-breakpoint
ALTER TABLE `balance_entries` ADD CONSTRAINT `balance_entries_householdId_households_id_fk` FOREIGN KEY (`householdId`) REFERENCES `households`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `household_balance_settings` ADD CONSTRAINT `household_balance_settings_householdId_households_id_fk` FOREIGN KEY (`householdId`) REFERENCES `households`(`id`) ON DELETE cascade ON UPDATE no action;