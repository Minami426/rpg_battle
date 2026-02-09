# RPG Battle Simulator 仕様書

## 概要

ターン制RPGバトルシミュレーター。プレイヤーは4人のキャラクターでパーティを編成し、階層（フロア）を攻略していく。戦闘で得た経験値を手動で振り分けてキャラクターやスキルを強化する。

---

## ゲームフロー

```
ログイン → スタート画面 → パーティ選択 → 戦闘 → メニュー（レベルアップ等）→ 次の戦闘...
```

### 画面遷移
1. **ログイン/新規登録** - ユーザー認証
2. **スタート画面** - 「続きから」/「初めから」選択
3. **パーティ選択** - 3人のキャラクターを選んで編成
4. **戦闘画面** - ターン制バトル
5. **メニュー画面** - 経験値振り分け、次の戦闘へ進む
6. **戦績/ランキング** - 過去の記録を確認

---

## 戦闘システム

### 基本ルール
- **パーティ**: 3人（選択）
- **敵**: 1〜5体（フロアに応じて自動生成）
- **ターン制**: 速度（speed）順に行動

### 行動コマンド
| コマンド | 説明 |
|---------|------|
| たたかう | 通常攻撃（単体） |
| じゅもん | スキル使用（MP消費） |
| どうぐ | アイテム使用 |
| ぼうぎょ | 被ダメージ半減 |

### 勝敗条件
- **勝利**: 敵全員のHPが0以下
- **敗北**: 味方全員のHPが0以下（ゲームオーバー）

---

## ダメージ計算

### 通常攻撃
```
基礎ダメージ = ATK² / (ATK + DEF×0.5)
レベル倍率 = 1 + Level×0.1 + Level²×0.05
最終ダメージ = 基礎ダメージ × レベル倍率 × ランダム(0.9~1.1)
```

### スキルダメージ
```
参照ステータス = 物理スキル→ATK, 魔法スキル→MATK
基礎ダメージ = (参照ステータス × power/100)² / (参照ステータス × power/100 + DEF×0.5)
```

### 回復
```
回復量 = power × レベル倍率 × ランダム(0.95~1.05)
```

### 防御時
- 受けるダメージが50%減少

---

## ステータス計算

### HP/MP スケーリング
```
HP/MP倍率 = 1 + Level×0.2 + Level²×0.08
実効HP = (baseMaxHp + (Level-1) × growthMaxHp) × HP倍率
```

**例**: Lv100で約821倍のスケーリング

### その他ステータス
```
ATK/MATK/DEF/SPD = base + (Level-1) × growth
```

---

## 経験値システム

### 獲得経験値
戦闘勝利時、敵全員の経験値合計が「経験値ストック」に加算される。

```
獲得EXP = Σ(敵のbaseExp × (1 + (敵Level-1) × 0.2))
```

### 経験値テーブル（キャラクター）
```
必要EXP(Level) = 30 × Level² + 1000
```

| Level | 必要EXP |
|-------|---------|
| 1→2 | 1,030 |
| 10→11 | 4,000 |
| 50→51 | 76,000 |
| 100→101 | 301,000 |

### 経験値テーブル（スキル）
```
必要EXP(Level) = 7.5 × Level² + 250
```

キャラクター経験値の約1/4

### レベル上限
| フロア | キャラ上限 | スキル上限 |
|--------|-----------|-----------|
| 1〜100 | Lv100 | 無制限 |
| 101〜 | Lv200 | 無制限 |

---

## スキル習得システム

### 仕組み
- 各キャラクターに「習得可能スキル」と「習得レベル」が設定されている
- キャラクターがレベルアップすると、条件を満たしたスキルを自動習得
- 習得済みスキルのみ経験値を振り分けてレベルアップ可能

### 例
```json
{
  "learnableSkillIds": ["heal", "fireball", "thunder"],
  "skillLearnLevels": { "heal": 1, "fireball": 5, "thunder": 15 }
}
```
→ Lv5でfireball習得、Lv15でthunder習得

---

## 敵生成システム

### 敵レベル曲線
| フロア | 敵レベル(目安) |
|--------|---------------|
| 1 | 1 |
| 50 | 42〜43 |
| 100 | 100 |
| 200 | 275 |
| 300 | 475 |

計算式（フロア1〜100）:
```
基礎レベル = 0.003 × Floor² + 0.7 × Floor
実レベル = 基礎レベル × ランダム(0.85〜1.15)
```

### 出現確率（レア度）
baseExpが高い敵ほど出現率が低い（重み付きランダム）

```
重み = 1,000,000 / (baseExp + 1000)^1.3
```

### ボス出現
10フロアごとにボス敵が出現

---

## データ構造

### ユーザー状態 (state_json)
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

## マスタデータ

### キャラクター (characters.json)
- id, name, description
- baseStats (maxHp, maxMp, atk, matk, def, speed)
- growthPerLevel
- initialSkillIds, learnableSkillIds, skillLearnLevels

### スキル (skills.json)
- id, name, description
- skillType (attack/heal/buff/debuff)
- targetType (enemy/ally/self)
- range (single/all)
- power, powerType (physical/magical/healing)
- cost, costType (mp/hp)
- conditions (付与する状態異常)

### 敵 (enemies.json)
- id, name, imageKey
- baseStats, growthPerLevel
- baseCost, baseExp
- appearMinFloor, appearMaxFloor, isBoss
- skillIds, aiProfile

### アイテム (items.json)
- id, name, description
- type (consumable/equipment)
- target (ally/enemy)
- battleUsable, maxStack
- effect (hp, mp回復量など)

### 状態異常 (conditions.json)
- id, name
- conditionType (buff/debuff/dot/stun)
- stat, value, valueType (multiply/add)
- duration

---

## 管理者機能

### 管理者ログイン
- URL: `/admin/login`
- 初期アカウント: `admin` / `admin`

### マスタデータ編集
- キャラクター/スキル/敵/アイテム/状態異常のCRUD操作
- 画像アップロード（キャラクター/敵）

---

## API一覧

| メソッド | エンドポイント | 説明 |
|---------|---------------|------|
| POST | /api/auth/register | 新規登録 |
| POST | /api/auth/login | ログイン |
| POST | /api/auth/logout | ログアウト |
| GET | /api/auth/session | セッション確認 |
| GET | /api/state | ユーザー状態取得 |
| POST | /api/state/reset | 状態リセット |
| POST | /api/battle/start | 戦闘開始 |
| POST | /api/battle/act | 行動実行 |
| GET | /api/battle/current | 現在の戦闘状態 |
| POST | /api/flow/next | 次階層へ進む |
| POST | /api/flow/allocate-exp | 経験値振り分け |
| POST | /api/flow/end-run | ゲーム終了（記録保存） |
| GET | /api/runs | 戦績一覧 |
| GET | /api/ranking | ランキング |
| GET | /api/master | マスタデータ全件 |
| GET | /api/health | ヘルスチェック |

---

## 技術スタック

- **バックエンド**: Node.js, Express, TypeScript
- **フロントエンド**: Vue.js 3, Vite, TypeScript
- **データベース**: MySQL / MariaDB
- **認証**: セッションベース (express-session)
- **状態管理**: サーバー側でDB永続化、戦闘状態はメモリ保持

