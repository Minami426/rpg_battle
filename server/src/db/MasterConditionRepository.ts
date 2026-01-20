import { Pool } from "mysql2/promise";

export interface MasterConditionRow {
  id: string;
  name: string;
  condition_type: string;
  stat: string;
  value: number;
  value_type: string;
  duration: number;
  created_at: Date;
  updated_at: Date;
}

export interface MasterCondition {
  id: string;
  name: string;
  conditionType: "dot" | "regen" | "stun" | "buff" | "debuff";
  stat: "hp" | "mp" | "atk" | "matk" | "def" | "speed";
  value: number;
  valueType: "add" | "multiply";
  duration: number;
}

function rowToMaster(row: MasterConditionRow): MasterCondition {
  return {
    id: row.id,
    name: row.name,
    conditionType: row.condition_type as MasterCondition["conditionType"],
    stat: row.stat as MasterCondition["stat"],
    value: Number(row.value),
    valueType: row.value_type as MasterCondition["valueType"],
    duration: row.duration,
  };
}

export class MasterConditionRepository {
  constructor(private db: Pool) {}

  async findAll(): Promise<MasterCondition[]> {
    const [rows] = await this.db.query<any[]>("SELECT * FROM master_conditions ORDER BY id");
    return rows.map(rowToMaster);
  }

  async findById(id: string): Promise<MasterCondition | null> {
    const [rows] = await this.db.query<any[]>("SELECT * FROM master_conditions WHERE id = ?", [id]);
    if (rows.length === 0) return null;
    return rowToMaster(rows[0]);
  }

  async create(data: MasterCondition): Promise<void> {
    await this.db.execute(
      `INSERT INTO master_conditions 
       (id, name, condition_type, stat, value, value_type, duration)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [data.id, data.name, data.conditionType, data.stat, data.value, data.valueType, data.duration]
    );
  }

  async update(id: string, data: Partial<Omit<MasterCondition, "id">>): Promise<void> {
    const sets: string[] = [];
    const values: any[] = [];

    if (data.name !== undefined) { sets.push("name = ?"); values.push(data.name); }
    if (data.conditionType !== undefined) { sets.push("condition_type = ?"); values.push(data.conditionType); }
    if (data.stat !== undefined) { sets.push("stat = ?"); values.push(data.stat); }
    if (data.value !== undefined) { sets.push("value = ?"); values.push(data.value); }
    if (data.valueType !== undefined) { sets.push("value_type = ?"); values.push(data.valueType); }
    if (data.duration !== undefined) { sets.push("duration = ?"); values.push(data.duration); }

    if (sets.length === 0) return;
    values.push(id);
    await this.db.execute(`UPDATE master_conditions SET ${sets.join(", ")} WHERE id = ?`, values);
  }

  async delete(id: string): Promise<void> {
    await this.db.execute("DELETE FROM master_conditions WHERE id = ?", [id]);
  }
}

