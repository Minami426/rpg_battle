import { BattleState } from "./types";
import { resolveAction } from "./actions";
import { startOfTurn, endOfTurn } from "./ConditionSystem";

export function enemyTurn(state: BattleState): void {
  if (state.turnOrder.length === 0) return;
  const idx = state.turnOrder[state.turnCursor];
  const actor = state.actors[idx as number];
  if (!actor || !actor.isEnemy || actor.currentHp <= 0) return;
  const targetsParty = state.party.filter((p) => p.currentHp > 0);
  if (targetsParty.length === 0) return;

  const start = startOfTurn(actor, state.log);
  if (start.stunned) {
    state.log.push(`${actor.name} は行動できない！`);
    endOfTurn(actor);
    return;
  }

  // Simple AI per spec: priority heal->aoe->random
  const target = targetsParty[Math.floor(Math.random() * targetsParty.length)];
  if (target) {
    resolveAction(state, actor, { type: "attack" }, [target.id]);
  }
  endOfTurn(actor);
}

