import { Pool } from "mysql2/promise";

export interface MasterSkillRow {
  id: string;
  name: string;
  description: string | null;
  skill_type: string;
  target_type: string;
  range: string;
  power: number;
  power_type: string;
  element: string | null;
  scaling: string | null;
  crit_rate: number;
  crit_mag: number;
  cost: number;
  cost_type: string;
  accuracy: number;
  conditions_json: string | null;
  unlock_level: number;
  prerequisite_ids_json: string | null;
  is_passive: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface SkillCondition {
  conditionId: string;
  chance: number;
  durationOverride?: number;
}

export interface MasterSkill {
  id: string;
  name: string;
  description: string;
  skillType: "attack" | "heal" | "buff" | "debuff" | "special";
  targetType: "enemy" | "ally" | "self";
  range: "single" | "all";
  power: number;
  powerType: "physical" | "magical" | "healing";
  element: string | null;
  scaling: string;
  critRate: number;
  critMag: number;
  cost: number;
  costType: "mp" | "hp";
  accuracy: number;
  conditions: SkillCondition[];
  unlockLevel: number;
  prerequisiteIds: string[];
  isPassive: boolean;
}

function parseJson<T>(value: unknown, fallback: T): T {
  if (value === null || value === undefined) return fallback;
  if (typeof value === "string") {
    if (value === "") return fallback;
    return JSON.parse(value) as T;
  }
  return value as T;
}

function rowToMaster(row: MasterSkillRow): MasterSkill {
  return {
    id: row.id,
    name: row.name,
    description: row.description || "",
    skillType: row.skill_type as MasterSkill["skillType"],
    targetType: row.target_type as MasterSkill["targetType"],
    range: row.range as MasterSkill["range"],
    power: row.power,
    powerType: row.power_type as MasterSkill["powerType"],
    element: row.element,
    scaling: row.scaling || "atk",
    critRate: Number(row.crit_rate),
    critMag: Number(row.crit_mag),
    cost: row.cost,
    costType: row.cost_type as MasterSkill["costType"],
    accuracy: Number(row.accuracy),
    conditions: parseJson(row.conditions_json as unknown, []),
    unlockLevel: row.unlock_level,
    prerequisiteIds: parseJson(row.prerequisite_ids_json as unknown, []),
    isPassive: !!row.is_passive,
  };
}

export class MasterSkillRepository {
  constructor(private db: Pool) {}

  async findAll(): Promise<MasterSkill[]> {
    const [rows] = await this.db.query<any[]>("SELECT * FROM master_skills ORDER BY id");
    return rows.map(rowToMaster);
  }

  async findById(id: string): Promise<MasterSkill | null> {
    const [rows] = await this.db.query<any[]>("SELECT * FROM master_skills WHERE id = ?", [id]);
    if (rows.length === 0) return null;
    return rowToMaster(rows[0]);
  }

  async create(data: MasterSkill): Promise<void> {
    await this.db.execute(
      `INSERT INTO master_skills 
       (id, name, description, skill_type, target_type, \`range\`, power, power_type, element, scaling, crit_rate, crit_mag, cost, cost_type, accuracy, conditions_json, unlock_level, prerequisite_ids_json, is_passive)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.id,
        data.name,
        data.description || null,
        data.skillType,
        data.targetType,
        data.range,
        data.power,
        data.powerType,
        data.element || null,
        data.scaling || "atk",
        data.critRate,
        data.critMag,
        data.cost,
        data.costType,
        data.accuracy,
        JSON.stringify(data.conditions || []),
        data.unlockLevel || 1,
        JSON.stringify(data.prerequisiteIds || []),
        data.isPassive || false,
      ]
    );
  }

  async update(id: string, data: Partial<Omit<MasterSkill, "id">>): Promise<void> {
    const sets: string[] = [];
    const values: any[] = [];

    if (data.name !== undefined) { sets.push("name = ?"); values.push(data.name); }
    if (data.description !== undefined) { sets.push("description = ?"); values.push(data.description); }
    if (data.skillType !== undefined) { sets.push("skill_type = ?"); values.push(data.skillType); }
    if (data.targetType !== undefined) { sets.push("target_type = ?"); values.push(data.targetType); }
    if (data.range !== undefined) { sets.push("`range` = ?"); values.push(data.range); }
    if (data.power !== undefined) { sets.push("power = ?"); values.push(data.power); }
    if (data.powerType !== undefined) { sets.push("power_type = ?"); values.push(data.powerType); }
    if (data.element !== undefined) { sets.push("element = ?"); values.push(data.element); }
    if (data.scaling !== undefined) { sets.push("scaling = ?"); values.push(data.scaling); }
    if (data.critRate !== undefined) { sets.push("crit_rate = ?"); values.push(data.critRate); }
    if (data.critMag !== undefined) { sets.push("crit_mag = ?"); values.push(data.critMag); }
    if (data.cost !== undefined) { sets.push("cost = ?"); values.push(data.cost); }
    if (data.costType !== undefined) { sets.push("cost_type = ?"); values.push(data.costType); }
    if (data.accuracy !== undefined) { sets.push("accuracy = ?"); values.push(data.accuracy); }
    if (data.conditions !== undefined) { sets.push("conditions_json = ?"); values.push(JSON.stringify(data.conditions)); }
    if (data.unlockLevel !== undefined) { sets.push("unlock_level = ?"); values.push(data.unlockLevel); }
    if (data.prerequisiteIds !== undefined) { sets.push("prerequisite_ids_json = ?"); values.push(JSON.stringify(data.prerequisiteIds)); }
    if (data.isPassive !== undefined) { sets.push("is_passive = ?"); values.push(data.isPassive); }

    if (sets.length === 0) return;
    values.push(id);
    await this.db.execute(`UPDATE master_skills SET ${sets.join(", ")} WHERE id = ?`, values);
  }

  async delete(id: string): Promise<void> {
    await this.db.execute("DELETE FROM master_skills WHERE id = ?", [id]);
  }
}

