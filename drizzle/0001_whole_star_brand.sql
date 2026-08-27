CREATE TABLE `purchases` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`person_id` integer NOT NULL,
	`product_id` integer,
	`product_name` text NOT NULL,
	`amount` real DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'Pago' NOT NULL,
	`purchased_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
