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
        const res = calcAttackDamage(actor, t);
        if (!res.isHit) {
          state.log.push(`${actor.name} の攻撃！ ミス！ ${t.name} にダメージを与えられない！`);
        } else {
          t.currentHp = Math.max(0, t.currentHp - res.damage);
          state.log.push(`${actor.name} の攻撃！ ${t.name} に ${res.damage} のダメージ`);
        }
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
      if (skill.id !== "attack_basic" && actor.conditions.some((c) => c.kind === "silence")) {
        state.log.push(`${actor.name} は封印されていて魔法（スキル）が使えない！`);
        break;
      }
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
          const res = calcSkillDamage(actor, t, skill);
          if (!res.isHit) {
            state.log.push(`${actor.name} の ${skill.name}! ミス！ ${t.name} にダメージを与えられない！`);
          } else {
            t.currentHp = Math.max(0, t.currentHp - res.damage);
            if (res.isCritical) {
              state.log.push(`${actor.name} の ${skill.name}! 会心の一撃！ ${t.name} に ${res.damage} のダメージ`);
            } else {
              state.log.push(`${actor.name} の ${skill.name}! ${t.name} に ${res.damage} のダメージ`);
            }
            applyConditionsFromSkill(skill, t, state, masters, actor);
            if (!actor.isEnemy && res.damage > state.maxDamageByParty) state.maxDamageByParty = res.damage;
          }
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
          applyConditionsFromSkill(skill, t, state, masters, actor);
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
          const percent = item.effect.power ?? 0;
          const heal = Math.floor(t.base.maxHp * (percent / 100));
          t.currentHp = Math.min(t.base.maxHp, t.currentHp + heal);
          state.log.push(`${actor.name} は ${item.name} を使った。${t.name} のHPが ${heal} 回復`);
        } else if (item.effect?.kind === "heal_mp") {
          const percent = item.effect.power ?? 0;
          const heal = Math.floor(t.base.maxMp * (percent / 100));
          t.currentMp = Math.min(t.base.maxMp, t.currentMp + heal);
          state.log.push(`${actor.name} は ${item.name} を使った。${t.name} のMPが ${heal} 回復`);
        } else if (item.effect?.kind === "heal_full") {
          t.currentHp = t.base.maxHp;
          t.currentMp = t.base.maxMp;
          state.log.push(`${actor.name} は ${item.name} を使った。${t.name} のHP/MPが全回復`);
        } else if (item.effect?.kind === "revive") {
          // 蘇生 (蘇生対象でなくても生きているキャラには効果なしとするか、蘇生対象を選ぶUI前提か。
          // ここでは対象が死んでいる場合のみ蘇生処理を行う)
          if (t.currentHp <= 0) {
            const power = item.effect.power ?? 50;
            const reviveHp = Math.floor(t.base.maxHp * (power / 100));
            t.currentHp = Math.max(1, reviveHp);
            t.currentMp = 0;
            t.conditions = [];
            t.guard = false;
            state.log.push(`${actor.name} は ${item.name} を使った。${t.name} は生き返った (HP ${reviveHp})`);
          } else {
            state.log.push(`${actor.name} は ${item.name} を使った。しかし何も起きなかった`);
          }
        } else if (item.effect?.kind === "buff") {
          const stat = item.effect.stat;
          const power = item.effect.power;
          const duration = item.effect.duration ?? 3;
          // バフ付与（Conditionとして扱う）
          // buff は id: buff_atk 等で管理しているが、簡易的に item_buff_{stat} とする
          // あるいは単純に既存の buff_atk 等を流用する方が綺麗だが、ここでは簡易実装
          // stat: atk, matk 等
          const condId = `buff_${stat}`;
          t.conditions.push({
            id: condId,
            kind: "buff",
            stat: stat,
            value: power,
            valueType: "multiply",
            duration: duration
          });
          state.log.push(`${actor.name} は ${item.name} を使った。${t.name} の${stat}が上がった`);
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

export function applyConditionsFromSkill(skill: any, target: Combatant, state: BattleState, masters?: Masters, actor?: Combatant) {
  if (!Array.isArray(skill.conditions)) return;
  const conditionMaster = masters?.conditions.data ?? [];
  for (const cond of skill.conditions) {
    if (Math.random() > (cond.chance ?? 1)) continue;

    // マスタデータから状態異常の詳細を取得
    const condMaster = conditionMaster.find((c: any) => c.id === cond.conditionId);
    if (!condMaster) continue;

    let value = condMaster.value;
    // DOT（毒・火傷）の場合、この時点で使用者のステータス・スキルレベルに基づいてダメージを計算して焼き付ける
    if (condMaster.conditionType === "dot" || inferKind(cond.conditionId, condMaster) === "dot") {
      const baseVal = condMaster.value ?? 0;
      // 使用者が不明な場合はLv1相当とする
      const actorLevel = actor?.level ?? 1;
      // スキルレベル（なければ1）
      const skillLevel = actor?.skillLevels?.[skill.id] ?? 1;

      const attackerLvlMult = 1 + actorLevel * 0.1 + Math.pow(actorLevel, 2) * 0.05;
      const skillLvlMult = 1 + (skillLevel - 1) * 0.1; // Lv1につき+10%

      value = Math.floor(baseVal * attackerLvlMult * skillLvlMult);
    }

    target.conditions.push({
      id: cond.conditionId,
      kind: condMaster.conditionType || inferKind(cond.conditionId, condMaster),
      stat: condMaster.stat,
      value: value,
      valueType: condMaster.valueType,
      duration: condMaster.duration,
    });
    state.log.push(`${target.name} に ${condMaster.name || cond.conditionId} が付与された`);
  }
}

function inferKind(id: string, cond: any): "dot" | "buff" | "debuff" | "stun" | "silence" | "blind" {
  if (cond.conditionType) return cond.conditionType;
  if (id.includes("poison") || id.includes("burn")) return "dot";
  if (id.includes("stun") || id.includes("sleep") || id.includes("paralysis")) return "stun";
  if (id.includes("blind")) return "blind";
  if (id.includes("silence")) return "silence";
  return "buff";
}
