import { Router } from "express";
import { authGuard } from "../middleware/authGuard";
import { RunRepository } from "../db/RunRepository";

const router = Router();

// POST /api/runs
router.post("/", authGuard, async (req, res) => {
  try {
    const pool = (req as any).db;
    const userId = (req as any).userId as number;
    const repo = new RunRepository(pool);
    const { ended_reason, start_at, end_at, max_floor_reached, max_damage, run_stats_json } = req.body ?? {};
    if (!ended_reason || max_floor_reached === undefined || max_damage === undefined || !run_stats_json) {
      return res.status(400).json({ ok: false, error: { code: "BAD_REQUEST", message: "missing fields" } });
    }
    const runId = await repo.insertRun({
      userId,
      endedReason: ended_reason,
      startAt: start_at ? new Date(start_at) : null,
      endAt: end_at ? new Date(end_at) : null,
      maxFloorReached: max_floor_reached,
      maxDamage: max_damage,
      runStatsJson: run_stats_json,
    });
    res.json({ ok: true, data: { runId } });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: { code: "INTERNAL", message: "failed to save run" } });
  }
});

// GET /api/runs
router.get("/", authGuard, async (req, res) => {
  try {
    const pool = (req as any).db;
    const userId = (req as any).userId as number;
    const repo = new RunRepository(pool);
    const runs = await repo.listRunsByUser(userId);
    res.json({ ok: true, data: runs });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: { code: "INTERNAL", message: "failed to list runs" } });
  }
});

export default router;

