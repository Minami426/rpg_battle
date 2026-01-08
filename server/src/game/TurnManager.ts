import { Combatant } from "./types";

export function buildTurnOrder(combatants: Combatant[]): number[] {
  // initiative = speed * level ; ties resolved by shuffle with deterministic seed (Math.random at start)
  const withInit = combatants.map((c, idx) => ({
    idx,
    initiative: c.base.speed * c.level,
    speed: c.base.speed,
    rand: Math.random(),
  }));
  withInit.sort((a, b) => {
    if (b.initiative !== a.initiative) return b.initiative - a.initiative;
    if (b.speed !== a.speed) return b.speed - a.speed;
    return b.rand - a.rand;
  });
  return withInit.map((x) => x.idx);
}

