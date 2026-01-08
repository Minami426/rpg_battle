import { Router } from "express";
import { authGuard } from "../middleware/authGuard";
import { RunRepository } from "../db/RunRepository";
import { UserStateRepository } from "../db/UserStateRepository";
import { createInitialState } from "../utils/initialState";
import { getOrCreateUserState } from "../utils/stateHelpers";
import { Masters } from "../types";

const router = Router();

function isNonEmptyObject(v: any) {
  return v && typeof v === "object" && !Array.isArray(v) && Object.keys(v).length > 0;
}

async function buildRunStats(pool: any, userId: number, masters: Masters) {
  const stateRow = await getOrCreateUserState(pool, userId, masters);
  const st = (stateRow as any).state_json || (stateRow as any).state || {};
  const characterLevels: Record<string, number> = {};
  const skillLevels: Record<string, number> = {};
  for (const [cid, c] of Object.entries<any>(st.characters ?? {})) {
    characterLevels[cid] = c.level ?? 1;
  }
  for (const [sid, s] of Object.entries<any>(st.skills ?? {})) {
    skillLevels[sid] = s.level ?? 1;
  }
  return {
    currentFloor: st.currentFloor ?? (stateRow as any).current_floor ?? 1,
    characterLevels,
    skillLevels,
    items: st.items ?? {},
    currentRunMaxDamage: st.currentRunMaxDamage ?? 0,
  };
}

function buildRunStatsFromStateObject(st: any) {
  const characterLevels: Record<string, number> = {};
  const skillLevels: Record<string, number> = {};
  for (const [cid, c] of Object.entries<any>(st?.characters ?? {})) {
    characterLevels[cid] = c.level ?? 1;
  }
  for (const [sid, s] of Object.entries<any>(st?.skills ?? {})) {
    skillLevels[sid] = s.level ?? 1;
  }
  return {
    currentFloor: st?.currentFloor ?? 1,
    characterLevels,
    skillLevels,
    items: st?.items ?? {},
    currentRunMaxDamage: st?.currentRunMaxDamage ?? 0,
  };
}

/**
 * ゲーム終了（メニューから終了）:
 * - 戦績保存 (ended_reason=quit)
 * - 進捗保存 (current_floor/state)
 * - ログアウト
 */
router.post("/quit", authGuard, async (req, res) => {
  try {
    const pool = (req as any).db;
    const masters = (req as any).masters as Masters;
    const userId = (req as any).userId as number;
    const runRepo = new RunRepository(pool);
    const stateRepo = new UserStateRepository(pool);
    const { run, state } = req.body ?? {};
    if (!run || !state || typeof state.currentFloor !== "number") {
      return res.status(400).json({ ok: false, error: { code: "BAD_REQUEST", message: "run/state missing" } });
    }
    const runStats = isNonEmptyObject(run.run_stats_json)
      ? run.run_stats_json
      : state?.state
        ? buildRunStatsFromStateObject(state.state)
        : await buildRunStats(pool, userId, masters);
    const defaultFloor = state.currentFloor ?? state.current_floor ?? (await stateRowCurrentFloor(pool, userId, masters));
    const defaultMaxDamage = runStats.currentRunMaxDamage ?? 0;
    // 保存順: runs -> state -> logout
    await runRepo.insertRun({
      userId,
      endedReason: "quit",
      startAt: run.start_at ? new Date(run.start_at) : null,
      endAt: run.end_at ? new Date(run.end_at) : null,
      maxFloorReached: run.max_floor_reached ?? defaultFloor ?? 1,
      maxDamage: run.max_damage ?? defaultMaxDamage ?? 0,
      runStatsJson: runStats,
    });
    await stateRepo.upsertState(userId, state.currentFloor, state.state);
    req.session.destroy(() => {});
    res.json({ ok: true, data: { loggedOut: true } });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: { code: "INTERNAL", message: "failed to quit" } });
  }
});

/**
 * 全滅:
 * - 戦績保存 (ended_reason=game_over)
 * - 進捗初期化して保存 (resume.screen=start)
 * - ログイン状態は維持（ログアウトしない）
 */
router.post("/game_over", authGuard, async (req, res) => {
  try {
    const pool = (req as any).db;
    const masters = (req as any).masters as Masters;
    const userId = (req as any).userId as number;
    const runRepo = new RunRepository(pool);
    const stateRepo = new UserStateRepository(pool);
    const { run } = req.body ?? {};
    if (!run) {
      return res.status(400).json({ ok: false, error: { code: "BAD_REQUEST", message: "run missing" } });
    }
    const runStats = isNonEmptyObject(run.run_stats_json) ? run.run_stats_json : await buildRunStats(pool, userId, masters);
    const defaultFloor = run.max_floor_reached ?? runStats?.currentFloor ?? (await stateRowCurrentFloor(pool, userId, masters));
    const defaultMaxDamage = run.max_damage ?? runStats.currentRunMaxDamage ?? 0;
    await runRepo.insertRun({
      userId,
      endedReason: "game_over",
      startAt: run.start_at ? new Date(run.start_at) : null,
      endAt: run.end_at ? new Date(run.end_at) : null,
      maxFloorReached: defaultFloor ?? 1,
      maxDamage: defaultMaxDamage ?? 0,
      runStatsJson: runStats,
    });
    const initial = createInitialState(masters);
    await stateRepo.upsertState(userId, 1, initial);
    res.json({ ok: true, data: { state: initial } });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: { code: "INTERNAL", message: "failed to handle game over" } });
  }
});

async function stateRowCurrentFloor(pool: any, userId: number, masters: Masters) {
  const stateRow = await getOrCreateUserState(pool, userId, masters);
  return (stateRow as any).current_floor ?? (stateRow as any).currentFloor ?? 1;
}

export default router;

