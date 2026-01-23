import { Combatant } from "./types";

export function startOfTurn(combatant: Combatant, log: string[]) {
  // Apply DOT
  const dotEffects = combatant.conditions.filter((c) => c.kind === "dot");
  for (const c of dotEffects) {
    const val = c.value ?? 0;
    // レベル倍率は付与時(actions.ts)に計算済みなので、ここではそのまま適用
    combatant.currentHp = Math.max(0, combatant.currentHp - val);
    log.push(`${combatant.name} はダメージを受けた (-${val})`);
  }
  // Apply regeneration (HP recovery)
  const regenEffects = combatant.conditions.filter(
    (c) => c.kind === "buff" && c.stat === "hp" && (c.value ?? 0) < 0
  );
  for (const c of regenEffects) {
    const val = Math.abs(c.value ?? 0);
    const oldHp = combatant.currentHp;
    combatant.currentHp = Math.min(combatant.base.maxHp, combatant.currentHp + val);
    const healed = combatant.currentHp - oldHp;
    if (healed > 0) {
      log.push(`${combatant.name} は回復した (+${healed})`);
    }
  }
  // Stun check
  const stunned = combatant.conditions.some((c) => c.kind === "stun");
  return { stunned };
}

export function endOfTurn(combatant: Combatant) {
  for (const c of combatant.conditions) {
    c.duration -= 1;
  }
  combatant.conditions = combatant.conditions.filter((c) => c.duration > 0);
  // guard resets at end of own turn
  combatant.guard = false;
}
