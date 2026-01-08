import { Router } from "express";
import { RunRepository } from "../db/RunRepository";

const router = Router();

// GET /api/ranking
router.get("/", async (req, res) => {
  try {
    const pool = (req as any).db;
    const repo = new RunRepository(pool);
    const ranking = await repo.listRanking();
    res.json({ ok: true, data: ranking });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: { code: "INTERNAL", message: "failed to fetch ranking" } });
  }
});

export default router;

