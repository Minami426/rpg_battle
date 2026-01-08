import { Router } from "express";
import { authGuard } from "../middleware/authGuard";
import { BattleMemoryStore } from "../game/BattleMemoryStore";
import { BattleService } from "../game/BattleService";
import { getOrCreateUserState } from "../utils/stateHelpers";

const router = Router();
const store = new BattleMemoryStore();

router.post("/start", authGuard, async (req, res) => {
  try {
    const masters = (req as any).masters;
    const db = (req as any).db;
    const userId = (req as any).userId as number;

    // 要件: 保存は終了/全滅のみ。戦闘開始はクライアントのローカル進捗を受け取って開始できる。
    // （MVP: セキュリティ非ゴールのため、state/floor/party の改竄耐性は Phase2 で検討）
    const body = req.body ?? {};
    const providedState = body.state;
    const providedParty = body.party;
    const providedFloor = body.floor;

    let stateJson: any;
    let party: string[];
    let floor: number;

    if (providedState && Array.isArray(providedParty) && typeof providedFloor === "number") {
      stateJson = providedState;
      party = providedParty;
      floor = providedFloor;
    } else {
      // 後方互換: 旧クライアントはDB state_json から開始
      const stateRow = await getOrCreateUserState(db, userId, masters);
      stateJson = (stateRow as any).state_json || (stateRow as any).state || {};
      party = Array.isArray(stateJson.party) ? stateJson.party : [];
      floor = stateRow.current_floor ?? stateJson.currentFloor ?? 1;
    }

    if (!Array.isArray(party) || party.length === 0) {
      return res.status(400).json({ ok: false, error: { code: "BAD_REQUEST", message: "party is empty" } });
    }
    if (typeof floor !== "number" || !Number.isFinite(floor) || floor < 1) {
      return res.status(400).json({ ok: false, error: { code: "BAD_REQUEST", message: "invalid floor" } });
    }

    const service = new BattleService(store, masters);
    const battle = service.startBattle({
      floor,
      partyIds: party,
      state: stateJson,
    });
    res.json({ ok: true, data: battle });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: { code: "INTERNAL", message: "failed to start battle" } });
  }
});

router.post("/act", authGuard, (req, res) => {
  try {
    const { battleId, actorId, action, targetIds } = req.body ?? {};
    if (!battleId || !actorId || !action) {
      return res.status(400).json({ ok: false, error: { code: "BAD_REQUEST", message: "battleId/actorId/action required" } });
    }
    const masters = (req as any).masters;
    // サーバ権威: 手番/敵味方の整合性をチェック（破綻防止）
    const state = store.get(battleId as string);
    if (!state) {
      return res.status(404).json({ ok: false, error: { code: "NOT_FOUND", message: "battle not found" } });
    }
    const idx = state.turnOrder?.[state.turnCursor];
    const expected = typeof idx === "number" ? state.actors?.[idx] : null;
    if (!expected) {
      return res.status(500).json({ ok: false, error: { code: "INTERNAL", message: "invalid battle turn state" } });
    }
    if (expected.id !== actorId) {
      return res.status(400).json({ ok: false, error: { code: "BAD_REQUEST", message: "not your turn" } });
    }
    if (expected.isEnemy) {
      return res.status(400).json({ ok: false, error: { code: "BAD_REQUEST", message: "enemy turn is server-controlled" } });
    }
    const service = new BattleService(store, masters);
    const result = service.act({
      battleId,
      actorId,
      payload: action,
      targetIds: targetIds ?? [],
    });
    res.json({ ok: true, data: result });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: { code: "INTERNAL", message: "failed to act" } });
  }
});

router.get("/:battleId", authGuard, (req, res) => {
  const battleId = req.params.battleId;
  const masters = (req as any).masters;
  const service = new BattleService(store, masters);
  const state = service["store"].get(battleId as string);
  if (!state) return res.status(404).json({ ok: false, error: { code: "NOT_FOUND", message: "battle not found" } });
  res.json({ ok: true, data: state });
});

export default router;

