import { BattleState } from "./types";
import { Masters } from "../types";
import { resolveAction } from "./actions";

export function enemyTurn(state: BattleState, masters: Masters): void {
  if (state.turnOrder.length === 0) return;
  const idx = state.turnOrder[state.turnCursor];
  const actor = state.actors[idx as number];
  if (!actor || !actor.isEnemy || actor.currentHp <= 0) return;

  const targetsParty = state.party.filter((p) => p.currentHp > 0);
  if (targetsParty.length === 0) return;

  // Decide action: try to pick a skill
  const usableSkills = (actor.skillIds ?? []).filter((sid) => {
    if (sid === "attack_basic") return true;
    const m = masters.skills.data.find((s: any) => s.id === sid);
    if (!m) return false;
    return actor.currentMp >= (m.cost ?? 0);
  });

  let actionType: "attack" | "skill" = "attack";
  let skillId = "";

  if (usableSkills.length > 0) {
    // Randomly pick a usable skill
    const pick = usableSkills[Math.floor(Math.random() * usableSkills.length)];
    if (pick && pick !== "attack_basic") {
      actionType = "skill";
      skillId = pick;
    }
  }

  const target = targetsParty[Math.floor(Math.random() * targetsParty.length)];
  if (!target) return;

  if (actionType === "skill") {
    const sMaster = masters.skills.data.find((s: any) => s.id === skillId);
    let actualTargets = [target.id];

    // Handle ally/self targeting for enemy skills
    if (sMaster?.targetType === "ally") {
      const allies = state.enemies.filter((e) => e.currentHp > 0);
      const start = Math.floor(Math.random() * allies.length);
      const t = allies[start];
      if (t) actualTargets = [t.id];
    } else if (sMaster?.targetType === "self") {
      actualTargets = [actor.id];
    }

    resolveAction(
      state,
      actor,
      { type: "skill", skillId, targetIds: actualTargets },
      actualTargets,
      masters
    );
  } else {
    resolveAction(state, actor, { type: "attack" }, [target.id], masters);
  }
}

