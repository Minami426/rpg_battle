import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { router } from "./api/router";
import { loadMasters } from "./master/MasterDataLoader";
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

// Load master data at startup
const masterDir = path.resolve(__dirname, "..", "..", "master_data");
const masters = loadMasters(masterDir);

// Create DB pool at startup
const db = createDbPool();
// Optional: validate DB connectivity early for better DX (MVP)
db.query("SELECT 1")
  .then(() => console.log("[server] DB connection OK"))
  .catch((e: any) => {
    console.error("[server] DB connection FAILED:", e?.code || e?.message);
    console.error("[server] Check DB_* env vars (see server/env.example) and DB/DDL setup in 要件定義.md");
  });

// Attach masters to request context via locals (simple approach for MVP)
app.use((req, _res, next) => {
  (req as any).masters = masters;
  (req as any).db = db;
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

app.use("/api", router);

const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
app.listen(PORT, () => {
  console.log(`[server] listening on port ${PORT}`);
});

