import { Combatant } from "./types";

export function startOfTurn(combatant: Combatant, log: string[]) {
  // Apply DOT
  const dotEffects = combatant.conditions.filter((c) => c.kind === "dot");
  for (const c of dotEffects) {
    const val = c.value ?? 0;
    combatant.currentHp = Math.max(0, combatant.currentHp - val);
    log.push(`${combatant.name} はダメージを受けた (-${val})`);
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

