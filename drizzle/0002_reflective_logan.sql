CREATE TABLE `funnel_stages` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`funnel_id` integer NOT NULL,
	`name` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sales_funnels` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sales_funnels_name_unique` ON `sales_funnels` (`name`);--> statement-breakpoint
CREATE TABLE `webhook_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`provider` text NOT NULL,
	`status` text NOT NULL,
	`email` text DEFAULT '' NOT NULL,
	`message` text DEFAULT '' NOT NULL,
	`payload_json` text DEFAULT '{}' NOT NULL,
	`received_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `webhook_settings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`provider` text DEFAULT 'GreatPages' NOT NULL,
	`target_funnel` text DEFAULT 'Palestras' NOT NULL,
	`target_stage` text DEFAULT 'Novo lead' NOT NULL,
	`secret` text DEFAULT '' NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`mapping_json` text DEFAULT '{}' NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
ALTER TABLE `people` ADD `deal_value` real DEFAULT 0 NOT NULL;