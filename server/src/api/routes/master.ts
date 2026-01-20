import { Router } from "express";
import { Masters } from "../../types";
import { getMasterDataCache } from "../../master/MasterDataCache";

const masterRouter = Router();

// GET /api/master - マスタデータ全件取得（キャッシュから返却）
masterRouter.get("/", (req, res) => {
  try {
    // まずキャッシュから取得を試行
    const cache = getMasterDataCache();
    const masters = cache.getDataAsLegacyFormat();
    res.json({ ok: true, data: masters });
  } catch {
    // キャッシュが初期化されていない場合は従来のmastersを使用
    const masters = (req as any).masters as Masters;
    res.json({ ok: true, data: masters });
  }
});

export default masterRouter;

