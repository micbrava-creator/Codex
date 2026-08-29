ALTER TABLE `contacts` ADD `sale_completed` integer DEFAULT 0 NOT NULL;
ALTER TABLE `contacts` ADD `sale_completed_at` integer;
CREATE INDEX `idx_contacts_sale_completed` ON `contacts` (`sale_completed`);
