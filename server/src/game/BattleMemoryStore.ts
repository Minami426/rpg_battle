import { BattleState } from "./types";

export class BattleMemoryStore {
  private store = new Map<string, BattleState>();

  create(state: BattleState) {
    this.store.set(state.battleId, state);
  }

  get(battleId: string): BattleState | null {
    return this.store.get(battleId) ?? null;
  }

  update(state: BattleState) {
    this.store.set(state.battleId, state);
  }

  delete(battleId: string) {
    this.store.delete(battleId);
  }
}

