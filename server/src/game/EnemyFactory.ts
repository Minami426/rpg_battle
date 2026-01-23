import { Masters } from "../types";
import { Combatant, Stats } from "./types";

export const floorEnemyCost = (f: number) => {
  const base100 = 30 + f * 5 + Math.floor(f / 10) * 10;
  if (f <= 100) return base100;
  const base300 = base100 + (f - 100) * 12 + Math.floor((f - 100) / 10) * 25;
  if (f <= 300) return base300;
  return base300 + (f - 300) * 15;
};

export function generateEnemies(floor: number, masters: Masters): Combatant[] {
  const costLimit = floorEnemyCost(floor);
  const candidates = masters.enemies.data.filter((e) => {
    if (floor <= 100) {
      return floor >= e.appearMinFloor && floor <= e.appearMaxFloor;
    }
    return true; // 101以降は全候補
  });
  if (candidates.length === 0) return [];

  const enemies: Combatant[] = [];
  let totalCost = 0;
  const desiredCount = Math.min(5, Math.max(1, Math.floor(Math.random() * 3) + 2)); // 2〜4体目標

  const pickBoss = floor % 10 === 0;
  if (pickBoss) {
    const bosses = candidates.filter((c) => c.isBoss);
    if (bosses.length) {
      const pick = pickWeighted(bosses);
      const boss = pick?.enemy ?? bosses[Math.floor(Math.random() * bosses.length)];
      const level = enemyLevel(floor);
      const cost = effectiveCost(boss.baseCost, level);
      if (cost <= costLimit) {
        enemies.push(toCombatant(boss, level));
        totalCost += cost;
      }
    }
  }

  // fill normals
  const normals = candidates.filter((c) => !c.isBoss);
  while (enemies.length < desiredCount && normals.length > 0) {
    const pick = pickWeighted(normals) ?? { enemy: normals[0], index: 0 };
    const enemy = pick.enemy;
    const level = enemyLevel(floor);
    const cost = effectiveCost(enemy.baseCost, level);
    if (totalCost + cost <= costLimit) {
      enemies.push(toCombatant(enemy, level));
      totalCost += cost;
    } else {
      normals.splice(pick.index, 1);
    }
  }

  // fallback: if none picked
  if (enemies.length === 0) {
    const enemy = candidates[0];
    const level = enemyLevel(floor);
    enemies.push(toCombatant(enemy, level));
  }

  // disambiguate names
  const nameCounts: Record<string, number> = {};
  for (const e of enemies) {
    nameCounts[e.name] = (nameCounts[e.name] || 0) + 1;
  }
  const currentCounts: Record<string, number> = {};
  for (const e of enemies) {
    if (nameCounts[e.name] > 1) {
      const c = (currentCounts[e.name] || 0) + 1;
      currentCounts[e.name] = c;
      e.name = `${e.name}${String.fromCharCode(64 + c)}`;
    }
  }

  return enemies;
}

function enemyLevel(floor: number): number {
  const f = Math.max(1, floor);
  let base = 1;
  let variance = 0.15;
  if (f <= 100) {
    // 50階で42.5、100階で100になる二次曲線
    base = 0.003 * Math.pow(f, 2) + 0.7 * f;
    variance = 0.15;
  } else if (f <= 200) {
    base = 100 + (f - 100) * 1.75;
    variance = 0.1;
  } else {
    base = 275 + (f - 200) * 2.0;
    variance = 0.05;
  }
  const jitter = 1 + (Math.random() * 2 - 1) * variance;
  return Math.max(1, Math.floor(base * jitter));
}

function effectiveCost(baseCost: number, level: number): number {
  return baseCost + level * 2;
}

function toCombatant(e: any, level: number): Combatant {
  const stats: Stats = scaleStats(e.baseStats, e.growthPerLevel, level);
  return {
    id: `enemy_${e.id}_${Math.random().toString(36).slice(2, 7)}`,
    name: e.name,
    isEnemy: true,
    level,
    base: stats,
    currentHp: stats.maxHp,
    currentMp: stats.maxMp,
    conditions: [],
    guard: false,
    skillIds: e.skillIds ?? ["attack_basic"],
    baseExp: e.baseExp ?? 0,
  };
}

function pickWeighted(list: any[]): { enemy: any; index: number } | null {
  if (list.length === 0) return null;
  let total = 0;
  const weights = list.map((e) => {
    const baseExp = typeof e.baseExp === "number" ? e.baseExp : 0;
    // 指数を1.3に上げ、レア敵の出現率をさらに下げる
    const w = Math.floor(1_000_000 / Math.pow(baseExp + 1000, 1.3));
    const safe = Math.max(1, w);
    total += safe;
    return safe;
  });
  let r = Math.random() * total;
  for (let i = 0; i < list.length; i++) {
    r -= weights[i];
    if (r <= 0) {
      return { enemy: list[i], index: i };
    }
  }
  return { enemy: list[list.length - 1], index: list.length - 1 };
}

function scaleStats(base: Stats, growth: any, level: number): Stats {
  const lv = Math.max(1, level);
  const add = (key: keyof Stats) => base[key] + (lv - 1) * (growth?.[key] ?? 0);
  
  // HP/MPのインフレ倍率をプレイヤーと同等にする（Lv100で約821倍）
  const hpLvl = 1 + lv * 0.2 + Math.pow(lv, 2) * 0.08;

  return {
    maxHp: Math.floor(add("maxHp") * hpLvl),
    maxMp: Math.floor(add("maxMp") * hpLvl),
    atk: add("atk"),
    matk: add("matk"),
    def: add("def"),
    speed: add("speed"),
  };
}

