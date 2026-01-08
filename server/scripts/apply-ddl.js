// Apply DB schema (DDL) for RPG Battle.
// Usage: node scripts/apply-ddl.js
// - Loads .env if present
// - Uses DB_* env vars (same as server)
//
// This is for MVP local development.
require("dotenv").config();

const mysql = require("mysql2/promise");

async function main() {
  const {
    DB_HOST = "127.0.0.1",
    DB_PORT = "3306",
    DB_USER = "root",
    DB_PASSWORD = "",
    DB_NAME = "rpg_battle",
  } = process.env;

  const conn = await mysql.createConnection({
    host: DB_HOST,
    port: Number(DB_PORT),
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
    multipleStatements: true,
  });

  const ddls = [
    `
CREATE TABLE IF NOT EXISTS users (
  id BIGINT NOT NULL AUTO_INCREMENT,
  username VARCHAR(32) NOT NULL,
  password VARCHAR(255) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
`.trim(),
    `
CREATE TABLE IF NOT EXISTS user_state (
  user_id BIGINT NOT NULL,
  current_floor INT NOT NULL DEFAULT 1,
  state_json JSON NOT NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id),
  CONSTRAINT fk_user_state_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
`.trim(),
    `
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
`.trim(),
  ];

  try {
    for (const sql of ddls) {
      await conn.execute(sql);
    }
    console.log("[apply-ddl] OK: tables ensured (users, user_state, runs)");
  } finally {
    await conn.end();
  }
}

main().catch((e) => {
  console.error("[apply-ddl] FAILED:", e?.code || e?.message);
  console.error(e);
  process.exit(1);
});


