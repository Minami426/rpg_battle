# アーキテクチャ (Architecture)

## システム全体像

### 全体構成
```
プレイヤー（ブラウザ）
    ↓
[ログイン画面] / [新規登録画面]
    ↓
[ゲーム本体]
  PartySelect → Battle → Menu →（次の戦闘 / 終了 / 戦績閲覧）
```

### 責務分割
- **クライアント（Vue）**:
  - 画面表示、入力（ボタン/キーボード）、battle state の表示
  - 進捗のローカル保持（保存前）
  - 全滅/終了時に保存APIを呼ぶ
- **サーバ（Node.js）**:
  - 認証（セッション）
  - 進捗保存（DB）
  - 戦績保存（DB）
  - **戦闘の実行**（敵生成/行動順/ダメージ/状態異常/敵AI）
  - **battle state はメモリ保持**

### 保存タイミング
- **保存する**: 全滅時 / メニューでゲーム終了時
- **保存しない**: 階層突破時、戦闘終了時

---

## データフロー

### ユーザー状態 (state_json)
ユーザの進捗状況はJSON形式で `user_state` テーブルに保存されます。
```json
{
  "currentFloor": 1,
  "party": ["hero", "warrior", "mage"],
  "characters": {
    "hero": { "level": 5, "exp": 1200, "hp": 150, "mp": 30, "skillIds": ["slash", "heal"] }
  },
  "skills": {
    "slash": { "level": 3, "exp": 500 },
    "heal": { "level": 2, "exp": 200 }
  },
  "items": { "potion": 3, "ether": 1 },
  "expStock": 5000
}
```

### 戦闘状態 (メモリ上)
戦闘中はサーバーのメモリ上に以下の状態が保持されます。リロードすると消失します。
```json
{
  "floor": 10,
  "party": [ /* Combatantオブジェクト配列 */ ],
  "enemies": [ /* Combatantオブジェクト配列 */ ],
  "turnOrder": ["pc_hero_0", "enemy_slime_abc12", ...],
  "currentTurnIndex": 0,
  "log": ["戦闘開始！", "勇者の攻撃！スライムに120ダメージ"],
  "winner": null
}
```

---

## 永続化設計 (Database)

### テーブル構成
- **users**: ユーザー認証情報
- **user_state**: ユーザーの現在のゲーム進行状況（JSON）
- **runs**: 過去のゲームプレイ履歴・戦績（JSON）
- **master_***: マスタデータ（キャラクター、アイテム、敵など）

詳細なスキーマ定義は `server/sql/schema.sql` を参照してください。
