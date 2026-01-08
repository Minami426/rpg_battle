import { Pool } from "mysql2/promise";
import { UserRow } from "../types/db";

export class UserRepository {
  constructor(private pool: Pool) {}

  async createUser(username: string, password: string): Promise<number> {
    const sql = `
      INSERT INTO users (username, password)
      VALUES (?, ?)
    `;
    const [result] = await this.pool.execute(sql, [username, password]);
    // @ts-expect-error insertId exists
    return result.insertId as number;
  }

  async findByUsername(username: string): Promise<UserRow | null> {
    const sql = `SELECT * FROM users WHERE username = ? LIMIT 1`;
    const [rows] = await this.pool.execute(sql, [username]);
    const arr = rows as UserRow[];
    return arr[0] || null;
  }

  async findById(id: number): Promise<UserRow | null> {
    const sql = `SELECT * FROM users WHERE id = ? LIMIT 1`;
    const [rows] = await this.pool.execute(sql, [id]);
    const arr = rows as UserRow[];
    return arr[0] || null;
  }
}

