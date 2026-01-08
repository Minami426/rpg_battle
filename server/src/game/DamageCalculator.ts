import { Combatant } from "./types";
import { getEffectiveStats } from "./playerStats";

type Skill = any; // master skill shape

const randFloat = (min: number, max: number) => Math.random() * (max - min) + min;

export function calcAttackDamage(attacker: Combatant, defender: Combatant) {
  const atkStats = getEffectiveStats(attacker);
  const defStats = getEffectiveStats(defender);
  const base = atkStats.atk - Math.floor(defStats.def * 0.5);
  const lvl = 1 + attacker.level * 0.02;
  const variance = randFloat(0.9, 1.1);
  let damage = Math.floor(Math.max(1, base) * lvl * variance);
  return applyDefense(damage, defender.guard);
}

export function calcSkillDamage(attacker: Combatant, defender: Combatant, skill: Skill) {
  const atkStats = getEffectiveStats(attacker);
  const defStats = getEffectiveStats(defender);
  const stat = skill.powerType === "magical" ? atkStats.matk : atkStats.atk;
  const base = stat * (skill.power / 100) - Math.floor(defStats.def * 0.5);
  const lvl = 1 + attacker.level * 0.02;
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
  const val = power * (1 + attacker.level * 0.02) * randFloat(0.95, 1.05);
  return Math.floor(val);
}

function applyDefense(damage: number, guard: boolean) {
  if (guard) return Math.floor(damage * 0.5);
  return damage;
}

