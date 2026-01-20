import { Combatant } from "./types";
import { getEffectiveStats } from "./playerStats";

type Skill = any; // master skill shape

const randFloat = (min: number, max: number) => Math.random() * (max - min) + min;

export function calcAttackDamage(attacker: Combatant, defender: Combatant) {
  const atkStats = getEffectiveStats(attacker);
  const defStats = getEffectiveStats(defender);
  // 防御力による詰みを防ぐ減衰式: ATK^2 / (ATK + DEF*0.5)
  const base = (Math.pow(atkStats.atk, 2)) / (atkStats.atk + defStats.def * 0.5);
  // レベル倍率を調整（Lv100で約511倍）
  const lvl = 1 + attacker.level * 0.1 + Math.pow(attacker.level, 2) * 0.05;
  const variance = randFloat(0.9, 1.1);
  let damage = Math.floor(Math.max(1, base) * lvl * variance);
  return applyDefense(damage, defender.guard);
}

export function calcSkillDamage(attacker: Combatant, defender: Combatant, skill: Skill) {
  const atkStats = getEffectiveStats(attacker);
  const defStats = getEffectiveStats(defender);
  const stat = skill.powerType === "magical" ? atkStats.matk : atkStats.atk;
  // 基礎威力を計算
  const powerMult = skill.power / 100;
  const base = (Math.pow(stat * powerMult, 2)) / (stat * powerMult + defStats.def * 0.5);
  // レベル倍率
  const lvl = 1 + attacker.level * 0.1 + Math.pow(attacker.level, 2) * 0.05;
  const variance = randFloat(0.9, 1.1);
  let damage = Math.floor(Math.max(1, base) * lvl * variance);
  // accuracy
  if (Math.random() > (skill.accuracy ?? 1)) {
    damage = 0;
  }
  // crit
  if (damage > 0 && Math.random() < (skill.critRate ?? 0)) {
    damage = Math.floor(damage * (skill.critMag ?? 1.5));
  }
  return applyDefense(damage, defender.guard);
}

export function calcHealing(attacker: Combatant, power: number) {
  // 回復も同様にスケール
  const lvl = 1 + attacker.level * 0.1 + Math.pow(attacker.level, 2) * 0.05;
  const val = power * lvl * randFloat(0.95, 1.05);
  return Math.floor(val);
}

function applyDefense(damage: number, guard: boolean) {
  if (guard) return Math.floor(damage * 0.5);
  return damage;
}

