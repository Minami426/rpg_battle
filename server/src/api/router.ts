import { Router } from "express";
import masterRouter from "./routes/master";
import healthRouter from "./routes/health";
import authRouter from "./AuthController";
import stateRouter from "./StateController";
import runRouter from "./RunController";
import rankingRouter from "./RankingController";
import battleRouter from "./BattleController";
import flowRouter from "./FlowController";

export const router = Router();

router.use("/health", healthRouter);
router.use("/master", masterRouter);
router.use("/auth", authRouter);
router.use("/state", stateRouter);
router.use("/runs", runRouter);
router.use("/ranking", rankingRouter);
router.use("/battle", battleRouter);
router.use("/flow", flowRouter);

