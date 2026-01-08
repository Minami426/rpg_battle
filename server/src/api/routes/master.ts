import { Router } from "express";
import { Masters } from "../../types";

const masterRouter = Router();

masterRouter.get("/", (req, res) => {
  const masters = (req as any).masters as Masters;
  res.json({ ok: true, data: masters });
});

export default masterRouter;

