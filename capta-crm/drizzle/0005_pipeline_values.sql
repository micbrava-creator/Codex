ALTER TABLE `pipelines` ADD `default_value_cents` integer DEFAULT 0 NOT NULL;
ALTER TABLE `contacts` ADD `negotiation_value_cents` integer DEFAULT 0 NOT NULL;
UPDATE `contacts`
SET `negotiation_value_cents` = COALESCE((
  SELECT `pipelines`.`default_value_cents`
  FROM `pipeline_stages`
  INNER JOIN `pipelines` ON `pipelines`.`id` = `pipeline_stages`.`pipeline_id`
  WHERE `pipeline_stages`.`id` = `contacts`.`stage_id`
), 0);
