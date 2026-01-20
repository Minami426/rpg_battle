-- RPG Battle schema (MVP)
-- Apply to DB: rpg_battle

CREATE TABLE IF NOT EXISTS users (
  id BIGINT NOT NULL AUTO_INCREMENT,
  username VARCHAR(32) NOT NULL,
  password VARCHAR(255) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS user_state (
  user_id BIGINT NOT NULL,
  current_floor INT NOT NULL DEFAULT 1,
  state_json JSON NOT NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id),
  CONSTRAINT fk_user_state_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS runs (
  id BIGINT NOT NULL AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  ended_reason ENUM('game_over','quit') NOT NULL,
  start_at DATETIME NULL,
  end_at DATETIME NULL,
  max_floor_reached INT NOT NULL,
  max_damage INT NOT NULL DEFAULT 0,
  run_stats_json JSON NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_runs_user_id_created_at (user_id, created_at),
  KEY idx_runs_rank_floor_damage (max_floor_reached, max_damage),
  CONSTRAINT fk_runs_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- マスタデータテーブル

CREATE TABLE IF NOT EXISTS master_characters (
  id VARCHAR(64) NOT NULL,
  name VARCHAR(64) NOT NULL,
  description TEXT,
  image_path VARCHAR(255) NOT NULL DEFAULT '',
  base_stats_json JSON NOT NULL,
  growth_per_level_json JSON NOT NULL,
  initial_skill_ids_json JSON NOT NULL,
  learnable_skill_ids_json JSON NOT NULL,
  skill_learn_levels_json JSON,
  tags_json JSON,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS master_skills (
  id VARCHAR(64) NOT NULL,
  name VARCHAR(64) NOT NULL,
  description TEXT,
  skill_type ENUM('attack', 'heal', 'buff', 'debuff', 'special') NOT NULL,
  target_type ENUM('enemy', 'ally', 'self') NOT NULL,
  `range` ENUM('single', 'all') NOT NULL,
  power INT NOT NULL,
  power_type ENUM('physical', 'magical', 'healing') NOT NULL,
  element VARCHAR(32),
  scaling VARCHAR(32) DEFAULT 'atk',
  crit_rate DECIMAL(5,4) DEFAULT 0.0,
  crit_mag DECIMAL(5,2) DEFAULT 1.5,
  cost INT NOT NULL,
  cost_type ENUM('mp', 'hp') NOT NULL,
  accuracy DECIMAL(5,4) DEFAULT 1.0,
  conditions_json JSON,
  unlock_level INT DEFAULT 1,
  prerequisite_ids_json JSON,
  is_passive BOOLEAN DEFAULT FALSE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS master_items (
  id VARCHAR(64) NOT NULL,
  name VARCHAR(64) NOT NULL,
  description TEXT,
  type VARCHAR(32) NOT NULL,
  target ENUM('ally', 'enemy', 'self') NOT NULL,
  battle_usable BOOLEAN DEFAULT TRUE,
  max_stack INT DEFAULT 99,
  effect_json JSON NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS master_conditions (
  id VARCHAR(64) NOT NULL,
  name VARCHAR(64) NOT NULL,
  condition_type ENUM('dot', 'regen', 'stun', 'buff', 'debuff') NOT NULL,
  stat ENUM('hp', 'mp', 'atk', 'matk', 'def', 'speed') NOT NULL,
  value DECIMAL(10,4) NOT NULL,
  value_type ENUM('add', 'multiply') NOT NULL,
  duration INT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS master_enemies (
  id VARCHAR(64) NOT NULL,
  name VARCHAR(64) NOT NULL,
  image_path VARCHAR(255) NOT NULL DEFAULT '',
  base_cost INT NOT NULL,
  base_exp INT NOT NULL DEFAULT 0,
  appear_min_floor INT DEFAULT 1,
  appear_max_floor INT,
  is_boss BOOLEAN DEFAULT FALSE,
  base_stats_json JSON NOT NULL,
  growth_per_level_json JSON NOT NULL,
  skill_ids_json JSON NOT NULL,
  ai_profile_json JSON,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 管理者テーブル

CREATE TABLE IF NOT EXISTS admin_users (
  id BIGINT NOT NULL AUTO_INCREMENT,
  username VARCHAR(32) NOT NULL,
  password VARCHAR(255) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_admin_users_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
