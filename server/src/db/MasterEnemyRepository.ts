import { Pool } from "mysql2/promise";

export interface MasterEnemyRow {
  id: string;
  name: string;
  image_path: string;
  base_cost: number;
  base_exp: number;
  appear_min_floor: number;
  appear_max_floor: number | null;
  is_boss: boolean;
  base_stats_json: string;
  growth_per_level_json: string;
  skill_ids_json: string;
  ai_profile_json: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface AiProfile {
  type: string;
  multiAction?: boolean;
}

export interface MasterEnemy {
  id: string;
  name: string;
  imagePath: string;
  baseCost: number;
  baseExp: number;
  appearMinFloor: number;
  appearMaxFloor: number | null;
  isBoss: boolean;
  baseStats: { maxHp: number; maxMp: number; atk: number; matk: number; def: number; speed: number };
  growthPerLevel: { maxHp: number; maxMp: number; atk: number; matk: number; def: number; speed: number };
  skillIds: string[];
  aiProfile: AiProfile;
}

function parseJson<T>(value: unknown, fallback: T): T {
  if (value === null || value === undefined) return fallback;
  if (typeof value === "string") {
    if (value === "") return fallback;
    return JSON.parse(value) as T;
  }
  return value as T;
}

function rowToMaster(row: MasterEnemyRow): MasterEnemy {
  return {
    id: row.id,
    name: row.name,
    imagePath: row.image_path,
    baseCost: row.base_cost,
    baseExp: row.base_exp ?? 0,
    appearMinFloor: row.appear_min_floor,
    appearMaxFloor: row.appear_max_floor,
    isBoss: !!row.is_boss,
    baseStats: parseJson(row.base_stats_json as unknown, { maxHp: 1, maxMp: 0, atk: 1, matk: 0, def: 0, speed: 1 }),
    growthPerLevel: parseJson(row.growth_per_level_json as unknown, { maxHp: 0, maxMp: 0, atk: 0, matk: 0, def: 0, speed: 0 }),
    skillIds: parseJson(row.skill_ids_json as unknown, []),
    aiProfile: parseJson(row.ai_profile_json as unknown, { type: "default" }),
  };
}

export class MasterEnemyRepository {
  constructor(private db: Pool) {}

  async findAll(): Promise<MasterEnemy[]> {
    const [rows] = await this.db.query<any[]>("SELECT * FROM master_enemies ORDER BY id");
    return rows.map(rowToMaster);
  }

  async findById(id: string): Promise<MasterEnemy | null> {
    const [rows] = await this.db.query<any[]>("SELECT * FROM master_enemies WHERE id = ?", [id]);
    if (rows.length === 0) return null;
    return rowToMaster(rows[0]);
  }

  async create(data: Omit<MasterEnemy, "imagePath"> & { imagePath?: string }): Promise<void> {
    await this.db.execute(
      `INSERT INTO master_enemies 
       (id, name, image_path, base_cost, base_exp, appear_min_floor, appear_max_floor, is_boss, base_stats_json, growth_per_level_json, skill_ids_json, ai_profile_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.id,
        data.name,
        data.imagePath || "",
        data.baseCost,
        data.baseExp ?? 0,
        data.appearMinFloor,
        data.appearMaxFloor,
        data.isBoss,
        JSON.stringify(data.baseStats),
        JSON.stringify(data.growthPerLevel),
        JSON.stringify(data.skillIds),
        JSON.stringify(data.aiProfile),
      ]
    );
  }

  async update(id: string, data: Partial<Omit<MasterEnemy, "id">>): Promise<void> {
    const sets: string[] = [];
    const values: any[] = [];

    if (data.name !== undefined) { sets.push("name = ?"); values.push(data.name); }
    if (data.imagePath !== undefined) { sets.push("image_path = ?"); values.push(data.imagePath); }
    if (data.baseCost !== undefined) { sets.push("base_cost = ?"); values.push(data.baseCost); }
    if (data.baseExp !== undefined) { sets.push("base_exp = ?"); values.push(data.baseExp); }
    if (data.appearMinFloor !== undefined) { sets.push("appear_min_floor = ?"); values.push(data.appearMinFloor); }
    if (data.appearMaxFloor !== undefined) { sets.push("appear_max_floor = ?"); values.push(data.appearMaxFloor); }
    if (data.isBoss !== undefined) { sets.push("is_boss = ?"); values.push(data.isBoss); }
    if (data.baseStats !== undefined) { sets.push("base_stats_json = ?"); values.push(JSON.stringify(data.baseStats)); }
    if (data.growthPerLevel !== undefined) { sets.push("growth_per_level_json = ?"); values.push(JSON.stringify(data.growthPerLevel)); }
    if (data.skillIds !== undefined) { sets.push("skill_ids_json = ?"); values.push(JSON.stringify(data.skillIds)); }
    if (data.aiProfile !== undefined) { sets.push("ai_profile_json = ?"); values.push(JSON.stringify(data.aiProfile)); }

    if (sets.length === 0) return;
    values.push(id);
    await this.db.execute(`UPDATE master_enemies SET ${sets.join(", ")} WHERE id = ?`, values);
  }

  async delete(id: string): Promise<void> {
    await this.db.execute("DELETE FROM master_enemies WHERE id = ?", [id]);
  }
}

