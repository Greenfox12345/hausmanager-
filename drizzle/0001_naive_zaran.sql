CREATE TABLE `notification_preferences` (
	`id` int AUTO_INCREMENT NOT NULL,
	`householdId` int NOT NULL,
	`memberId` int NOT NULL,
	`enableTaskAssigned` boolean DEFAULT true,
	`enableTaskDue` boolean DEFAULT true,
	`enableTaskCompleted` boolean DEFAULT true,
	`enableComments` boolean DEFAULT true,
	`enableBrowserPush` boolean DEFAULT false,
	`dndStartTime` varchar(5),
	`dndEndTime` varchar(5),
	`createdAt` timestamp DEFAULT (now()),
	`updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `notification_preferences_id` PRIMARY KEY(`id`)
);
