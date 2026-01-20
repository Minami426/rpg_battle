ALTER TABLE master_characters
ADD COLUMN skill_learn_levels_json JSON DEFAULT NULL
AFTER learnable_skill_ids_json;

