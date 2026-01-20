ALTER TABLE master_enemies
ADD COLUMN base_exp INT NOT NULL DEFAULT 0
AFTER base_cost;

