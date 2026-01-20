// Master data types
export type MasterFile<T> = { schemaVersion: number; data: T[] };

export type Masters = {
  characters: MasterFile<any>;
  skills: MasterFile<any>;
  items: MasterFile<any>;
  conditions: MasterFile<any>;
  enemies: MasterFile<any>;
};

// Database row types
export type UserRow = {
  id: number;
  username: string;
  password: string;
  created_at: Date;
  updated_at: Date;
};

export type UserStateRow = {
  user_id: number;
  current_floor: number;
  state_json: any;
  updated_at: Date;
};

export type RunRow = {
  id: number;
  user_id: number;
  ended_reason: "game_over" | "quit";
  start_at: Date | null;
  end_at: Date | null;
  max_floor_reached: number;
  max_damage: number;
  run_stats_json: any;
  created_at: Date;
};
