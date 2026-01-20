import { Pool } from "mysql2/promise";

export interface MasterCharacterRow {
  id: string;
  name: string;
  description: string | null;
  image_path: string;
  base_stats_json: string;
  growth_per_level_json: string;
  initial_skill_ids_json: string;
  learnable_skill_ids_json: string;
  skill_learn_levels_json: string | null;
  tags_json: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface MasterCharacter {
  id: string;
  name: string;
  description: string;
  imagePath: string;
  baseStats: { maxHp: number; maxMp: number; atk: number; matk: number; def: number; speed: number };
  growthPerLevel: { maxHp: number; maxMp: number; atk: number; matk: number; def: number; speed: number };
  initialSkillIds: string[];
  learnableSkillIds: string[];
  skillLearnLevels: Record<string, number>;
  tags: string[];
}

function parseJson<T>(value: unknown, fallback: T): T {
  if (value === null || value === undefined) return fallback;
  if (typeof value === "string") {
    if (value === "") return fallback;
    return JSON.parse(value) as T;
  }
  // mysql2 may return JSON columns as already-parsed objects
  return value as T;
}

function rowToMaster(row: MasterCharacterRow): MasterCharacter {
  return {
    id: row.id,
    name: row.name,
    description: row.description || "",
    imagePath: row.image_path,
    baseStats: parseJson(row.base_stats_json as unknown, { maxHp: 1, maxMp: 0, atk: 1, matk: 0, def: 0, speed: 1 }),
    growthPerLevel: parseJson(row.growth_per_level_json as unknown, { maxHp: 0, maxMp: 0, atk: 0, matk: 0, def: 0, speed: 0 }),
    initialSkillIds: parseJson(row.initial_skill_ids_json as unknown, []),
    learnableSkillIds: parseJson(row.learnable_skill_ids_json as unknown, []),
    skillLearnLevels: parseJson(row.skill_learn_levels_json as unknown, {}),
    tags: parseJson(row.tags_json as unknown, []),
  };
}

export class MasterCharacterRepository {
  constructor(private db: Pool) {}

  async findAll(): Promise<MasterCharacter[]> {
    const [rows] = await this.db.query<any[]>("SELECT * FROM master_characters ORDER BY id");
    return rows.map(rowToMaster);
  }

  async findById(id: string): Promise<MasterCharacter | null> {
    const [rows] = await this.db.query<any[]>("SELECT * FROM master_characters WHERE id = ?", [id]);
    if (rows.length === 0) return null;
    return rowToMaster(rows[0]);
  }

  async create(data: Omit<MasterCharacter, "imagePath"> & { imagePath?: string }): Promise<void> {
    await this.db.execute(
      `INSERT INTO master_characters 
       (id, name, description, image_path, base_stats_json, growth_per_level_json, initial_skill_ids_json, learnable_skill_ids_json, skill_learn_levels_json, tags_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.id,
        data.name,
        data.description || null,
        data.imagePath || "",
        JSON.stringify(data.baseStats),
        JSON.stringify(data.growthPerLevel),
        JSON.stringify(data.initialSkillIds),
        JSON.stringify(data.learnableSkillIds),
        JSON.stringify(data.skillLearnLevels || {}),
        JSON.stringify(data.tags || []),
      ]
    );
  }

  async update(id: string, data: Partial<Omit<MasterCharacter, "id">>): Promise<void> {
    const sets: string[] = [];
    const values: any[] = [];

    if (data.name !== undefined) {
      sets.push("name = ?");
      values.push(data.name);
    }
    if (data.description !== undefined) {
      sets.push("description = ?");
      values.push(data.description);
    }
    if (data.imagePath !== undefined) {
      sets.push("image_path = ?");
      values.push(data.imagePath);
    }
    if (data.baseStats !== undefined) {
      sets.push("base_stats_json = ?");
      values.push(JSON.stringify(data.baseStats));
    }
    if (data.growthPerLevel !== undefined) {
      sets.push("growth_per_level_json = ?");
      values.push(JSON.stringify(data.growthPerLevel));
    }
    if (data.initialSkillIds !== undefined) {
      sets.push("initial_skill_ids_json = ?");
      values.push(JSON.stringify(data.initialSkillIds));
    }
    if (data.learnableSkillIds !== undefined) {
      sets.push("learnable_skill_ids_json = ?");
      values.push(JSON.stringify(data.learnableSkillIds));
    }
    if (data.skillLearnLevels !== undefined) {
      sets.push("skill_learn_levels_json = ?");
      values.push(JSON.stringify(data.skillLearnLevels));
    }
    if (data.tags !== undefined) {
      sets.push("tags_json = ?");
      values.push(JSON.stringify(data.tags));
    }

    if (sets.length === 0) return;
    values.push(id);
    await this.db.execute(`UPDATE master_characters SET ${sets.join(", ")} WHERE id = ?`, values);
  }

  async delete(id: string): Promise<void> {
    await this.db.execute("DELETE FROM master_characters WHERE id = ?", [id]);
  }
}

