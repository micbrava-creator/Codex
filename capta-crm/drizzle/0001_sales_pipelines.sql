CREATE TABLE `pipelines` (`id` text PRIMARY KEY NOT NULL, `name` text NOT NULL, `color` text DEFAULT '#5B5BD6' NOT NULL, `created_at` integer NOT NULL);
--> statement-breakpoint
CREATE TABLE `pipeline_stages` (`id` text PRIMARY KEY NOT NULL, `pipeline_id` text NOT NULL, `name` text NOT NULL, `position` integer DEFAULT 0 NOT NULL, `color` text DEFAULT '#E8E7FF' NOT NULL, FOREIGN KEY (`pipeline_id`) REFERENCES `pipelines`(`id`) ON UPDATE no action ON DELETE cascade);
--> statement-breakpoint
CREATE INDEX `idx_pipeline_stages_pipeline_position` ON `pipeline_stages` (`pipeline_id`,`position`);
--> statement-breakpoint
ALTER TABLE `contact_lists` ADD `pipeline_id` text REFERENCES pipelines(id) ON DELETE set null;
--> statement-breakpoint
CREATE INDEX `idx_contact_lists_pipeline` ON `contact_lists` (`pipeline_id`);
--> statement-breakpoint
ALTER TABLE `contacts` ADD `stage_id` text REFERENCES pipeline_stages(id) ON DELETE set null;
--> statement-breakpoint
CREATE INDEX `idx_contacts_stage` ON `contacts` (`stage_id`);
--> statement-breakpoint
CREATE TABLE `card_tasks` (`id` text PRIMARY KEY NOT NULL, `contact_id` text NOT NULL, `title` text NOT NULL, `due_date` integer, `completed` integer DEFAULT false NOT NULL, `created_at` integer NOT NULL, FOREIGN KEY (`contact_id`) REFERENCES `contacts`(`id`) ON UPDATE no action ON DELETE cascade);
--> statement-breakpoint
CREATE INDEX `idx_card_tasks_contact` ON `card_tasks` (`contact_id`);
--> statement-breakpoint
CREATE INDEX `idx_card_tasks_due` ON `card_tasks` (`due_date`);
