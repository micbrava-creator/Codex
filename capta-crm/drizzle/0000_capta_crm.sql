CREATE TABLE `contact_lists` (`id` text PRIMARY KEY NOT NULL, `name` text NOT NULL, `segment` text DEFAULT '' NOT NULL, `color` text DEFAULT '#5B5BD6' NOT NULL, `webhook_token` text NOT NULL, `created_at` integer NOT NULL);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_contact_lists_webhook_token` ON `contact_lists` (`webhook_token`);
--> statement-breakpoint
CREATE TABLE `contacts` (`id` text PRIMARY KEY NOT NULL, `list_id` text NOT NULL, `name` text DEFAULT '' NOT NULL, `email` text DEFAULT '' NOT NULL, `phone` text DEFAULT '' NOT NULL, `company` text DEFAULT '' NOT NULL, `notes` text DEFAULT '' NOT NULL, `source` text DEFAULT 'manual' NOT NULL, `created_at` integer NOT NULL, `updated_at` integer NOT NULL, FOREIGN KEY (`list_id`) REFERENCES `contact_lists`(`id`) ON UPDATE no action ON DELETE cascade);
--> statement-breakpoint
CREATE INDEX `idx_contacts_list_created` ON `contacts` (`list_id`,`created_at`);
--> statement-breakpoint
CREATE INDEX `idx_contacts_email` ON `contacts` (`email`);
