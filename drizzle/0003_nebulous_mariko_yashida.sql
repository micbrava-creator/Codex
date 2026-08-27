CREATE TABLE `lead_lists` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`token` text NOT NULL,
	`target_funnel` text NOT NULL,
	`target_stage` text NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `lead_lists_token_unique` ON `lead_lists` (`token`);--> statement-breakpoint
ALTER TABLE `people` ADD `list_id` integer;--> statement-breakpoint
ALTER TABLE `people` ADD `list_name` text DEFAULT '' NOT NULL;