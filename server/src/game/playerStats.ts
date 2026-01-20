import { Stats } from "./types";

export function scalePlayerStats(base: Stats, growth: any, level: number): Stats {
  const lv = Math.max(1, level);
  const add = (key: keyof Stats) => base[key] + (lv - 1) * (growth?.[key] ?? 0);
  
  // HP/MPのインフレ倍率を調整（Lv100で約821倍）
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

