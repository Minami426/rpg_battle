import { Router } from "express";
import { UserRepository } from "../db/UserRepository";
import { UserStateRepository } from "../db/UserStateRepository";
import { createInitialState } from "../utils/initialState";

const router = Router();

router.post("/register", async (req, res) => {
  const { username, password } = req.body ?? {};
  if (!username || !password) {
    return res.status(400).json({ ok: false, error: { code: "BAD_REQUEST", message: "username/password required" } });
  }
  try {
    const pool = (req as any).db;
    const masters = (req as any).masters;
    const userRepo = new UserRepository(pool);
    const stateRepo = new UserStateRepository(pool);
    const existing = await userRepo.findByUsername(username);
    if (existing) {
      return res.status(409).json({ ok: false, error: { code: "CONFLICT", message: "username already exists" } });
    }
    const userId = await userRepo.createUser(username, password);
    // create initial state
    await stateRepo.upsertState(userId, 1, createInitialState(masters));
    (req.session as any).userId = userId;
    res.json({ ok: true, data: { userId, username } });
  } catch (e) {
    console.error(e);
    const code = (e as any)?.code;
    if (code === "ER_ACCESS_DENIED_ERROR") {
      return res.status(500).json({
        ok: false,
        error: { code: "DB_CONNECT_FAILED", message: "DB access denied. Set DB_USER/DB_PASSWORD (see server/env.example)." },
      });
    }
    if (code === "ER_BAD_DB_ERROR") {
      return res.status(500).json({
        ok: false,
        error: { code: "DB_NOT_FOUND", message: "Database not found. Create DB_NAME and apply DDL (see 要件定義.md)." },
      });
    }
    if (code === "ER_NO_SUCH_TABLE") {
      return res.status(500).json({
        ok: false,
        error: { code: "DDL_NOT_APPLIED", message: "Tables not found. Apply DDL (see 要件定義.md 9.3)." },
      });
    }
    res.status(500).json({ ok: false, error: { code: "INTERNAL", message: "failed to register" } });
  }
});

router.post("/login", async (req, res) => {
  const { username, password } = req.body ?? {};
  if (!username || !password) {
    return res.status(400).json({ ok: false, error: { code: "BAD_REQUEST", message: "username/password required" } });
  }
  try {
    const pool = (req as any).db;
    const userRepo = new UserRepository(pool);
    const user = await userRepo.findByUsername(username);
    if (!user || user.password !== password) {
      return res.status(401).json({ ok: false, error: { code: "UNAUTHORIZED", message: "invalid credentials" } });
    }
    (req.session as any).userId = user.id;
    res.json({ ok: true, data: { userId: user.id, username: user.username } });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: { code: "INTERNAL", message: "failed to login" } });
  }
});

router.post("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ ok: false, error: { code: "INTERNAL", message: "failed to logout" } });
    }
    res.json({ ok: true, data: {} });
  });
});

export default router;

