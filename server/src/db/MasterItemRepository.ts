import { Pool } from "mysql2/promise";

export interface MasterItemRow {
  id: string;
  name: string;
  description: string | null;
  type: string;
  target: string;
  battle_usable: boolean;
  max_stack: number;
  effect_json: string;
  created_at: Date;
  updated_at: Date;
}

export interface ItemEffect {
  kind: string;
  power: number;
}

export interface MasterItem {
  id: string;
  name: string;
  description: string;
  type: string;
  target: "ally" | "enemy" | "self";
  battleUsable: boolean;
  maxStack: number;
  effect: ItemEffect;
}

function parseJson<T>(value: unknown, fallback: T): T {
  if (value === null || value === undefined) return fallback;
  if (typeof value === "string") {
    if (value === "") return fallback;
    return JSON.parse(value) as T;
  }
  return value as T;
}

function rowToMaster(row: MasterItemRow): MasterItem {
  return {
    id: row.id,
    name: row.name,
    description: row.description || "",
    type: row.type,
    target: row.target as MasterItem["target"],
    battleUsable: !!row.battle_usable,
    maxStack: row.max_stack,
    effect: parseJson(row.effect_json as unknown, { kind: "none", power: 0 }),
  };
}

export class MasterItemRepository {
  constructor(private db: Pool) {}

  async findAll(): Promise<MasterItem[]> {
    const [rows] = await this.db.query<any[]>("SELECT * FROM master_items ORDER BY id");
    return rows.map(rowToMaster);
  }

  async findById(id: string): Promise<MasterItem | null> {
    const [rows] = await this.db.query<any[]>("SELECT * FROM master_items WHERE id = ?", [id]);
    if (rows.length === 0) return null;
    return rowToMaster(rows[0]);
  }

  async create(data: MasterItem): Promise<void> {
    await this.db.execute(
      `INSERT INTO master_items 
       (id, name, description, type, target, battle_usable, max_stack, effect_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.id,
        data.name,
        data.description || null,
        data.type,
        data.target,
        data.battleUsable,
        data.maxStack,
        JSON.stringify(data.effect),
      ]
    );
  }

  async update(id: string, data: Partial<Omit<MasterItem, "id">>): Promise<void> {
    const sets: string[] = [];
    const values: any[] = [];

    if (data.name !== undefined) { sets.push("name = ?"); values.push(data.name); }
    if (data.description !== undefined) { sets.push("description = ?"); values.push(data.description); }
    if (data.type !== undefined) { sets.push("type = ?"); values.push(data.type); }
    if (data.target !== undefined) { sets.push("target = ?"); values.push(data.target); }
    if (data.battleUsable !== undefined) { sets.push("battle_usable = ?"); values.push(data.battleUsable); }
    if (data.maxStack !== undefined) { sets.push("max_stack = ?"); values.push(data.maxStack); }
    if (data.effect !== undefined) { sets.push("effect_json = ?"); values.push(JSON.stringify(data.effect)); }

    if (sets.length === 0) return;
    values.push(id);
    await this.db.execute(`UPDATE master_items SET ${sets.join(", ")} WHERE id = ?`, values);
  }

  async delete(id: string): Promise<void> {
    await this.db.execute("DELETE FROM master_items WHERE id = ?", [id]);
  }
}

