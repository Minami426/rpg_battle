import { Router, Request, Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { adminAuthGuard } from "../middleware/authGuard";
import { getMasterDataCache } from "../master/MasterDataCache";

const router = Router();

// すべての管理者APIに認証を必須とする
router.use(adminAuthGuard);

// 画像アップロード設定
const uploadsDir = path.resolve(__dirname, "..", "..", "uploads");
const charactersUploadDir = path.join(uploadsDir, "characters");
const enemiesUploadDir = path.join(uploadsDir, "enemies");

// ディレクトリがなければ作成
[uploadsDir, charactersUploadDir, enemiesUploadDir].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// 共通のファイルフィルタとサイズ制限
const fileFilter = (req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedTypes = ["image/png", "image/jpeg", "image/gif", "image/webp"];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Invalid file type. Only PNG, JPEG, GIF, WEBP allowed."));
  }
};

const fileLimits = { fileSize: 5 * 1024 * 1024 }; // 5MB

// キャラクター用アップロード設定
const characterStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, charactersUploadDir),
  filename: (req, file, cb) => {
    const id = (req as any).params.id;
    const ext = path.extname(file.originalname) || ".png";
    cb(null, `${id}${ext}`);
  },
});
const uploadCharacter = multer({ storage: characterStorage, fileFilter, limits: fileLimits });

// エネミー用アップロード設定
const enemyStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, enemiesUploadDir),
  filename: (req, file, cb) => {
    const id = (req as any).params.id;
    const ext = path.extname(file.originalname) || ".png";
    cb(null, `${id}${ext}`);
  },
});
const uploadEnemy = multer({ storage: enemyStorage, fileFilter, limits: fileLimits });

// ========== Characters ==========

// GET /api/admin/characters
router.get("/characters", async (req: Request, res: Response) => {
  try {
    const cache = getMasterDataCache();
    const characters = await cache.getCharacterRepo().findAll();
    return res.json({ ok: true, data: characters });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: { code: "INTERNAL", message: e?.message } });
  }
});

// POST /api/admin/characters
router.post("/characters", async (req: Request, res: Response) => {
  try {
    const cache = getMasterDataCache();
    const data = req.body;
    if (!data.id || !data.name || !data.baseStats || !data.growthPerLevel) {
      return res.status(400).json({ ok: false, error: { code: "BAD_REQUEST", message: "Missing required fields" } });
    }
    await cache.getCharacterRepo().create(data);
    await cache.reload();
    return res.json({ ok: true });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: { code: "INTERNAL", message: e?.message } });
  }
});

// PUT /api/admin/characters/:id
router.put("/characters/:id", async (req: Request, res: Response) => {
  try {
    const cache = getMasterDataCache();
    const { id } = req.params;
    const data = req.body;
    await cache.getCharacterRepo().update(id, data);
    await cache.reload();
    return res.json({ ok: true });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: { code: "INTERNAL", message: e?.message } });
  }
});

// DELETE /api/admin/characters/:id
router.delete("/characters/:id", async (req: Request, res: Response) => {
  try {
    const cache = getMasterDataCache();
    const { id } = req.params;
    await cache.getCharacterRepo().delete(id);
    await cache.reload();
    return res.json({ ok: true });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: { code: "INTERNAL", message: e?.message } });
  }
});

// POST /api/admin/characters/:id/image
router.post("/characters/:id/image", uploadCharacter.single("image"), async (req: Request, res: Response) => {
  try {
    const cache = getMasterDataCache();
    const { id } = req.params;
    if (!req.file) {
      return res.status(400).json({ ok: false, error: { code: "BAD_REQUEST", message: "No file uploaded" } });
    }
    const imagePath = `/uploads/characters/${req.file.filename}`;
    await cache.getCharacterRepo().update(id, { imagePath });
    await cache.reload();
    return res.json({ ok: true, data: { imagePath } });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: { code: "INTERNAL", message: e?.message } });
  }
});

// ========== Skills ==========

router.get("/skills", async (req: Request, res: Response) => {
  try {
    const cache = getMasterDataCache();
    const skills = await cache.getSkillRepo().findAll();
    return res.json({ ok: true, data: skills });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: { code: "INTERNAL", message: e?.message } });
  }
});

router.post("/skills", async (req: Request, res: Response) => {
  try {
    const cache = getMasterDataCache();
    const data = req.body;
    if (!data.id || !data.name) {
      return res.status(400).json({ ok: false, error: { code: "BAD_REQUEST", message: "Missing required fields" } });
    }
    await cache.getSkillRepo().create(data);
    await cache.reload();
    return res.json({ ok: true });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: { code: "INTERNAL", message: e?.message } });
  }
});

router.put("/skills/:id", async (req: Request, res: Response) => {
  try {
    const cache = getMasterDataCache();
    const { id } = req.params;
    await cache.getSkillRepo().update(id, req.body);
    await cache.reload();
    return res.json({ ok: true });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: { code: "INTERNAL", message: e?.message } });
  }
});

router.delete("/skills/:id", async (req: Request, res: Response) => {
  try {
    const cache = getMasterDataCache();
    const { id } = req.params;
    await cache.getSkillRepo().delete(id);
    await cache.reload();
    return res.json({ ok: true });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: { code: "INTERNAL", message: e?.message } });
  }
});

// ========== Items ==========

router.get("/items", async (req: Request, res: Response) => {
  try {
    const cache = getMasterDataCache();
    const items = await cache.getItemRepo().findAll();
    return res.json({ ok: true, data: items });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: { code: "INTERNAL", message: e?.message } });
  }
});

router.post("/items", async (req: Request, res: Response) => {
  try {
    const cache = getMasterDataCache();
    const data = req.body;
    if (!data.id || !data.name) {
      return res.status(400).json({ ok: false, error: { code: "BAD_REQUEST", message: "Missing required fields" } });
    }
    await cache.getItemRepo().create(data);
    await cache.reload();
    return res.json({ ok: true });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: { code: "INTERNAL", message: e?.message } });
  }
});

router.put("/items/:id", async (req: Request, res: Response) => {
  try {
    const cache = getMasterDataCache();
    const { id } = req.params;
    await cache.getItemRepo().update(id, req.body);
    await cache.reload();
    return res.json({ ok: true });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: { code: "INTERNAL", message: e?.message } });
  }
});

router.delete("/items/:id", async (req: Request, res: Response) => {
  try {
    const cache = getMasterDataCache();
    const { id } = req.params;
    await cache.getItemRepo().delete(id);
    await cache.reload();
    return res.json({ ok: true });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: { code: "INTERNAL", message: e?.message } });
  }
});

// ========== Conditions ==========

router.get("/conditions", async (req: Request, res: Response) => {
  try {
    const cache = getMasterDataCache();
    const conditions = await cache.getConditionRepo().findAll();
    return res.json({ ok: true, data: conditions });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: { code: "INTERNAL", message: e?.message } });
  }
});

router.post("/conditions", async (req: Request, res: Response) => {
  try {
    const cache = getMasterDataCache();
    const data = req.body;
    if (!data.id || !data.name) {
      return res.status(400).json({ ok: false, error: { code: "BAD_REQUEST", message: "Missing required fields" } });
    }
    await cache.getConditionRepo().create(data);
    await cache.reload();
    return res.json({ ok: true });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: { code: "INTERNAL", message: e?.message } });
  }
});

router.put("/conditions/:id", async (req: Request, res: Response) => {
  try {
    const cache = getMasterDataCache();
    const { id } = req.params;
    await cache.getConditionRepo().update(id, req.body);
    await cache.reload();
    return res.json({ ok: true });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: { code: "INTERNAL", message: e?.message } });
  }
});

router.delete("/conditions/:id", async (req: Request, res: Response) => {
  try {
    const cache = getMasterDataCache();
    const { id } = req.params;
    await cache.getConditionRepo().delete(id);
    await cache.reload();
    return res.json({ ok: true });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: { code: "INTERNAL", message: e?.message } });
  }
});

// ========== Enemies ==========

router.get("/enemies", async (req: Request, res: Response) => {
  try {
    const cache = getMasterDataCache();
    const enemies = await cache.getEnemyRepo().findAll();
    return res.json({ ok: true, data: enemies });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: { code: "INTERNAL", message: e?.message } });
  }
});

router.post("/enemies", async (req: Request, res: Response) => {
  try {
    const cache = getMasterDataCache();
    const data = req.body;
    if (!data.id || !data.name) {
      return res.status(400).json({ ok: false, error: { code: "BAD_REQUEST", message: "Missing required fields" } });
    }
    await cache.getEnemyRepo().create(data);
    await cache.reload();
    return res.json({ ok: true });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: { code: "INTERNAL", message: e?.message } });
  }
});

router.put("/enemies/:id", async (req: Request, res: Response) => {
  try {
    const cache = getMasterDataCache();
    const { id } = req.params;
    await cache.getEnemyRepo().update(id, req.body);
    await cache.reload();
    return res.json({ ok: true });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: { code: "INTERNAL", message: e?.message } });
  }
});

router.delete("/enemies/:id", async (req: Request, res: Response) => {
  try {
    const cache = getMasterDataCache();
    const { id } = req.params;
    await cache.getEnemyRepo().delete(id);
    await cache.reload();
    return res.json({ ok: true });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: { code: "INTERNAL", message: e?.message } });
  }
});

// POST /api/admin/enemies/:id/image
router.post("/enemies/:id/image", uploadEnemy.single("image"), async (req: Request, res: Response) => {
  try {
    const cache = getMasterDataCache();
    const { id } = req.params;
    if (!req.file) {
      return res.status(400).json({ ok: false, error: { code: "BAD_REQUEST", message: "No file uploaded" } });
    }
    const imagePath = `/uploads/enemies/${req.file.filename}`;
    await cache.getEnemyRepo().update(id, { imagePath });
    await cache.reload();
    return res.json({ ok: true, data: { imagePath } });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: { code: "INTERNAL", message: e?.message } });
  }
});

export const adminMasterRouter = router;

