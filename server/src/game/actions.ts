import { Masters } from "../types";
import { calcAttackDamage, calcHealing, calcSkillDamage } from "./DamageCalculator";
import { BattleState, Combatant, ActionPayload } from "./types";

export function resolveAction(
  state: BattleState,
  actor: Combatant,
  payload: ActionPayload,
  targetIds: string[],
  masters?: Masters
) {
  const targets = state.actors.filter((c) => targetIds.includes(c.id));
  switch (payload.type) {
    case "attack": {
      for (const t of targets) {
        const dmg = calcAttackDamage(actor, t);
        t.currentHp = Math.max(0, t.currentHp - dmg);
        state.log.push(`${actor.name} の攻撃！ ${t.name} に ${dmg} のダメージ`);
      }
      break;
    }
    case "skill": {
      if (!masters) return;
      const skill = masters.skills.data.find((s: any) => s.id === payload.skillId);
      if (!skill) {
        state.log.push(`${actor.name} は何もしなかった`);
        break;
      }

      // --- 使用可否チェック（要件: unlockLevel/prerequisiteIds を満たす場合のみ使用可能） ---
      if (skill.isPassive) {
        state.log.push(`${actor.name} は ${skill.name} を使えない`);
        break;
      }
      if (!Array.isArray(actor.skillIds) || !actor.skillIds.includes(skill.id)) {
        state.log.push(`${actor.name} は ${skill.name} を覚えていない`);
        break;
      }
      const unlockLevel = skill.unlockLevel ?? 1;
      if (actor.level < unlockLevel) {
        state.log.push(`${actor.name} は ${skill.name} をまだ使えない`);
        break;
      }
      if (Array.isArray(skill.prerequisiteIds) && skill.prerequisiteIds.length > 0) {
        for (const pid of skill.prerequisiteIds) {
          const pre = masters.skills.data.find((s: any) => s.id === pid);
          if (!pre) {
            state.log.push(`${actor.name} は ${skill.name} を使えない（前提スキル不明）`);
            return;
          }
          const preUnlock = pre.unlockLevel ?? 1;
          if (actor.level < preUnlock) {
            state.log.push(`${actor.name} は ${skill.name} を使えない（前提: ${pre.name}）`);
            return;
          }
        }
      }

      const resolveTargetsByType = () => {
        const tt = skill.targetType;
        if (tt === "self") return [actor];
        if (tt === "ally") return targets.filter((t) => !t.isEnemy);
        if (tt === "enemy") return targets.filter((t) => t.isEnemy);
        return targets;
      };
      const typedTargets = resolveTargetsByType();

      // revive は「戦闘不能(HP=0)の味方」専用
      const isRevive = skill.id === "revive";
      const reviveTargets = isRevive ? typedTargets.filter((t) => !t.isEnemy && t.currentHp <= 0) : [];
      if (isRevive && reviveTargets.length === 0) {
        state.log.push(`${actor.name} は ${skill.name} を唱えた… しかし効果がなかった`);
        break;
      }

      // MP消費
      const cost = skill.cost ?? 0;
      if (actor.currentMp < cost) {
        state.log.push(`${actor.name} はMPが足りない`);
        break;
      }
      actor.currentMp -= cost;
      if (skill.skillType === "attack") {
        for (const t of typedTargets) {
          const dmg = calcSkillDamage(actor, t, skill);
          t.currentHp = Math.max(0, t.currentHp - dmg);
          state.log.push(`${actor.name} の ${skill.name}! ${t.name} に ${dmg} のダメージ`);
          applyConditionsFromSkill(skill, t, state, masters);
          if (!actor.isEnemy && dmg > state.maxDamageByParty) state.maxDamageByParty = dmg;
        }
      } else if (skill.skillType === "heal") {
        if (isRevive) {
          for (const t of reviveTargets) {
            const revivedHp = Math.max(1, Math.floor(t.base.maxHp * 0.3));
            t.currentHp = revivedHp;
            t.currentMp = 0;
            t.conditions = [];
            t.guard = false;
            state.log.push(`${actor.name} は ${skill.name} を唱えた！ ${t.name} は生き返った (HP ${revivedHp})`);
          }
        } else {
          for (const t of typedTargets) {
            if (t.currentHp <= 0) {
              state.log.push(`${t.name} は戦闘不能のため回復できない`);
              continue;
            }
            const heal = calcHealing(actor, skill.power ?? 0);
            t.currentHp = Math.min(t.base.maxHp, t.currentHp + heal);
            state.log.push(`${actor.name} は ${t.name} を回復した (+${heal})`);
          }
        }
      } else if (skill.skillType === "buff" || skill.skillType === "debuff") {
        for (const t of typedTargets) {
          applyConditionsFromSkill(skill, t, state, masters);
          state.log.push(`${actor.name} は ${skill.name} を使った`);
        }
      }
      break;
    }
    case "item": {
      if (!masters) return;
      const item = masters.items.data.find((i: any) => i.id === payload.itemId);
      if (!item) {
        state.log.push(`${actor.name} は何もしなかった`);
        break;
      }
      if (item.battleUsable === false) {
        state.log.push(`${actor.name} は ${item.name} を戦闘中に使えない`);
        break;
      }
      const stock = state.items[item.id] ?? 0;
      if (stock <= 0) {
        state.log.push(`${actor.name} は ${item.name} はもうない！`);
        break;
      }
      state.items[item.id] = stock - 1;

      // 簡易効果: heal_hp / heal_mp / heal_full のみ
      for (const t of targets) {
        if (item.effect?.kind === "heal_hp") {
          const heal = item.effect.power ?? 0;
          t.currentHp = Math.min(t.base.maxHp, t.currentHp + heal);
          state.log.push(`${actor.name} は ${item.name} を使った。${t.name} のHPが ${heal} 回復`);
        } else if (item.effect?.kind === "heal_mp") {
          const heal = item.effect.power ?? 0;
          t.currentMp = Math.min(t.base.maxMp, t.currentMp + heal);
          state.log.push(`${actor.name} は ${item.name} を使った。${t.name} のMPが ${heal} 回復`);
        } else if (item.effect?.kind === "heal_full") {
          t.currentHp = t.base.maxHp;
          t.currentMp = t.base.maxMp;
          state.log.push(`${actor.name} は ${item.name} を使った。${t.name} のHP/MPが全回復`);
        } else {
          state.log.push(`${actor.name} は ${item.name} を使った`);
        }
      }
      break;
    }
    case "defend": {
      actor.guard = true;
      state.log.push(`${actor.name} は ぼうぎょした`);
      break;
    }
  }
}

export function applyConditionsFromSkill(skill: any, target: Combatant, state: BattleState, masters?: Masters) {
  if (!Array.isArray(skill.conditions)) return;
  const conditionMaster = masters?.conditions.data ?? [];
  for (const cond of skill.conditions) {
    if (Math.random() > (cond.chance ?? 1)) continue;
    
    // マスタデータから状態異常の詳細を取得
    const condMaster = conditionMaster.find((c: any) => c.id === cond.conditionId);
    if (!condMaster) continue;
    
    target.conditions.push({
      id: cond.conditionId,
      kind: condMaster.conditionType || inferKind(cond.conditionId, condMaster),
      stat: condMaster.stat,
      value: condMaster.value,
      valueType: condMaster.valueType,
      duration: condMaster.duration,
    });
    state.log.push(`${target.name} に ${condMaster.name || cond.conditionId} が付与された`);
  }
}

function inferKind(id: string, cond: any): "dot" | "buff" | "debuff" | "stun" {
  if (cond.conditionType) return cond.conditionType;
  if (id.includes("poison") || id.includes("burn")) return "dot";
  if (id.includes("stun")) return "stun";
  return "buff";
}
