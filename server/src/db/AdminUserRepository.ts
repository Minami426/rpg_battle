import { Pool } from "mysql2/promise";

export interface AdminUser {
  id: number;
  username: string;
  password: string;
  createdAt: Date;
  updatedAt: Date;
}

export class AdminUserRepository {
  constructor(private db: Pool) {}

  async findByUsername(username: string): Promise<AdminUser | null> {
    const [rows] = await this.db.query<any[]>(
      "SELECT * FROM admin_users WHERE username = ?",
      [username]
    );
    if (rows.length === 0) return null;
    const row = rows[0];
    return {
      id: row.id,
      username: row.username,
      password: row.password,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async findById(id: number): Promise<AdminUser | null> {
    const [rows] = await this.db.query<any[]>(
      "SELECT * FROM admin_users WHERE id = ?",
      [id]
    );
    if (rows.length === 0) return null;
    const row = rows[0];
    return {
      id: row.id,
      username: row.username,
      password: row.password,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async create(username: string, password: string): Promise<number> {
    const [result] = await this.db.execute<any>(
      "INSERT INTO admin_users (username, password) VALUES (?, ?)",
      [username, password]
    );
    return result.insertId;
  }

  async updatePassword(id: number, password: string): Promise<void> {
    await this.db.execute(
      "UPDATE admin_users SET password = ? WHERE id = ?",
      [password, id]
    );
  }

  async delete(id: number): Promise<void> {
    await this.db.execute("DELETE FROM admin_users WHERE id = ?", [id]);
  }
}

