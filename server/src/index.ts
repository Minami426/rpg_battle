import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { router } from "./api/router";
import { loadMasters, loadMastersFromJson } from "./master/MasterDataLoader";
import { initMasterDataCache, getMasterDataCache } from "./master/MasterDataCache";
import { createDbPool } from "./db/db";
import session from "express-session";

dotenv.config();

const app = express();
const CLIENT_ORIGINS = (process.env.CLIENT_ORIGINS || "http://localhost:5173")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
app.use(
  cors({
    origin: (origin, cb) => {
      // same-origin / server-to-server / curl (no origin)
      if (!origin) return cb(null, true);
      if (CLIENT_ORIGINS.includes(origin)) return cb(null, true);
      return cb(new Error(`CORS blocked: ${origin}`));
    },
    credentials: true,
  })
);
app.use(express.json());

// Create DB pool at startup
const db = createDbPool();

// Initialize MasterDataCache and load from DB
const masterDir = path.resolve(__dirname, "..", "..", "master_data");
const masterCache = initMasterDataCache(db);

// Async initialization
async function initServer() {
  // Validate DB connectivity
  try {
    await db.query("SELECT 1");
    console.log("[server] DB connection OK");
  } catch (e: any) {
    console.error("[server] DB connection FAILED:", e?.code || e?.message);
    console.error("[server] Check DB_* env vars (see server/env.example) and DB/DDL setup in 要件定義.md");
  }

  // Try to load master data from DB
  try {
    await masterCache.load();
    console.log("[server] Master data loaded from DB");
  } catch (e: any) {
    console.warn("[server] Failed to load master data from DB:", e?.message);
    console.log("[server] Falling back to JSON files...");
    // JSON fallback is handled in loadMasters()
  }

  // Attach db and masterCache to request context
  // masters は毎リクエストでキャッシュから取得（管理者による更新を反映するため）
  app.use((req, _res, next) => {
    (req as any).db = db;
    (req as any).masterCache = masterCache;
    // 毎リクエストで最新のマスタデータを取得
    (req as any).masters = loadMasters(masterDir);
    next();
  });

  // Session (simple in-memory store for MVP; replace with Redis in Phase2)
  const SESSION_SECRET = process.env.SESSION_SECRET || "dev_secret";
  app.use(
    session({
      secret: SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
      cookie: { secure: false }, // Phase 2でhttps時にsecure=trueへ
    })
  );

  // 画像配信用の静的ファイル配信設定（フェーズ3）
  const uploadsDir = path.resolve(__dirname, "..", "uploads");
  app.use(
    "/uploads",
    express.static(uploadsDir, {
      setHeaders: (res) => {
        // Ensure image replacements are reflected immediately after admin edits
        res.setHeader("Cache-Control", "no-store");
      },
    })
  );

  // API routes
  app.use("/api", router);

  const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
  app.listen(PORT, () => {
    console.log(`[server] listening on port ${PORT}`);
  });
}

// Start server
initServer().catch((e) => {
  console.error("[server] Failed to initialize:", e);
  process.exit(1);
});

