CREATE TABLE `contact_stage_history` (
  `id` text PRIMARY KEY NOT NULL,
  `contact_id` text NOT NULL REFERENCES `contacts`(`id`) ON DELETE CASCADE,
  `pipeline_id` text NOT NULL REFERENCES `pipelines`(`id`) ON DELETE CASCADE,
  `stage_id` text NOT NULL REFERENCES `pipeline_stages`(`id`) ON DELETE CASCADE,
  `entered_at` integer NOT NULL
);
CREATE UNIQUE INDEX `idx_stage_history_contact_stage` ON `contact_stage_history` (`contact_id`,`stage_id`);
CREATE INDEX `idx_stage_history_pipeline_stage` ON `contact_stage_history` (`pipeline_id`,`stage_id`);
INSERT OR IGNORE INTO `contact_stage_history` (`id`,`contact_id`,`pipeline_id`,`stage_id`,`entered_at`)
SELECT lower(hex(randomblob(16))), c.id, current_stage.pipeline_id, passed_stage.id, c.created_at
FROM contacts c
INNER JOIN pipeline_stages current_stage ON current_stage.id = c.stage_id
INNER JOIN pipeline_stages passed_stage ON passed_stage.pipeline_id = current_stage.pipeline_id AND passed_stage.position <= current_stage.position;
