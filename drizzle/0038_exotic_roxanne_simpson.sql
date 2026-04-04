CREATE TABLE `demo_sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`token` varchar(128) NOT NULL,
	`householdId` int NOT NULL,
	`memberId` int NOT NULL,
	`claimedByUserId` int,
	`expiresAt` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `demo_sessions_id` PRIMARY KEY(`id`),
	CONSTRAINT `demo_sessions_token_unique` UNIQUE(`token`)
);
--> statement-breakpoint
ALTER TABLE `demo_sessions` ADD CONSTRAINT `demo_sessions_householdId_households_id_fk` FOREIGN KEY (`householdId`) REFERENCES `households`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `demo_sessions` ADD CONSTRAINT `demo_sessions_memberId_household_members_id_fk` FOREIGN KEY (`memberId`) REFERENCES `household_members`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `demo_sessions` ADD CONSTRAINT `demo_sessions_claimedByUserId_users_id_fk` FOREIGN KEY (`claimedByUserId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;