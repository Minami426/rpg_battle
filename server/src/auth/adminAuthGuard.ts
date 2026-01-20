import { Request, Response, NextFunction } from "express";

// セッションにadminUserIdがあるかチェックするミドルウェア
export function adminAuthGuard(req: Request, res: Response, next: NextFunction) {
  const session = (req as any).session;
  if (!session || !session.adminUserId) {
    return res.status(401).json({
      ok: false,
      error: { code: "UNAUTHORIZED", message: "Admin login required" },
    });
  }
  next();
}

