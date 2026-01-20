import fs from "fs";
import path from "path";
import { Masters } from "../types";
import { validateMasters } from "./MasterValidator";
import { getMasterDataCache, MasterDataCache } from "./MasterDataCache";

type MasterFile<T> = { schemaVersion: number; data: T[] };

function readJson<T>(filePath: string): MasterFile<T> {
  const raw = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(raw) as MasterFile<T>;
}

/**
 * JSONファイルからマスタデータを読み込む（フォールバック用）
 */
export function loadMastersFromJson(baseDir: string): Masters {
  const safeRead = <T>(file: string): MasterFile<T> => {
    const fp = path.join(baseDir, file);
    if (!fs.existsSync(fp)) {
      console.warn(`[master] missing ${file}, using empty data[]`);
      return { schemaVersion: 1, data: [] };
    }
    return readJson<T>(fp);
  };

  const masters: Masters = {
    characters: safeRead<any>("characters.json"),
    skills: safeRead<any>("skills.json"),
    items: safeRead<any>("items.json"),
    conditions: safeRead<any>("conditions.json"),
    enemies: safeRead<any>("enemies.json"),
  };

  // Validation (throws on fatal)
  validateMasters(masters);
  return masters;
}

/**
 * MasterDataCacheからマスタデータを取得（DB読み込み済みの場合）
 */
export function loadMastersFromCache(): Masters {
  const cache = getMasterDataCache();
  const masters = cache.getDataAsLegacyFormat();
  validateMasters(masters);
  return masters;
}

/**
 * マスタデータを読み込む（後方互換性のため）
 * DB読み込みが初期化されていればキャッシュから、そうでなければJSONから読み込む
 */
export function loadMasters(baseDir: string): Masters {
  try {
    // まずキャッシュから読み込みを試行
    return loadMastersFromCache();
  } catch {
    // キャッシュが初期化されていない場合はJSONから読み込み
    console.log("[master] Cache not initialized, loading from JSON files...");
    return loadMastersFromJson(baseDir);
  }
}

