import { Pool } from "mysql2/promise";
import { UserStateRow } from "../types";

export class UserStateRepository {
  constructor(private pool: Pool) {}

  async getState(userId: number): Promise<UserStateRow | null> {
    const sql = `SELECT * FROM user_state WHERE user_id = ? LIMIT 1`;
    const [rows] = await this.pool.execute(sql, [userId]);
    const arr = rows as UserStateRow[];
    return arr[0] || null;
  }

  async upsertState(
    userId: number,
    currentFloor: number,
    stateJson: any
  ): Promise<void> {
    const sql = `
      INSERT INTO user_state (user_id, current_floor, state_json)
      VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE
        current_floor = VALUES(current_floor),
        state_json = VALUES(state_json),
        updated_at = CURRENT_TIMESTAMP
    `;
    await this.pool.execute(sql, [userId, currentFloor, JSON.stringify(stateJson)]);
  }
}

