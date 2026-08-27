CREATE TABLE `events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`city` text DEFAULT 'Online' NOT NULL,
	`event_date` text NOT NULL,
	`capacity` integer DEFAULT 0 NOT NULL,
	`registrations` integer DEFAULT 0 NOT NULL,
	`revenue` real DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'Planejado' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `interactions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`person_id` integer NOT NULL,
	`type` text NOT NULL,
	`title` text NOT NULL,
	`amount` real DEFAULT 0 NOT NULL,
	`occurred_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `people` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`phone` text DEFAULT '' NOT NULL,
	`city` text DEFAULT '' NOT NULL,
	`source` text DEFAULT 'Cadastro manual' NOT NULL,
	`status` text DEFAULT 'Lead' NOT NULL,
	`funnel` text DEFAULT 'Palestras' NOT NULL,
	`stage` text DEFAULT 'Novo lead' NOT NULL,
	`owner` text DEFAULT 'Equipe Fortuna' NOT NULL,
	`acquisition_cost` real DEFAULT 0 NOT NULL,
	`revenue` real DEFAULT 0 NOT NULL,
	`next_offer` text DEFAULT 'Imersão presencial' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `people_email_unique` ON `people` (`email`);--> statement-breakpoint
CREATE TABLE `products` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`category` text NOT NULL,
	`price` real DEFAULT 0 NOT NULL,
	`active` integer DEFAULT true NOT NULL
);
