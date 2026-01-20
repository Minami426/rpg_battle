# ファイル構成 (File Structure)

```
rpg_battle/
├── README.md              # プロジェクト概要・詳細仕様
├── file_info.md           # このファイル（構成説明）
├── info.md                # ゲーム仕様書
├── .gitignore             # Git除外設定
│
├── master_data/           # マスタデータ（JSON）
│   ├── characters.json    # キャラクター定義
│   ├── enemies.json       # 敵定義
│   ├── skills.json        # スキル定義
│   ├── items.json         # アイテム定義
│   └── conditions.json    # 状態異常/バフ定義
│
├── server/                # バックエンド（Node.js/Express）
│   ├── package.json       # 依存関係
│   ├── tsconfig.json      # TypeScript設定
│   ├── env.example        # 環境変数サンプル
│   │
│   ├── sql/
│   │   └── schema.sql     # DBスキーマ（全テーブル定義）
│   │
│   ├── scripts/
│   │   └── seed-master-data.js  # マスタデータDB投入スクリプト
│   │
│   ├── uploads/           # アップロード画像保存先
│   │   ├── characters/    # キャラクター画像
│   │   └── enemies/       # 敵画像
│   │
│   └── src/
│       ├── index.ts       # サーバエントリポイント
│       ├── types.ts       # 共通型定義
│       │
│       ├── api/           # APIコントローラ
│       │   ├── router.ts              # ルーティング定義
│       │   ├── AuthController.ts      # 認証API
│       │   ├── AdminAuthController.ts # 管理者認証API
│       │   ├── AdminMasterController.ts # 管理者マスタCRUD API
│       │   ├── StateController.ts     # ユーザ状態API
│       │   ├── BattleController.ts    # 戦闘API
│       │   ├── FlowController.ts      # ゲームフローAPI
│       │   ├── RunController.ts       # 戦績API
│       │   └── RankingController.ts   # ランキングAPI
│       │
│       ├── db/            # データベースアクセス
│       │   ├── db.ts                  # DB接続プール
│       │   ├── UserRepository.ts      # ユーザテーブル
│       │   ├── UserStateRepository.ts # ユーザ状態テーブル
│       │   ├── RunRepository.ts       # 戦績テーブル
│       │   ├── AdminUserRepository.ts # 管理者テーブル
│       │   └── Master*Repository.ts   # マスタテーブル×5
│       │
│       ├── game/          # ゲームロジック
│       │   ├── types.ts           # 戦闘用型定義
│       │   ├── BattleService.ts   # 戦闘メインロジック
│       │   ├── BattleMemoryStore.ts # 戦闘状態メモリ管理
│       │   ├── TurnManager.ts     # ターン管理
│       │   ├── DamageCalculator.ts # ダメージ計算
│       │   ├── actions.ts         # 行動処理
│       │   ├── ConditionSystem.ts # 状態異常処理
│       │   ├── EnemyAI.ts         # 敵AI
│       │   ├── EnemyFactory.ts    # 敵生成
│       │   ├── ExperienceService.ts # 経験値計算
│       │   └── playerStats.ts     # キャラステータス計算
│       │
│       ├── master/        # マスタデータ管理
│       │   ├── MasterDataCache.ts   # DBキャッシュ
│       │   ├── MasterDataLoader.ts  # データ読込
│       │   └── MasterValidator.ts   # バリデーション
│       │
│       ├── middleware/    # ミドルウェア
│       │   └── authGuard.ts  # 認証ガード（ユーザ/管理者）
│       │
│       └── utils/         # ユーティリティ
│           ├── initialState.ts  # 初期状態生成
│           └── stateHelpers.ts  # 状態更新ヘルパー
│
└── client/                # フロントエンド（Vue.js/Vite）
    ├── package.json       # 依存関係
    ├── vite.config.ts     # Vite設定
    ├── tsconfig.json      # TypeScript設定
    ├── index.html         # HTMLエントリ
    │
    └── src/
        ├── main.ts        # Vueエントリ
        ├── App.vue        # ルートコンポーネント
        ├── style.css      # グローバルスタイル
        │
        ├── router/
        │   └── index.ts   # Vue Router設定
        │
        ├── services/
        │   └── apiClient.ts # API通信クライアント
        │
        ├── stores/
        │   ├── appState.ts   # アプリ状態管理
        │   └── systemLog.ts  # システムログ管理
        │
        └── pages/         # 画面コンポーネント
            ├── LoginPage.vue         # ログイン
            ├── RegisterPage.vue      # 新規登録
            ├── StartPage.vue         # スタート画面
            ├── PartySelectPage.vue   # パーティ選択
            ├── BattlePage.vue        # 戦闘画面
            ├── MenuPage.vue          # メニュー/レベルアップ
            ├── StatsPage.vue         # 戦績/ランキング
            ├── RunDetailPage.vue     # 戦績詳細
            ├── AdminLoginPage.vue    # 管理者ログイン
            ├── AdminPage.vue         # 管理者トップ
            └── Admin*EditPage.vue    # マスタ編集×5
```

## 主要ディレクトリの役割

| ディレクトリ | 説明 |
|------------|------|
| `master_data/` | ゲームの基礎データ（JSON）。seed時にDBへ投入される |
| `server/src/api/` | REST APIエンドポイント定義 |
| `server/src/db/` | MySQL/MariaDBアクセス層（Repository） |
| `server/src/game/` | 戦闘ロジック・計算処理 |
| `server/src/master/` | マスタデータのキャッシュ・読込・検証 |
| `client/src/pages/` | 各画面のVueコンポーネント |
| `client/src/stores/` | フロント側の状態管理 |

## セットアップ手順

**詳細な手順は `README.md` の「0. 実行方法」を参照してください。**

簡易手順:
1. **環境変数設定**: `server/env.example` → `server/.env`
2. **DBスキーマ適用**: `mysql -u root -p rpg_battle < server/sql/schema.sql`
3. **マスタデータ投入**: `cd server && node scripts/seed-master-data.js`
4. **依存インストール**: `cd server && npm install` / `cd client && npm install`
5. **起動**: `cd server && npm run dev` / `cd client && npm run dev`

