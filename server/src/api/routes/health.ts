import { Router } from "express";

const healthRouter = Router();

healthRouter.get("/", (_req, res) => {
  res.json({ ok: true, data: { status: "healthy" } });
});

export default healthRouter;

