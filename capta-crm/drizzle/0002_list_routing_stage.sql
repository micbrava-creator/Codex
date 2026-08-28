ALTER TABLE `contact_lists` ADD `routing_stage_id` text REFERENCES pipeline_stages(id) ON DELETE set null;
