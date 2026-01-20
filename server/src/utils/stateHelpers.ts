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
    expStockAdd?: number;
    skillExp?: Record<string, number>;
    partyStatus?: { id: string; currentHp: number; currentMp: number; level?: number }[];
    maxDamage?: number;
  };
}) {
  const state = params.state ?? createInitialState(params.masters);
  const normalizePartyId = (combatantId: string) => {
    const raw = combatantId.replace(/^pc_/, "");
    const last = raw.lastIndexOf("_");
    return last >= 0 ? raw.slice(0, last) : raw;
  };

  // items
  if (params.delta.items) {
    state.items = { ...params.delta.items };
  }

  // party status (HP/MP/level)
  if (Array.isArray(params.delta.partyStatus)) {
    for (const ps of params.delta.partyStatus) {
      const key = normalizePartyId(ps.id);
      const ch = state.characters[key] || {};
      ch.hp = ps.currentHp;
      ch.mp = ps.currentMp;
      if (ps.level) ch.level = ps.level;
      state.characters[key] = ch;
    }
  }

  // exp stock gain (battle reward)
  if (params.delta.expStockAdd && params.delta.expStockAdd > 0) {
    const current = typeof state.expStock === "number" ? state.expStock : 0;
    state.expStock = current + params.delta.expStockAdd;
  }

  // skill exp gain (optional) - 現在はメニューでの割り振りを主とする
  if (params.delta.skillExp) {
    for (const [skillId, add] of Object.entries(params.delta.skillExp)) {
      const sk = state.skills[skillId] || { level: 1, exp: 0 };
      let level = sk.level ?? 1;
      let exp = (sk.exp ?? 0) + (add ?? 0);
      while (exp >= skillNextExp(level)) {
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
    expStockAdd?: number;
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
  return Math.floor(30 * level * level + 1000);
}

function skillNextExp(level: number) {
  return Math.floor(7.5 * level * level + 250);
}

export function allocateExpToStateObject(params: {
  masters: Masters;
  state: any;
  allocations: { kind: "character" | "skill"; id: string; amount: number }[];
}) {
  const state = params.state ?? createInitialState(params.masters);
  const total = params.allocations.reduce((sum, a) => sum + (a.amount || 0), 0);
  const current = typeof state.expStock === "number" ? state.expStock : 0;
  if (total <= 0) return { state, result: [] };
  if (total > current) {
    throw new Error("EXP stock is insufficient");
  }

  const result: any[] = [];
  for (const a of params.allocations) {
    if (a.amount <= 0) continue;
    if (a.kind === "character") {
      const ch = state.characters[a.id] || { level: 1, exp: 0 };
      const prevLevel = ch.level ?? 1;
      const maxLevel = (state.currentFloor ?? 1) <= 100 ? 100 : 200;
      let level = prevLevel;
      let exp = (ch.exp ?? 0) + a.amount;
      while (level < maxLevel && exp >= nextExp(level)) {
        exp -= nextExp(level);
        level += 1;
      }
      ch.level = level;
      ch.exp = exp;
      const master = params.masters.characters.data.find((m: any) => m.id === a.id);
      if (master) {
        const stats = scalePlayerStats(master.baseStats, master.growthPerLevel, level);
        if (level > prevLevel) {
          ch.hp = stats.maxHp;
          ch.mp = stats.maxMp;
        } else {
          if (ch.hp > stats.maxHp) ch.hp = stats.maxHp;
          if (ch.mp > stats.maxMp) ch.mp = stats.maxMp;
        }
      }
      state.characters[a.id] = ch;
      if (level > prevLevel) {
        const learnedSkills = master
          ? learnSkillsForCharacter({ state, master, characterId: a.id, newLevel: level })
          : [];
        result.push({ kind: "character", id: a.id, fromLevel: prevLevel, toLevel: level, learnedSkills });
      }
    } else if (a.kind === "skill") {
      if (!state.skills?.[a.id]) {
        if (isSkillLearnedInState({ state, masters: params.masters, skillId: a.id })) {
          if (!state.skills) state.skills = {};
          state.skills[a.id] = { level: 1, exp: 0 };
        } else {
          throw new Error(`Skill ${a.id} is not learned`);
        }
      }
      const sk = state.skills[a.id] || { level: 1, exp: 0 };
      const prevLevel = sk.level ?? 1;
      let level = prevLevel;
      let exp = (sk.exp ?? 0) + a.amount;
      while (exp >= skillNextExp(level)) {
        exp -= skillNextExp(level);
        level += 1;
      }
      sk.level = level;
      sk.exp = exp;
      state.skills[a.id] = sk;
      if (level > prevLevel) {
        result.push({ kind: "skill", id: a.id, fromLevel: prevLevel, toLevel: level });
      }
    }
  }

  state.expStock = current - total;
  return { state, result };
}

function isSkillLearnedInState(params: { state: any; masters: Masters; skillId: string }): boolean {
  const { state, masters, skillId } = params;
  for (const [cid, ch] of Object.entries(state.characters ?? {})) {
    if (Array.isArray((ch as any).skillIds) && (ch as any).skillIds.includes(skillId)) {
      return true;
    }
    const master = masters.characters.data.find((c: any) => c.id === cid);
    if (Array.isArray(master?.initialSkillIds) && master.initialSkillIds.includes(skillId)) {
      return true;
    }
  }
  return false;
}

function learnSkillsForCharacter(params: {
  state: any;
  master: any;
  characterId: string;
  newLevel: number;
}): string[] {
  const { state, master, characterId, newLevel } = params;
  const learnable = Array.isArray(master.learnableSkillIds) ? master.learnableSkillIds : [];
  const learnLevels = master.skillLearnLevels ?? {};
  const ch = state.characters[characterId] || {};
  const currentSkillIds: string[] = Array.isArray(ch.skillIds)
    ? [...ch.skillIds]
    : Array.isArray(master.initialSkillIds)
      ? [...master.initialSkillIds]
      : [];
  const learned: string[] = [];

  for (const sid of currentSkillIds) {
    if (!state.skills?.[sid]) {
      if (!state.skills) state.skills = {};
      state.skills[sid] = { level: 1, exp: 0 };
    }
  }

  for (const sid of learnable) {
    const req = learnLevels[sid];
    if (typeof req !== "number") continue;
    if (newLevel < req) continue;
    if (currentSkillIds.includes(sid)) continue;
    currentSkillIds.push(sid);
    if (!state.skills?.[sid]) {
      if (!state.skills) state.skills = {};
      state.skills[sid] = { level: 1, exp: 0 };
    }
    learned.push(sid);
  }

  ch.skillIds = currentSkillIds;
  state.characters[characterId] = ch;
  return learned;
}

