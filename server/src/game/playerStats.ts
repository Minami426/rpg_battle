import { Stats } from "./types";

export function scalePlayerStats(base: Stats, growth: any, level: number): Stats {
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

// conditions: buff/debuff (valueType multiply/add)
export function getEffectiveStats(combatant: any): Stats {
  const base = combatant.base;
  let stats: Stats = { ...base };
  for (const c of combatant.conditions ?? []) {
    if (c.kind !== "buff" && c.kind !== "debuff") continue;
    const key = c.stat as keyof Stats;
    if (!key) continue;
    const val = c.value ?? 0;
    if (c.valueType === "multiply") {
      stats[key] = Math.floor(stats[key] * (1 + val));
    } else if (c.valueType === "add") {
      stats[key] = stats[key] + val;
    }
  }
  return stats;
}

