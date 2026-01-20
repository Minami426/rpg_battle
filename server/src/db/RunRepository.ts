import { Pool } from "mysql2/promise";
import { RunRow } from "../types";

export class RunRepository {
  constructor(private pool: Pool) {}

  async insertRun(params: {
    userId: number;
    endedReason: "game_over" | "quit";
    startAt?: Date | null;
    endAt?: Date | null;
    maxFloorReached: number;
    maxDamage: number;
    runStatsJson: any;
  }): Promise<number> {
    const sql = `
      INSERT INTO runs (
        user_id, ended_reason, start_at, end_at,
        max_floor_reached, max_damage, run_stats_json
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    const [result] = await this.pool.execute(sql, [
      params.userId,
      params.endedReason,
      params.startAt ?? null,
      params.endAt ?? null,
      params.maxFloorReached,
      params.maxDamage,
      JSON.stringify(params.runStatsJson),
    ]);
    // @ts-expect-error insertId exists
    return result.insertId as number;
  }

  async listRunsByUser(userId: number): Promise<RunRow[]> {
    const sql = `
      SELECT *
      FROM runs
      WHERE user_id = ?
      ORDER BY created_at DESC
    `;
    const [rows] = await this.pool.execute(sql, [userId]);
    return rows as RunRow[];
  }

  async listRanking(): Promise<
    { user_id: number; username: string; best_floor: number; best_damage: number; latest: Date }[]
  > {
    // NOTE: 以前の MAX 集計は「best_floor の run」と「best_damage の run」が別でも混ざる不整合が起こる。
    // ここでは「(floor desc, damage desc, created_at desc) で最良の run を 1件選ぶ」。
    // MySQL 8+ / MariaDB 10.2+ の window function を利用。
    const sql = `
      SELECT user_id, username, max_floor_reached AS best_floor, max_damage AS best_damage, created_at AS latest
      FROM (
        SELECT
          u.id AS user_id,
          u.username,
          r.max_floor_reached,
          r.max_damage,
          r.created_at,
          ROW_NUMBER() OVER (
            PARTITION BY u.id
            ORDER BY r.max_floor_reached DESC, r.max_damage DESC, r.created_at DESC
          ) AS rn
        FROM users u
        JOIN runs r ON r.user_id = u.id
      ) t
      WHERE rn = 1
      ORDER BY best_floor DESC, best_damage DESC, latest DESC
    `;
    const [rows] = await this.pool.query(sql);
    return rows as any;
  }
}

