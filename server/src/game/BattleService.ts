import { Masters } from "../types";
import { BattleMemoryStore } from "./BattleMemoryStore";
import { BattleState, Combatant, ActionPayload } from "./types";
import { buildTurnOrder } from "./TurnManager";
import { resolveAction } from "./actions";
import { startOfTurn, endOfTurn } from "./ConditionSystem";
import { generateEnemies } from "./EnemyFactory";
import { scalePlayerStats } from "./playerStats";
import { enemyTurn } from "./EnemyAI";
import { calcExpReward } from "./ExperienceService";

export class BattleService {
  constructor(private store: BattleMemoryStore, private masters: Masters) {}

  startBattle(params: {
    floor: number;
    partyIds: string[];
    state: any;
  }): BattleState {
    const party = this.buildParty(params.partyIds, params.state);
    const enemies = generateEnemies(params.floor, this.masters);
    const actors: Combatant[] = [...party, ...enemies];
    const turnOrder = buildTurnOrder(actors);
    const battleId = `b_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const state: BattleState = {
      battleId,
      floor: params.floor,
      party,
      enemies,
      items: { ...(params.state?.items ?? {}) },
      actors,
      turnOrder,
      turnCursor: 0,
      log: ["戦闘開始！"],
      winner: null,
      maxDamageByParty: 0,
    };
    this.store.create(state);
    return state;
  }

  act(params: {
    battleId: string;
    actorId: string;
    payload: ActionPayload;
    targetIds: string[];
  }): { state: BattleState; deltaState: any } {
    const state = this.store.get(params.battleId);
    if (!state) {
      throw new Error("battle not found");
    }
    const actor = state.actors.find((c) => c.id === params.actorId);
    if (!actor || actor.currentHp <= 0) {
      // 戦闘不能のユニットの手番はスキップして進行させる（詰み防止）
      advanceCursor(state);
      autoEnemyTurns(state, this.masters);
      determineWinner(state);
      this.store.update(state);
      return { state, deltaState: {} };
    }

    // Start of turn effects
    const start = startOfTurn(actor, state.log);
    if (start.stunned) {
      state.log.push(`${actor.name} は行動できない！`);
      endOfTurn(actor);
      advanceCursor(state);
      autoEnemyTurns(state, this.masters);
      determineWinner(state);
      this.store.update(state);
      return { state, deltaState: {} };
    }

    // Resolve player action
    resolveAction(state, actor, params.payload, params.targetIds, this.masters);

    // End of turn cleanup
    endOfTurn(actor);
    advanceCursor(state);

    // Enemy turns auto-progress until next player needed or battle ends
    autoEnemyTurns(state, this.masters);

    determineWinner(state);
    this.store.update(state);
    const deltaState: any = {
      items: state.items,
      maxDamage: state.maxDamageByParty,
      partyStatus: state.party.map((p) => ({
        id: p.id.replace(/^pc_/, ""),
        currentHp: p.currentHp,
        currentMp: p.currentMp,
        level: p.level,
      })),
    };
    if (state.winner === "party") {
      const expStockAdd = calcExpReward({
        enemies: state.enemies.map((e) => ({ level: e.level, baseExp: e.baseExp })),
      });
      deltaState.expStockAdd = expStockAdd;
      state.log.push(`勝利！ 経験値ストック +${expStockAdd}`);
    } else if (state.winner === "enemies") {
      deltaState.gameOver = true;
      deltaState.resetState = true; // クライアントはこの後 /api/state/reset を呼ぶ想定
      state.log.push(`敗北……`);
      state.log.push(`全滅した……`);
    }
    return { state, deltaState };
  }

  private buildParty(partyIds: string[], state: any): Combatant[] {
    const charsMaster = this.masters.characters.data;
    return partyIds.map((id, idx) => {
      const m = charsMaster.find((c: any) => c.id === id);
      const st = state?.characters?.[id];
      const level = st?.level ?? 1;
      const stats = scalePlayerStats(m?.baseStats, m?.growthPerLevel, level);
      const hp = st?.hp ?? stats.maxHp;
      const mp = st?.mp ?? stats.maxMp;
      const learnedSkillIds =
        (Array.isArray(st?.skillIds) && st.skillIds.length > 0)
          ? st.skillIds
          : (Array.isArray(m?.initialSkillIds) ? m.initialSkillIds : []);
      return {
        id: `pc_${id}_${idx}`,
        name: m?.name ?? id,
        isEnemy: false,
        level,
        base: stats,
        currentHp: hp,
        currentMp: mp,
        conditions: [],
        guard: false,
        skillIds: learnedSkillIds.length > 0 ? learnedSkillIds : ["attack_basic"],
      };
    });
  }
}

function advanceCursor(state: BattleState) {
  if (state.turnOrder.length === 0) return;
  state.turnCursor = (state.turnCursor + 1) % state.turnOrder.length;
}

function autoEnemyTurns(state: BattleState, masters: Masters) {
  let safety = 0;
  while (safety < 50) {
    safety++;
    if (state.turnOrder.length === 0) break;
    const idx = state.turnOrder[state.turnCursor];
    const actor = state.actors[idx as number];
    if (!actor || actor.currentHp <= 0) {
      advanceCursor(state);
      continue;
    }
    if (!actor.isEnemy) break; // stop when it's a player's turn

    startOfTurn(actor, state.log);
    enemyTurn(state);
    endOfTurn(actor);
    advanceCursor(state);
    determineWinner(state);
    if (state.winner) break;
  }
}

function determineWinner(state: BattleState) {
  const partyAlive = state.party.some((c) => c.currentHp > 0);
  const enemiesAlive = state.enemies.some((c) => c.currentHp > 0);
  if (!partyAlive) state.winner = "enemies";
  else if (!enemiesAlive) state.winner = "party";
  else state.winner = null;
}

