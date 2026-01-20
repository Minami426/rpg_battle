import { Router } from "express";
import { getMasterDataCache } from "../master/MasterDataCache";
import { Masters } from "../types";
import authRouter from "./AuthController";
import stateRouter from "./StateController";
import runRouter from "./RunController";
import rankingRouter from "./RankingController";
import battleRouter from "./BattleController";
import flowRouter from "./FlowController";
import { adminAuthRouter } from "./AdminAuthController";
import { adminMasterRouter } from "./AdminMasterController";

export const router = Router();

// Health check
router.get("/health", (_req, res) => {
  res.json({ ok: true, data: { status: "healthy" } });
});

// Master data
router.get("/master", (req, res) => {
  try {
    const cache = getMasterDataCache();
    const masters = cache.getDataAsLegacyFormat();
    res.json({ ok: true, data: masters });
  } catch {
    const masters = (req as any).masters as Masters;
    res.json({ ok: true, data: masters });
  }
});

// API routes
router.use("/auth", authRouter);
router.use("/state", stateRouter);
router.use("/runs", runRouter);
router.use("/ranking", rankingRouter);
router.use("/battle", battleRouter);
router.use("/flow", flowRouter);

// Admin API
router.use("/admin", adminAuthRouter);
router.use("/admin", adminMasterRouter);
