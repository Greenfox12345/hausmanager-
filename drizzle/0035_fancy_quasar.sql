CREATE TABLE `household_dissolve_votes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`householdId` int NOT NULL,
	`memberId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `household_dissolve_votes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `household_dissolve_votes` ADD CONSTRAINT `household_dissolve_votes_householdId_households_id_fk` FOREIGN KEY (`householdId`) REFERENCES `households`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `household_dissolve_votes` ADD CONSTRAINT `household_dissolve_votes_memberId_household_members_id_fk` FOREIGN KEY (`memberId`) REFERENCES `household_members`(`id`) ON DELETE cascade ON UPDATE no action;