import { Router } from "express";
import { authGuard } from "../middleware/authGuard";
import { UserStateRepository } from "../db/UserStateRepository";
import { createInitialState } from "../utils/initialState";
import { applyBattleDelta, allocateExpToStateObject } from "../utils/stateHelpers";
import { scalePlayerStats } from "../game/playerStats";

const router = Router();

// GET /api/state
router.get("/", authGuard, async (req, res) => {
  try {
    const pool = (req as any).db;
    const masters = (req as any).masters;
    const userId = (req as any).userId as number;
    const stateRepo = new UserStateRepository(pool);
    const state = await stateRepo.getState(userId);
    if (!state) {
      const initial = createInitialState(masters);
      await stateRepo.upsertState(userId, 1, initial);
      return res.json({ ok: true, data: { user_id: userId, current_floor: 1, state_json: initial } });
    }
    res.json({ ok: true, data: state });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: { code: "INTERNAL", message: "failed to get state" } });
  }
});

// PUT /api/state
router.put("/", authGuard, async (req, res) => {
  try {
    const pool = (req as any).db;
    const userId = (req as any).userId as number;
    const stateRepo = new UserStateRepository(pool);
    const { currentFloor, state } = req.body ?? {};
    if (typeof currentFloor !== "number" || state === undefined) {
      return res.status(400).json({ ok: false, error: { code: "BAD_REQUEST", message: "currentFloor/state required" } });
    }
    await stateRepo.upsertState(userId, currentFloor, state);
    res.json({ ok: true, data: {} });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: { code: "INTERNAL", message: "failed to save state" } });
  }
});

// POST /api/state/reset (全滅時の初期化用)
router.post("/reset", authGuard, async (req, res) => {
  try {
    const pool = (req as any).db;
    const masters = (req as any).masters;
    const userId = (req as any).userId as number;
    const stateRepo = new UserStateRepository(pool);
    const initial = createInitialState(masters);
    await stateRepo.upsertState(userId, 1, initial);
    res.json({ ok: true, data: { state: initial } });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: { code: "INTERNAL", message: "failed to reset state" } });
  }
});

// POST /api/state/apply-battle (戦闘後のdeltaStateを反映)
router.post("/apply-battle", authGuard, async (req, res) => {
  try {
    const pool = (req as any).db;
    const masters = (req as any).masters;
    const userId = (req as any).userId as number;
    const delta = req.body?.delta;
    const baseState = req.body?.state;
    const persist = req.body?.persist === true;
    const currentFloor = req.body?.currentFloor;
    if (!delta) {
      return res.status(400).json({ ok: false, error: { code: "BAD_REQUEST", message: "delta missing" } });
    }
    const state = await applyBattleDelta({ pool, userId, masters, delta, baseState, persist, currentFloor });
    res.json({ ok: true, data: { state } });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: { code: "INTERNAL", message: "failed to apply battle delta" } });
  }
});

// POST /api/state/allocate-exp (経験値ストックから割り振り)
router.post("/allocate-exp", authGuard, async (req, res) => {
  try {
    const masters = (req as any).masters;
    const allocations = req.body?.allocations;
    const baseState = req.body?.state;
    if (!Array.isArray(allocations) || allocations.length === 0) {
      return res.status(400).json({ ok: false, error: { code: "BAD_REQUEST", message: "allocations missing" } });
    }
    const { state, result } = allocateExpToStateObject({ masters, state: baseState, allocations });
    res.json({ ok: true, data: { state, result } });
  } catch (e: any) {
    res.status(400).json({ ok: false, error: { code: "BAD_REQUEST", message: e?.message || "failed to allocate exp" } });
  }
});

// POST /api/state/apply-item (メニュー等でのアイテム使用を state に反映: DB保存はしない)
router.post("/apply-item", authGuard, async (req, res) => {
  try {
    const masters = (req as any).masters;
    const state = req.body?.state;
    const itemId = req.body?.itemId;
    const targetCharacterId = req.body?.targetCharacterId;
    if (!state || !itemId || !targetCharacterId) {
      return res.status(400).json({ ok: false, error: { code: "BAD_REQUEST", message: "state/itemId/targetCharacterId required" } });
    }
    const item = masters.items.data.find((i: any) => i.id === itemId);
    if (!item) {
      return res.status(400).json({ ok: false, error: { code: "BAD_REQUEST", message: "item not found" } });
    }
    const stock = state.items?.[itemId] ?? 0;
    if (stock <= 0) {
      return res.status(400).json({ ok: false, error: { code: "BAD_REQUEST", message: "item out of stock" } });
    }
    const ch = state.characters?.[targetCharacterId];
    if (!ch) {
      return res.status(400).json({ ok: false, error: { code: "BAD_REQUEST", message: "target character not found in state" } });
    }
    const master = masters.characters.data.find((c: any) => c.id === targetCharacterId);
    if (!master) {
      return res.status(400).json({ ok: false, error: { code: "BAD_REQUEST", message: "character master not found" } });
    }
    const level = ch.level ?? 1;
    const stats = scalePlayerStats(master.baseStats, master.growthPerLevel, level);

    // consume
    state.items = { ...(state.items ?? {}) };
    state.items[itemId] = stock - 1;

    // apply
    if (item.effect?.kind === "heal_hp") {
      const power = item.effect.power ?? 0;
      ch.hp = Math.min(stats.maxHp, (ch.hp ?? stats.maxHp) + power);
    } else if (item.effect?.kind === "heal_mp") {
      const power = item.effect.power ?? 0;
      ch.mp = Math.min(stats.maxMp, (ch.mp ?? stats.maxMp) + power);
    } else if (item.effect?.kind === "heal_full") {
      ch.hp = stats.maxHp;
      ch.mp = stats.maxMp;
    }
    state.characters[targetCharacterId] = ch;
    res.json({ ok: true, data: { state } });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: { code: "INTERNAL", message: "failed to apply item" } });
  }
});

export default router;

