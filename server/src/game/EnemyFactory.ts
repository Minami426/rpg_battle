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
      const boss = bosses[Math.floor(Math.random() * bosses.length)];
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
    const idx = Math.floor(Math.random() * normals.length);
    const enemy = normals[idx];
    const level = enemyLevel(floor);
    const cost = effectiveCost(enemy.baseCost, level);
    if (totalCost + cost <= costLimit) {
      enemies.push(toCombatant(enemy, level));
      totalCost += cost;
    } else {
      normals.splice(idx, 1);
    }
  }

  // fallback: if none picked
  if (enemies.length === 0) {
    const enemy = candidates[0];
    const level = enemyLevel(floor);
    enemies.push(toCombatant(enemy, level));
  }
  return enemies;
}

function enemyLevel(floor: number): number {
  return Math.max(1, Math.floor(floor / 2));
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
  };
}

function scaleStats(base: Stats, growth: any, level: number): Stats {
  const lv = Math.max(1, level);
  const add = (key: keyof Stats) => base[key] + (lv - 1) * (growth?.[key] ?? 0);
  return {
    maxHp: add("maxHp"),
    maxMp: add("maxMp"),
    atk: add("atk"),
    matk: add("matk"),
    def: add("def"),
    speed: add("speed"),
  };
}

