import { Router, Request, Response } from "express";
import { AdminUserRepository } from "../db/AdminUserRepository";

const router = Router();

// POST /api/admin/login
router.post("/login", async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({
        ok: false,
        error: { code: "BAD_REQUEST", message: "username and password required" },
      });
    }

    const db = (req as any).db;
    const repo = new AdminUserRepository(db);
    const admin = await repo.findByUsername(username);

    if (!admin || admin.password !== password) {
      return res.status(401).json({
        ok: false,
        error: { code: "UNAUTHORIZED", message: "Invalid credentials" },
      });
    }

    // セッションに管理者IDを保存
    (req as any).session.adminUserId = admin.id;
    (req as any).session.adminUsername = admin.username;

    return res.json({
      ok: true,
      data: { username: admin.username },
    });
  } catch (e: any) {
    console.error("[AdminAuthController] login error:", e);
    return res.status(500).json({
      ok: false,
      error: { code: "INTERNAL", message: e?.message || "Internal error" },
    });
  }
});

// POST /api/admin/logout
router.post("/logout", (req: Request, res: Response) => {
  (req as any).session.adminUserId = null;
  (req as any).session.adminUsername = null;
  return res.json({ ok: true });
});

// GET /api/admin/session
router.get("/session", (req: Request, res: Response) => {
  const session = (req as any).session;
  if (session?.adminUserId) {
    return res.json({
      ok: true,
      data: {
        loggedIn: true,
        username: session.adminUsername,
      },
    });
  }
  return res.json({
    ok: true,
    data: { loggedIn: false },
  });
});

export const adminAuthRouter = router;

