// Simplified master types for early development. Expand as needed.

export type MasterFile<T> = { schemaVersion: number; data: T[] };

export type Masters = {
  characters: MasterFile<any>;
  skills: MasterFile<any>;
  items: MasterFile<any>;
  conditions: MasterFile<any>;
  enemies: MasterFile<any>;
};

