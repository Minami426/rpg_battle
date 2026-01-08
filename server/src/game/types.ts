export type Stats = {
  maxHp: number;
  maxMp: number;
  atk: number;
  matk: number;
  def: number;
  speed: number;
};

export type ConditionInstance = {
  id: string;
  kind: "dot" | "buff" | "debuff" | "stun";
  stat?: string;
  value?: number;
  valueType?: "add" | "multiply";
  duration: number;
};

export type Combatant = {
  id: string; // unique within battle
  name: string;
  isEnemy: boolean;
  level: number;
  base: Stats;
  currentHp: number;
  currentMp: number;
  conditions: ConditionInstance[];
  guard: boolean;
  skillIds: string[];
};

export type BattleState = {
  battleId: string;
  floor: number;
  party: Combatant[];
  enemies: Combatant[];
  items: Record<string, number>; // battle中の所持アイテム（消費をサーバ側で正とする）
  turnOrder: number[]; // indices into actors array
  turnCursor: number; // pointer in turnOrder
  log: string[];
  actors: Combatant[]; // party + enemies
  winner: "party" | "enemies" | null;
  maxDamageByParty: number; // プレイヤーが敵に与えた単発最大ダメージ
};

export type ActionPayload =
  | { type: "attack" }
  | { type: "skill"; skillId: string; targetIds: string[] }
  | { type: "item"; itemId: string; targetIds: string[] }
  | { type: "defend" };

export type BattleResult = {
  state: BattleState;
  deltaState: any;
};

