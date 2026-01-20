import { Request, Response, NextFunction, RequestHandler } from "express";

// Simple auth guard using session.userId
export const authGuard: RequestHandler = (req, res, next) => {
  const userId = (req.session as any)?.userId;
  if (!userId) {
    return res.status(401).json({ ok: false, error: { code: "UNAUTHORIZED", message: "login required" } });
  }
  (req as any).userId = userId;
  next();
};

// Admin auth guard - checks session.adminUserId
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
