import { Pool } from "mysql2/promise";
import { UserStateRepository } from "../db/UserStateRepository";
import { createInitialState } from "./initialState";
import { Masters } from "../types";
import { scalePlayerStats } from "../game/playerStats";

/**
 * DB から state_json を取得し、なければ初期状態を作成して返す。
 */
export async function getOrCreateUserState(pool: Pool, userId: number, masters?: Masters) {
  const repo = new UserStateRepository(pool);
  const found = await repo.getState(userId);
  if (found) return found;
  const initial = createInitialState(masters);
  await repo.upsertState(userId, 1, initial);
  const created = await repo.getState(userId);
  return created!;
}

export function applyBattleDeltaToStateObject(params: {
  masters: Masters;
  state: any;
  delta: {
    items?: Record<string, number>;
    exp?: number;
    skillExp?: Record<string, number>;
    partyStatus?: { id: string; currentHp: number; currentMp: number; level?: number }[];
    maxDamage?: number;
  };
}) {
  const state = params.state ?? createInitialState(params.masters);

  // items
  if (params.delta.items) {
    state.items = { ...params.delta.items };
  }

  // party status (HP/MP/level)
  if (Array.isArray(params.delta.partyStatus)) {
    for (const ps of params.delta.partyStatus) {
      const key = ps.id.replace(/^pc_/, "");
      const ch = state.characters[key] || {};
      ch.hp = ps.currentHp;
      ch.mp = ps.currentMp;
      if (ps.level) ch.level = ps.level;
      state.characters[key] = ch;
    }
  }

  // exp gain
  if (params.delta.exp && params.delta.exp > 0) {
    const partyIds: string[] = state.party ?? [];
    if (partyIds.length > 0) {
      const gainPer = Math.floor(params.delta.exp / partyIds.length);
      for (const pid of partyIds) {
        const ch = state.characters[pid] || { level: 1, exp: 0 };
        let level = ch.level ?? 1;
        let exp = (ch.exp ?? 0) + gainPer;
        while (level < 99 && exp >= nextExp(level)) {
          exp -= nextExp(level);
          level += 1;
        }
        ch.level = level;
        ch.exp = exp;
        // レベルアップ後の maxHp/maxMp の補正（現在HP/MPが上限を超えないように）
        const master = params.masters.characters.data.find((m: any) => m.id === pid);
        if (master) {
          const stats = scalePlayerStats(master.baseStats, master.growthPerLevel, level);
          if (ch.hp > stats.maxHp) ch.hp = stats.maxHp;
          if (ch.mp > stats.maxMp) ch.mp = stats.maxMp;
        }
        state.characters[pid] = ch;
      }
    }
  }

  // skill exp gain (optional)
  if (params.delta.skillExp) {
    for (const [skillId, add] of Object.entries(params.delta.skillExp)) {
      const sk = state.skills[skillId] || { level: 1, exp: 0 };
      let level = sk.level ?? 1;
      let exp = (sk.exp ?? 0) + (add ?? 0);
      while (level < 10 && exp >= skillNextExp(level)) {
        exp -= skillNextExp(level);
        level += 1;
      }
      sk.level = level;
      sk.exp = exp;
      state.skills[skillId] = sk;
    }
  }

  // max damage (単発最大)
  if (typeof params.delta.maxDamage === "number") {
    const cur = state.currentRunMaxDamage ?? 0;
    state.currentRunMaxDamage = Math.max(cur, params.delta.maxDamage);
  }

  // resume: 勝利後はメニューへ
  state.resume = { screen: "menu" };

  return state;
}

// battle delta を state_json に適用し、必要なら保存する
export async function applyBattleDelta(params: {
  pool: Pool;
  userId: number;
  masters: Masters;
  baseState?: any;
  persist?: boolean;
  currentFloor?: number;
  delta: {
    items?: Record<string, number>;
    exp?: number;
    skillExp?: Record<string, number>;
    partyStatus?: { id: string; currentHp: number; currentMp: number; level?: number }[];
    maxDamage?: number;
  };
}) {
  const repo = new UserStateRepository(params.pool);
  const persist = params.persist === true;

  let stateRow: any | null = null;
  if (params.baseState === undefined || persist) {
    stateRow = await getOrCreateUserState(params.pool, params.userId, params.masters);
  }

  const base =
    params.baseState !== undefined
      ? params.baseState
      : (stateRow as any)?.state_json || (stateRow as any)?.state || createInitialState();

  const nextState = applyBattleDeltaToStateObject({ masters: params.masters, state: base, delta: params.delta });

  if (persist) {
    const currentFloor = params.currentFloor ?? nextState.currentFloor ?? (stateRow as any)?.current_floor ?? 1;
    await repo.upsertState(params.userId, currentFloor, nextState);
  }

  return nextState;
}

function nextExp(level: number) {
  return Math.floor(50 * level * level);
}

function skillNextExp(level: number) {
  return level * 3;
}

