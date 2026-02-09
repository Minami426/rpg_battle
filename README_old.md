# RPG Battle（仮称）要件定義書

## 0. 実行方法（ローカル実行 / MVP）

### ⚡ クイックスタート（初回セットアップ）

#### 必要な環境
- **Node.js**: v18以上（`node --version` で確認）
- **npm**: v9以上（`npm --version` で確認）
- **MySQL または MariaDB**: v8.0以上（ローカルで起動していること）

#### セットアップ手順（全OS共通）

**1. データベースの準備**
```bash
# データベース作成
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS rpg_battle DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# スキーマ適用（プロジェクトルートから実行）
mysql -u root -p rpg_battle < server/sql/schema.sql
```

**2. 環境変数の設定**
```bash
# server/env.example を server/.env にコピー
cd server
cp env.example .env

# .env を編集してDBパスワードを設定（必要に応じて）
# DB_PASSWORD=YOUR_PASSWORD
```

**3. マスタデータの投入**
```bash
# serverディレクトリで実行
cd server
npm install
node scripts/seed-master-data.js
```
※ 管理者ユーザー `admin / admin` が自動的に作成されます

**4. サーバーの起動**
```bash
# serverディレクトリで実行
cd server
npm run dev
```
→ `http://localhost:3000` でAPIサーバーが起動します

**5. クライアントの起動（別ターミナル）**
```bash
# clientディレクトリで実行
cd client
npm install
npm run dev
```
→ ブラウザで表示されるURL（例: `http://localhost:5173`）にアクセス

**6. 動作確認**
- ブラウザで新規登録 → ログイン → ゲーム開始
- 管理者画面: `http://localhost:5173/admin/login`（`admin / admin`）

---

### 0.1 前提
- **Node.js + npm** が利用できること
- **MySQL または MariaDB** がローカルで起動していること

### 0.2 DB準備（詳細）

**DB作成**
```bash
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS rpg_battle DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
```

**スキーマ適用**
```bash
# プロジェクトルートから実行
mysql -u root -p rpg_battle < server/sql/schema.sql
```

**マスタデータ初期投入**
```bash
cd server
npm install  # 初回のみ

# 環境変数でパスワードを指定する場合（Windows PowerShell）
$env:DB_PASSWORD="YOUR_PASSWORD"
node scripts/seed-master-data.js

# 環境変数でパスワードを指定する場合（Mac/Linux）
DB_PASSWORD="YOUR_PASSWORD" node scripts/seed-master-data.js

# .envファイルを使用する場合（推奨）
# server/.env に DB_PASSWORD を設定してから
node scripts/seed-master-data.js
```

※ 管理者ユーザー `admin / admin` が自動的に作成されます

### 0.3 サーバ起動（API）（詳細）

**環境変数の設定**
- `server/env.example` を `server/.env` にコピーして編集
- 最低限 `DB_PASSWORD` を設定（DBにパスワードがある場合）

**起動コマンド**
```bash
cd server
npm install  # 初回のみ
npm run dev
```

**環境変数のデフォルト値**
- `DB_HOST`: `127.0.0.1`
- `DB_PORT`: `3306`
- `DB_USER`: `root`
- `DB_PASSWORD`: 空（`.env`で設定推奨）
- `DB_NAME`: `rpg_battle`
- `PORT`: `3000`
- `SESSION_SECRET`: `dev_secret`
- `CLIENT_ORIGINS`: `http://localhost:5173`

### 0.4 クライアント起動（画面）（詳細）

**起動コマンド**
```bash
cd client
npm install  # 初回のみ
npm run dev
```

**動作確認**
- Viteが起動すると、コンソールに表示されるURL（例: `http://localhost:5173`）にアクセス
- `/api/*` へのリクエストは自動的に `http://localhost:3000` にプロキシされます

### 0.5 動作確認の最短手順
- ブラウザでクライアントへアクセス（Viteの表示URL）
- 新規登録 → ログイン → Start → PartySelect → Battle → Menu → ゲーム終了（保存してログアウト）
- （任意）管理者機能の確認:
  - `http://localhost:5173/admin/login`（Vite起動時）にアクセス → `admin / admin` でログイン
  - 画像はサーバの `server/uploads/` に保存され、`/uploads/...` で配信されます

### 0.6 トラブルシューティング

#### よくあるエラーと対処法

**エラー: `ECONNREFUSED` または `Can't connect to MySQL server`**
- MySQL/MariaDBが起動していない可能性があります
- 確認: `mysql -u root -p` で接続できるか確認
- 対処: MySQL/MariaDBを起動してください

**エラー: `Access denied for user 'root'@'localhost'`**
- DBパスワードが間違っている可能性があります
- 対処: `server/.env` の `DB_PASSWORD` を正しい値に設定

**エラー: `Unknown database 'rpg_battle'`**
- データベースが作成されていません
- 対処: 「0.2 DB準備」の手順を実行してください

**エラー: `Table 'master_characters' doesn't exist`**
- スキーマが適用されていません
- 対処: `mysql -u root -p rpg_battle < server/sql/schema.sql` を実行

**エラー: `Cannot find module` または `npm ERR!`**
- 依存関係がインストールされていません
- 対処: `cd server && npm install` および `cd client && npm install` を実行

**画像が表示されない**
- `server/uploads/` ディレクトリが存在しない可能性があります
- 対処: サーバーを起動すると自動的に作成されます（または手動で作成）

**ポート3000や5173が既に使用されている**
- 他のアプリケーションがポートを使用しています
- 対処: 使用中のアプリを終了するか、`.env`で`PORT`を変更

## 目次
- 1. 概要
- 2. ゴール / 非ゴール
- 3. スコープ（MVP / Phase 2）
- 4. 対象ユーザー / 動作環境
- 5. システム全体像（責務分割）
- 6. 画面・UI要件（ドラクエ風）
- 7. ゲーム仕様（戦闘/階層/育成/保存/戦績）
- 8. マスタデータ（`master_data/*.json`）仕様
- 9. 永続化（DB）設計
- 10. API設計（REST + セッション）
- 11. 実装アーキテクチャ（ファイル構成 / クラス構成）
- 12. 開発フロー（破綻しない進め方）
- 13. 調整ポイント一覧（暫定値の差し替え箇所）

---

## 1. 概要
ターン制コマンドバトルを中心とした RPG ゲームシミュレーターを開発する。キャラクターを強化しながら階層型ダンジョンを進み、長期的な育成と挑戦を提供する。ログイン機能とデータ保存機能により、プレイヤーの進捗を保持し継続プレイを可能にする。

### 1.1 決定済みサマリ（MVP）
- **フロントエンド**: Vue（PC向け、レスポンシブ非対応）
- **バックエンド**: Node.js
- **DB**: MySQL または MariaDB
- **認証**: username + password
- **戦闘**: **サーバが戦闘を実行（サーバ権威）**
- **battle state**: **サーバメモリのみ**で保持（リロード復帰は要件外）
- **保存タイミング**: 全滅時 / メニューでゲーム終了時
- **全滅時の挙動**: 戦績を保存し、進捗（階層/育成/アイテム）を初期化して最初から（**ログイン状態は維持**）
- **階層進行**: 「次の戦闘」選択で +1、基本エンドレス（1〜100をデフォルト階層）
- **敵生成**: floorEnemyCost によるコスト編成（101階以降は全敵が候補）

---

## 2. ゴール / 非ゴール
### 2.1 ゴール
- ブラウザ上で、ログイン→キャラ選択→戦闘→強化→階層進行→保存/終了、のループが成立していること
- 100階までを「デフォルト階層」として遊べるバランス調整の土台があること
- 101階以降は難易度が急上昇し、101〜300階では「ほとんどのプレイヤーがゲームオーバー」になる難易度を目標とする
- 全滅時は育成状況をリセットし、再挑戦できること
- 戦績（統計）を保存し、メニューから過去記録やユーザー別ランキングを閲覧できること

### 2.2 非ゴール（MVPではやらない）
- レスポンシブ対応
- リロード復帰（戦闘状態の永続化）
- サウンド（Phase 2以降）
- セキュリティ強化（Phase 2以降）

---

## 3. スコープ（MVP / Phase 2）
### 3.1 MVP（本書の主対象）
- **実行形態**: 実行PC内にサーバを構築して動作（ローカル実行）
- **UI**: ドラクエ風（ログウィンドウ、ステータス枠、敵画像）
- **保存**: 全滅/終了時のみ
- **戦闘**: サーバで実行、battle state はサーバメモリのみ

### 3.2 Phase 2（将来拡張）
- **外部サーバでの実行**（自宅サーバ等）に対応する
  - デプロイ/運用/ネットワーク公開に伴う要件（HTTPS/セキュリティ/バックアップ等）は Phase 2 で検討

---

## 4. 対象ユーザー / 動作環境
- **想定ユーザー**: PCブラウザで遊ぶプレイヤー
- **画面サイズ**: PC画面程度（レスポンシブ非対応）

---

## 5. システム全体像（責務分割）
### 5.1 全体像（論理）
```
プレイヤー（ブラウザ）
    ↓
[ログイン画面] / [新規登録画面]
    ↓
[ゲーム本体]
  PartySelect → Battle → Menu →（次の戦闘 / 終了 / 戦績閲覧）
```

### 5.2 責務分割（MVP確定）
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

### 5.3 保存タイミング（確定）
- **保存する**: 全滅時 / メニューでゲーム終了時
- **保存しない**: 階層突破時、戦闘終了時

### 5.4 中断（ゲーム終了）と再開（MVP確定）
- **中断（= メニューでゲーム終了）**:
  - 現在の進捗をDBに保存し、**ログアウト状態**でログイン画面に戻る
- **再開**:
  - 中断中のアカウントで再ログインした場合、**保存した地点から再開**する
  - battle state は保持しないため、再開地点は **戦闘中ではなく「メニュー」**を前提とする

### 5.5 Start画面（ログイン後のスタート画面）（MVP確定）
- ログイン成功後は、直ちにゲームへ入らず **Start画面**を表示する
- Start画面では **ユーザー名**を表示し、以下を選択できる:
  - **ゲームスタート**: 保存地点（`resume.screen`）に応じてゲームを開始/再開する
  - **ログアウト**: ログアウトしてログイン画面へ戻る

---

## 6. 画面・UI要件（ドラクエ風）
### 6.1 共通
- **入力**:
  - 基本はボタン形式のGUI（ドロップダウンは使用しない）
  - **キーボード操作も受付**（MVP確定: 矢印キーで選択、Enterで決定）
- **敵表示**: **敵は画像付きで表示**
- **プレイヤーキャラ表示**: パーティ編成画面やステータス欄で **キャラごとのアイコン/画像**を使用

### 6.2 演出・エフェクト（MVP）
- **バトルログ**: 画面下部にメッセージウィンドウを配置し、「〇〇の攻撃！」「△△に10のダメージ！」などの行動履歴を表示
- **ステータス表示**: 戦闘中、パーティ3人のHP/MP（および名前/Lv）を常時表示（ドラクエ風ウィンドウ）
- **ヒット演出**: 敵画像点滅 または 軽いシェイク程度
- **サウンド**: MVPでは無し

### 6.3 画面一覧（MVP）
- Login（ログイン）
- Register（新規登録）
- Start（スタート画面：ユーザー名表示＋開始/ログアウト）
- PartySelect（パーティ選択）
- Battle（戦闘）
- Menu（戦闘後メニュー）
- Stats/Ranking（戦績・ランキング）
- RunDetail（戦績詳細：スナップショット）

### 6.4 画面遷移（確定）
```
[Login]
  ├─ (新規登録へ) → [Register] → (登録成功) → [Login]
  └─ (ログイン成功)
        ↓
      [Start]
        ├─ ゲームスタート → （resume.screen に応じて分岐）
        │    ├─ resume.screen = party_select → [PartySelect]
        │    └─ resume.screen = menu → [Menu]
        └─ ログアウト → [Login]

    [PartySelect]
        ↓（決定）
      [Battle]
        ↓ (勝利)
      [Menu]
        ├─ キャラ再選択 → [PartySelect] → [Battle]
        ├─ アイテム使用 → [Menu]（同画面内で完結）
        ├─ レベルアップ → [Menu]（同画面内で完結）
        ├─ 戦績/ランキング → [Stats/Ranking]
        │                  └─ 記録クリック → [RunDetail] → [Stats/Ranking] → [Menu]
        ├─ 次の戦闘 → （floor + 1）→ [Battle]
        └─ ゲーム終了 → 保存 → ログアウト → [Login]

（全滅）[Battle] → 戦績保存 → 進捗初期化保存 → （ログイン維持）→ [Start] → [PartySelect]...
```

---

### 6.5 UIレイアウト定義（MVP）
「ドラクエ風」を再現するため、基本は **黒背景 + 白枠ウィンドウ**を組み合わせた固定レイアウトとする。

#### 6.5.1 Login（ログイン画面）
- **画面構成（中央寄せ）**:
  - タイトル: `RPG Battle`（仮）
  - 入力欄（縦並び）:
    - ユーザー名（textbox）
    - パスワード（password textbox）
  - ボタン（横並び）:
    - 「ログイン」（primary）
    - 「新規登録へ」（secondary）
  - メッセージ欄（ウィンドウ）:
    - 入力エラー、ログイン失敗、通信失敗を表示
- **入力バリデーション（MVP暫定）**:
  - ユーザー名: 3〜20文字
  - パスワード: 3〜20文字
- **キーボード（推奨）**:
  - Enter: ログイン実行
  - Tab: フォーカス移動

#### 6.5.2 Register（ユーザ登録画面）
- **画面構成（中央寄せ）**:
  - タイトル: `新規登録`
  - 入力欄（縦並び）:
    - ユーザー名
    - パスワード
    - パスワード（確認）
  - ボタン:
    - 「登録する」（primary）
    - 「ログインへ戻る」（secondary）
  - メッセージ欄:
    - 入力エラー、重複ユーザー名、通信失敗を表示
- **入力バリデーション（MVP暫定）**:
  - Loginと同じ + パスワード確認一致

#### 6.5.3 Game 共通レイアウト（PartySelect / Battle / Menu）
ゲーム中は「ドラクエ風」に、以下の領域を基本とする（固定）。
- **上部バー**:
  - 左: ユーザー名
  - 右: 現在階層（例: `FLOOR 12`）
- **中央メイン領域**: 画面ごとの主表示（パーティ選択 / 敵表示 / メニュー等）
- **下部ログ/操作領域**:
  - 左: メッセージウィンドウ（バトルログ・説明文）
  - 右: コマンドウィンドウ（ボタン群）

#### 6.5.4 PartySelect（パーティ選択）
- **目的**: 7キャラから3人選択し確定
- **中央メイン領域**:
  - 左: キャラ一覧（7キャラ、アイコン＋名前＋Lv）
  - 右: 選択枠（3枠、選択中キャラを表示）
- **下部コマンド**:
  - 「決定」（3人揃っている時のみ有効）
  - 「選択解除」（選択枠から1人外す）
  - 「ログアウト」（ログイン画面へ。未保存なので通常は確認ダイアログ）
- **キーボード（推奨）**:
  - ↑↓: 一覧選択
  - Enter: 選択/解除
  - 1/2/3: 選択枠フォーカス

#### 6.5.5 Battle（戦闘画面）
- **中央メイン領域（戦闘表示）**:
  - 上: 敵画像エリア（1〜5体を横並び。ボスは強調表示）
  - 下: 味方ステータスウィンドウ（3人分、名前/Lv/HP/MP）
- **下部ログ/操作領域**:
  - 左: バトルログ（最新が下、必要ならスクロール）
  - 右: コマンドウィンドウ
    - 行動者が味方のときのみ表示・入力可
    - コマンド: 「たたかう」「じゅもん」「どうぐ」「ぼうぎょ」
- **サブウィンドウ（必要時に出現）**:
  - じゅもん選択: スキル一覧（使用不可はグレーアウト）
  - どうぐ選択: アイテム一覧（所持0はグレーアウト）
  - 対象選択: 単体/全体に応じて対象ボタンを表示
- **入力ロック**:
  - サーバ処理中（API待ち）はコマンドを無効化し二重送信を防ぐ

#### 6.5.6 Menu（戦闘後メニュー）
- **中央メイン領域**:
  - 左: メニュー項目（縦）
    - 「レベルアップ」
    - 「キャラ再選択」
    - 「アイテム使用」
    - 「戦績/ランキング」
    - 「次の戦闘」
    - 「ゲーム終了」
  - 右: 説明/プレビュー（選択中項目の説明）
- **重要**:
  - 「ゲーム終了」選択時にのみ保存（10.5）

#### 6.5.7 Stats/Ranking（戦績・ランキング）
- **画面構成**:
  - タブ（または切替ボタン）:
    - 「自分の戦績」
    - 「ランキング」
- **自分の戦績**:
  - 一覧テーブル: `日時 / ended_reason / 最高到達階層 / 最大ダメージ`
  - 行クリック: RunDetailへ
- **ランキング**:
  - 一覧テーブル: `順位 / ユーザー名 / 最高到達階層 / 最大ダメージ`

#### 6.5.8 RunDetail（戦績詳細）
- **表示**:
  - 上部: ended_reason / 最高到達階層 / 最大ダメージ
  - 左: 全キャラクターLv一覧
  - 右: 全スキルLv一覧
- **戻る**: Stats/Rankingへ

## 7. ゲーム仕様（戦闘/階層/育成/保存/戦績）
### 7.1 認証（LoginSystem）
#### 7.1.1 新規登録
- ユーザー名＋パスワードでユーザーを作成する
- 初期状態:
  - キャラクター/スキル: 全てレベル1
  - 所持アイテム: 初期所持（8.6）
  - 階層: 1

#### 7.1.2 ログイン
- 入力されたユーザー名＋パスワードで認証する

#### 7.1.3 パスワード保存（暫定: MVP仮）
- **平文で保存**（`password` カラムにそのまま格納）
- Phase 2（外部公開）では見直す前提

### 7.2 パーティ（PartyManager）
- 7キャラ固定から3人を選択する
- 再選択できるタイミング:
  - ゲーム開始時
  - 毎階層突破時（戦闘終了後メニューから）

#### 7.2.1 キャラクター（固定7職）
- 勇者: バランスがよく様々なスキルが使える
- 戦士: 物理攻撃力と防御力が高いが、ほとんど物理攻撃しか使えない
- 魔法使い: 魔法攻撃力が高く全体魔法を使えるが、HPと防御が低い
- 僧侶: 回復中心。**戦闘中のみ使用可能な「死者蘇生」**を唯一習得
- 騎士: HP/防御が高く回復/バフが多いが攻撃力が低い
- 呪術師: 状態異常/バフが多いが攻撃力が低い
- 盗賊: speedが速く会心率高め。一部状態異常/ヒールも可能

### 7.3 戦闘（BattleSystem）
#### 7.3.1 戦闘コマンド（確定）
- たたかう（通常攻撃）: 必須
- じゅもん（スキル）: 必須
- どうぐ（アイテム）: **戦闘中も使用可能**
- ぼうぎょ: 実装する
- にげる: 実装しない

#### 7.3.2 戦闘の実行（MVP確定）
- 戦闘は **サーバが実行**する（クライアントは入力・表示）
- battle state は **サーバメモリのみ**で保持（リロード復帰なし）

#### 7.3.3 行動順（暫定: MVP仮）
**MVP確定**: 行動順は以下の式で戦闘開始時に確定し、その戦闘中は固定する。
- `initiative = speed * level`
- 並び順: `initiative` 降順
- 同値の場合: ランダム

> 注記: 「階層ごとに固定」を満たすため、同値ランダムの結果も戦闘開始時に確定し battle state に保持する。

#### 7.3.4 ダメージ/回復（暫定: MVP仮）
- 前提:
  - 物理: `currentAtk`
  - 魔法: `matk`（魔法防御は `currentDef` を共用）
  - バフ/デバフは `current*` に事前反映
- 通常攻撃（物理）:
  - `base = attacker.currentAtk - floor(defender.currentDef * 0.5)`
  - `lvl = 1 + attacker.level * 0.02`
  - `variance = randFloat(0.90, 1.10)`
  - `damage = floor(max(1, base) * lvl * variance)`
- スキル攻撃:
  - `stat = (powerType == 'magical') ? attacker.matk : attacker.currentAtk`
  - `base = stat * (power / 100) - floor(defender.currentDef * 0.5)`
  - `lvl = 1 + attacker.level * 0.02`
  - `variance = randFloat(0.90, 1.10)`
  - `damage = floor(max(1, base) * lvl * variance)`
- クリティカル:
  - `if randFloat(0, 1) < critRate` then `damage = floor(damage * critMag)`
- 命中:
  - `if randFloat(0, 1) > accuracy` then `damage = 0`（Miss）
- ぼうぎょ:
  - 防御中の対象への被ダメージを `floor(damage * 0.5)`（次の自分の行動開始まで）
- 回復スキル/アイテム:
  - `healing = power * (1 + attacker.level * 0.02) * randFloat(0.95, 1.05)`
  - クリティカルは適用しない（回復は常に成功）
- 属性:
  - MVPでは属性相性は未実装（`element` は保持のみ）

#### 7.3.5 状態異常（暫定: MVP仮）
- ターン開始:
  - DOT: `hp -= value`
  - regen: `hp = min(maxHp, hp + value)`
  - stun: 行動スキップ
  - バフ/デバフ: `current*` 再計算して反映
- ターン終了:
  - `duration -= 1`、`duration <= 0` は削除

#### 7.3.6 死者蘇生（僧侶固有）（暫定: MVP仮）
- 戦闘中のみ、`isDead = true` の対象のみ
- 復活時:
  - HP: `floor(maxHp * 0.30)`（最低1）
  - MP: 0
  - 状態異常: 全解除（`conditions = []`）
  - 行動順: 次に回ってきたタイミングから行動

### 7.4 敵生成（EnemyFactory）（暫定: MVP仮）
#### 7.4.1 ルール（確定）
- 1戦闘あたり敵は1〜5体
- `sum(effectiveCost) <= floorEnemyCost` を満たすように編成
- 101階以降は出現階層制限なし（全敵候補）
- ボスは専用データ。1ターン複数回行動などの特殊行動を許容

#### 7.4.2 暫定パラメータ（MVP仮）
- ボス階層: 10,20,...,100
- floorEnemyCost:
  - `base100(f) = 30 + f * 5 + floor(f / 10) * 10`（1〜100）
  - `base300(f) = base100(100) + (f - 100) * 12 + floor((f - 100) / 10) * 25`（101〜300）
  - `floorEnemyCost(f) = (f <= 100) ? base100(f) : (f <= 300) ? base300(f) : base300(300) + (f - 300) * 15`
- 敵実効コスト:
  - `effectiveCost = baseCost + level * 2`
- 編成アルゴリズム（概要）:
  - 候補をフィルタ → 1〜5体になるまでランダム選出（上限超過しない範囲）
  - ボス階層（1〜100）ではボスを1体確定し、残りを雑魚で埋める

### 7.5 敵AI（暫定: MVP仮）
- 優先順位:
  1. HP30%以下かつ回復スキル所持 → 回復
  2. パーティ全体HP50%以下かつ全体攻撃所持 → 全体攻撃
  3. それ以外: 通常攻撃60% / スキル40%
- 対象選択:
  - 単体: ランダム
  - 全体: 全員
  - 回復/バフ: 自己または最もHPが低い味方

### 7.6 育成（ExperienceSystem）（暫定: MVP仮）
#### 7.6.1 レベル/経験値
- レベル上限: 99
- 獲得経験値（勝利時、パーティ全員）:
  - `gainExp = floorEnemyCost(currentFloor) * 2`
  - 3人に均等配分（端数切り捨て）
- 必要経験値:
  - `nextExp(level) = floor(50 * level * level)`（Lv1→2は50）

#### 7.6.2 スキル育成
- スキルレベル上限: 10
- 使用したスキルに勝利時 `+1`（使用回数分）
- 必要スキル経験値:
  - `skillNextExp(level) = level * 3`
- unlock/prerequisite:
  - マスタJSONの `unlockLevel` / `prerequisiteIds` を満たす場合のみ使用可能

### 7.7 階層進行（確定）
- 1階層 = 1戦闘
- 「次の戦闘」で階層+1
- 1〜100: デフォルト階層
- 101〜300: 難易度急上昇
- 301〜: 300と同じ上昇率で継続（暫定）

### 7.8 保存/全滅（確定）
- 保存タイミング: 全滅時 / ゲーム終了時
- 全滅時:
  - 戦績保存
  - 進捗初期化（階層1、Lv1、初期アイテム）
- ゲーム終了時（階層突破メニューで終了）:
  - 現在の進捗をDBに保存
  - **ログアウト状態**でログイン画面に戻す
  - 次回ログイン時は **保存地点（メニュー）**から再開する

> 追加仕様（MVP確定）:
> - **全滅時はログアウトしない**（ログイン状態維持）
> - 全滅後は Start画面に戻り、ニューゲームとして再開する

### 7.9 戦績/ランキング（確定）
- 一覧表示:
  - 最高到達階層
  - 最大ダメージ
- 最大ダメージ定義:
  - **プレイヤーが敵に与えた単発最大ダメージ**
- ランキング:
  - ソート: 最高到達階層 → 最大ダメージ → 新しい記録
- クリックで詳細:
  - その記録の全キャラLv / 全スキルLv

---

## 8. マスタデータ仕様
### 8.1 方針（変更: DB移行）
- **マスタデータはDBに保存**する（`master_data/*.json` は初期データ投入用として残す）
- キャラクター、スキル、アイテム、状態異常、敵のデータは `master_*` テーブルに格納
- **画像ファイルはサーバに保存**（`server/uploads/characters/`, `server/uploads/enemies/` など）
- `imagePath`: サーバ上の画像ファイルパス（例: `/uploads/characters/hero.png`）
- サーバ起動時にDBからマスタデータを読み込み、メモリに保持（キャッシュ）
- 管理者ページからマスタデータの追加・編集・削除が可能

### 8.1.1 参照整合性（必須）
以下は **実装時に必ず整合**させる（不足すると戦闘や画面が破綻する）。
- `master_characters` の `initial_skill_ids` / `learnable_skill_ids` は `master_skills` の `id` を参照する
- `master_skills` の `conditions`（JSON配列）内の `conditionId` は `master_conditions` の `id` を参照する
- `master_enemies` の `skill_ids`（JSON配列）は `master_skills` の `id` を参照する
- `master_items` の `id` は、進捗（所持アイテム）で参照する

> 注記: 本書の例に出てくる `attack_basic` / `heal_small` / `ether` / `burn` 等は、実際に各テーブルに定義すること（例示IDのまま実装してOK）。

### 8.2 `master_characters` テーブル
- **カラム**:
  - `id`: VARCHAR(64) PRIMARY KEY（snake_case）
  - `name`: VARCHAR(64) NOT NULL
  - `description`: TEXT
  - `image_path`: VARCHAR(255) NOT NULL（サーバ上の画像パス、例: `/uploads/characters/hero.png`）
  - `base_stats_json`: JSON NOT NULL（`{ "maxHp": 100, "maxMp": 30, "atk": 15, "matk": 10, "def": 10, "speed": 10 }`）
  - `growth_per_level_json`: JSON NOT NULL（`{ "maxHp": 8, "maxMp": 3, "atk": 2, "matk": 2, "def": 2, "speed": 1 }`）
  - `initial_skill_ids_json`: JSON NOT NULL（`["attack_basic"]`）
  - `learnable_skill_ids_json`: JSON NOT NULL（`["fireball", "heal_small"]`）
  - `tags_json`: JSON（`["balanced"]`）
  - `created_at`: DATETIME DEFAULT CURRENT_TIMESTAMP
  - `updated_at`: DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
- **ステータス算出（暫定）**: `base + (level - 1) * growth`
- **画像**: `server/uploads/characters/<id>.png` に保存（管理者ページからアップロード）

### 8.3 `master_skills` テーブル
- **カラム**:
  - `id`: VARCHAR(64) PRIMARY KEY（snake_case）
  - `name`: VARCHAR(64) NOT NULL
  - `description`: TEXT
  - `skill_type`: ENUM('attack', 'heal', 'buff', 'debuff', 'special') NOT NULL
  - `target_type`: ENUM('enemy', 'ally', 'self') NOT NULL
  - `range`: ENUM('single', 'all') NOT NULL
  - `power`: INT NOT NULL
  - `power_type`: ENUM('physical', 'magical') NOT NULL
  - `element`: VARCHAR(32)（'fire', 'ice', 'poison' 等、MVPでは未使用）
  - `crit_rate`: DECIMAL(5,4) DEFAULT 0.0（0.0〜1.0）
  - `crit_mag`: DECIMAL(5,2) DEFAULT 1.5
  - `cost`: INT NOT NULL
  - `cost_type`: ENUM('mp', 'hp') NOT NULL
  - `accuracy`: DECIMAL(5,4) DEFAULT 1.0（0.0〜1.0）
  - `conditions_json`: JSON（`[{ "conditionId": "burn", "chance": 0.2, "durationOverride": 2 }]`）
  - `unlock_level`: INT DEFAULT 1
  - `prerequisite_ids_json`: JSON（`[]`）
  - `is_passive`: BOOLEAN DEFAULT FALSE
  - `created_at`: DATETIME DEFAULT CURRENT_TIMESTAMP
  - `updated_at`: DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP

### 8.4 `master_items` テーブル
- **カラム**:
  - `id`: VARCHAR(64) PRIMARY KEY（snake_case）
  - `name`: VARCHAR(64) NOT NULL
  - `description`: TEXT
  - `type`: VARCHAR(32) NOT NULL（'potion', 'ether', 'buff_item' 等）
  - `target`: ENUM('ally', 'enemy', 'self') NOT NULL
  - `battle_usable`: BOOLEAN DEFAULT TRUE
  - `max_stack`: INT DEFAULT 99
  - `effect_json`: JSON NOT NULL（`{ "kind": "heal_hp", "power": 30 }`）
  - `created_at`: DATETIME DEFAULT CURRENT_TIMESTAMP
  - `updated_at`: DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP

### 8.5 `master_conditions` テーブル
- **カラム**:
  - `id`: VARCHAR(64) PRIMARY KEY（snake_case）
  - `name`: VARCHAR(64) NOT NULL
  - `condition_type`: ENUM('dot', 'regen', 'stun', 'buff', 'debuff') NOT NULL
  - `stat`: ENUM('hp', 'mp', 'atk', 'matk', 'def', 'speed') NOT NULL
  - `value`: INT NOT NULL
  - `value_type`: ENUM('add', 'multiply') NOT NULL
  - `duration`: INT NOT NULL（ターン数）
  - `created_at`: DATETIME DEFAULT CURRENT_TIMESTAMP
  - `updated_at`: DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP

### 8.6 `master_enemies` テーブル
- **カラム**:
  - `id`: VARCHAR(64) PRIMARY KEY（snake_case）
  - `name`: VARCHAR(64) NOT NULL
  - `image_path`: VARCHAR(255) NOT NULL（サーバ上の画像パス、例: `/uploads/enemies/slime_01.png`）
  - `base_cost`: INT NOT NULL
  - `appear_min_floor`: INT DEFAULT 1
  - `appear_max_floor`: INT（NULLの場合は101階以降も出現可能）
  - `is_boss`: BOOLEAN DEFAULT FALSE
  - `base_stats_json`: JSON NOT NULL（`{ "maxHp": 50, "maxMp": 0, "atk": 8, "matk": 0, "def": 5, "speed": 6 }`）
  - `growth_per_level_json`: JSON NOT NULL（`{ "maxHp": 5, "maxMp": 0, "atk": 1, "matk": 0, "def": 1, "speed": 1 }`）
  - `skill_ids_json`: JSON NOT NULL（`["attack_basic"]`）
  - `ai_profile_json`: JSON（`{ "type": "default" }`）
  - `created_at`: DATETIME DEFAULT CURRENT_TIMESTAMP
  - `updated_at`: DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
- **敵レベル（暫定）**: `enemyLevel = max(1, floor(currentFloor / 2))`
- **画像**: `server/uploads/enemies/<id>.png` に保存（管理者ページからアップロード）

### 8.7 初期所持アイテム（暫定）
- ポーション: 3
- エーテル: 1

---

## 9. 永続化（DB）設計
### 9.1 方針（MVP確定）
- 進捗は `user_state.state_json` に **1 JSONで保持（正規化しない）**

### 9.2 テーブル
- **ユーザー/進捗関連**:
  - `users`
  - `user_state`
  - `runs`
- **マスタデータ**:
  - `master_characters`
  - `master_skills`
  - `master_items`
  - `master_conditions`
  - `master_enemies`
- **管理者**:
  - `admin_users`（管理者認証用）

### 9.3 DDL（案）
```sql
-- ユーザー/進捗関連
CREATE TABLE users (
  id BIGINT NOT NULL AUTO_INCREMENT,
  username VARCHAR(32) NOT NULL,
  password VARCHAR(255) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE user_state (
  user_id BIGINT NOT NULL,
  current_floor INT NOT NULL DEFAULT 1,
  state_json JSON NOT NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id),
  CONSTRAINT fk_user_state_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE runs (
  id BIGINT NOT NULL AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  ended_reason ENUM('game_over','quit') NOT NULL,
  start_at DATETIME NULL,
  end_at DATETIME NULL,
  max_floor_reached INT NOT NULL,
  max_damage INT NOT NULL DEFAULT 0,
  run_stats_json JSON NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_runs_user_id_created_at (user_id, created_at),
  KEY idx_runs_rank_floor_damage (max_floor_reached, max_damage),
  CONSTRAINT fk_runs_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- マスタデータ
CREATE TABLE master_characters (
  id VARCHAR(64) NOT NULL,
  name VARCHAR(64) NOT NULL,
  description TEXT,
  image_path VARCHAR(255) NOT NULL,
  base_stats_json JSON NOT NULL,
  growth_per_level_json JSON NOT NULL,
  initial_skill_ids_json JSON NOT NULL,
  learnable_skill_ids_json JSON NOT NULL,
  tags_json JSON,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE master_skills (
  id VARCHAR(64) NOT NULL,
  name VARCHAR(64) NOT NULL,
  description TEXT,
  skill_type ENUM('attack', 'heal', 'buff', 'debuff', 'special') NOT NULL,
  target_type ENUM('enemy', 'ally', 'self') NOT NULL,
  range ENUM('single', 'all') NOT NULL,
  power INT NOT NULL,
  power_type ENUM('physical', 'magical') NOT NULL,
  element VARCHAR(32),
  crit_rate DECIMAL(5,4) DEFAULT 0.0,
  crit_mag DECIMAL(5,2) DEFAULT 1.5,
  cost INT NOT NULL,
  cost_type ENUM('mp', 'hp') NOT NULL,
  accuracy DECIMAL(5,4) DEFAULT 1.0,
  conditions_json JSON,
  unlock_level INT DEFAULT 1,
  prerequisite_ids_json JSON,
  is_passive BOOLEAN DEFAULT FALSE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE master_items (
  id VARCHAR(64) NOT NULL,
  name VARCHAR(64) NOT NULL,
  description TEXT,
  type VARCHAR(32) NOT NULL,
  target ENUM('ally', 'enemy', 'self') NOT NULL,
  battle_usable BOOLEAN DEFAULT TRUE,
  max_stack INT DEFAULT 99,
  effect_json JSON NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE master_conditions (
  id VARCHAR(64) NOT NULL,
  name VARCHAR(64) NOT NULL,
  condition_type ENUM('dot', 'regen', 'stun', 'buff', 'debuff') NOT NULL,
  stat ENUM('hp', 'mp', 'atk', 'matk', 'def', 'speed') NOT NULL,
  value INT NOT NULL,
  value_type ENUM('add', 'multiply') NOT NULL,
  duration INT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE master_enemies (
  id VARCHAR(64) NOT NULL,
  name VARCHAR(64) NOT NULL,
  image_path VARCHAR(255) NOT NULL,
  base_cost INT NOT NULL,
  appear_min_floor INT DEFAULT 1,
  appear_max_floor INT,
  is_boss BOOLEAN DEFAULT FALSE,
  base_stats_json JSON NOT NULL,
  growth_per_level_json JSON NOT NULL,
  skill_ids_json JSON NOT NULL,
  ai_profile_json JSON,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 管理者
CREATE TABLE admin_users (
  id BIGINT NOT NULL AUTO_INCREMENT,
  username VARCHAR(32) NOT NULL,
  password VARCHAR(255) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_admin_users_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### 9.4 ランキングクエリ（案）
```sql
SELECT
  u.id AS user_id,
  u.username,
  MAX(r.max_floor_reached) AS best_floor,
  MAX(r.max_damage) AS best_damage
FROM users u
JOIN runs r ON r.user_id = u.id
GROUP BY u.id, u.username
ORDER BY best_floor DESC, best_damage DESC, MAX(r.created_at) DESC;
```

### 9.5 `state_json` / `run_stats_json` の形式（MVP推奨）
実装を詰まらせないため、DBに入るJSONの最低限の形を定義する（拡張可）。

#### 9.5.1 `user_state.state_json`（進捗）
```json
{
  "schemaVersion": 1,
  "currentFloor": 1,
  "resume": { "screen": "menu" },
  "party": ["hero", "warrior", "priest"],
  "characters": {
    "hero": { "level": 1, "exp": 0, "hp": 100, "mp": 30 },
    "warrior": { "level": 1, "exp": 0, "hp": 120, "mp": 10 }
  },
  "skills": {
    "fireball": { "level": 1, "exp": 0 }
  },
  "items": {
    "potion": 3,
    "ether": 1
  }
}
```
- **再開地点（MVP確定）**:
  - `resume.screen` は `menu` / `party_select` / `start` を取り得る
  - `battle` はMVPでは不可（battle stateを保持しないため）
- **参照ID**: `party`/`characters` のキーは `characters.json` の `id`、`skills` のキーは `skills.json` の `id`、`items` のキーは `items.json` の `id`
- **所持数**: アイテムごとに 0〜99（8.4）
- **注意**: 戦闘状態（battle state）はここには保存しない（MVPの方針）

#### 9.5.2 `runs.run_stats_json`（戦績スナップショット）
```json
{
  "schemaVersion": 1,
  "endedReason": "quit",
  "maxFloorReached": 12,
  "maxDamage": 180,
  "characterLevels": { "hero": 12, "warrior": 10, "priest": 9 },
  "skillLevels": { "fireball": 3, "heal_small": 2 }
}
```
- RunDetail画面はこのJSONから「全キャラLv/全スキルLv」を表示できればOK

---

## 10. API設計（REST + セッション）
### 10.1 認証
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`

### 10.2 進捗
- `GET /api/state`
- `PUT /api/state`（終了時/全滅時のみ）

### 10.3 戦績/ランキング
- `POST /api/runs`
- `GET /api/runs`
- `GET /api/ranking`

### 10.4 戦闘（サーバ権威）
- `POST /api/battle/start`
- `POST /api/battle/act`
- `GET /api/battle/:battleId`

### 10.5 マスタデータ（公開API）
- `GET /api/master`（全マスタデータ取得、キャッシュから返却）

### 10.6 画像配信
- `GET /uploads/characters/:filename`（キャラクター画像）
- `GET /uploads/enemies/:filename`（敵画像）

### 10.7 管理者API（管理者認証必須）
- `POST /api/admin/login`（管理者ログイン）
- `POST /api/admin/logout`（管理者ログアウト）
- `GET /api/admin/characters`（キャラクター一覧）
- `POST /api/admin/characters`（キャラクター追加）
- `PUT /api/admin/characters/:id`（キャラクター更新）
- `DELETE /api/admin/characters/:id`（キャラクター削除）
- `POST /api/admin/characters/:id/image`（キャラクター画像アップロード）
- （同様に `skills`, `items`, `conditions`, `enemies` にもCRUD API）

### 10.8 保存呼び出しタイミング（確定）
- ゲーム終了:
  - `POST /api/runs`（quit）
  - `PUT /api/state`
  - `POST /api/auth/logout`
- 全滅:
  - `POST /api/runs`（game_over）
  - 進捗初期化
  - `PUT /api/state`
  - （ログイン維持のため **logoutは呼ばない**）

### 10.9 レスポンス/エラーの共通形式（MVP推奨）
クライアント実装を詰まらせないため、APIのエラー形式を統一する。

#### 10.6.1 成功レスポンス（例）
```json
{ "ok": true, "data": { } }
```

#### 10.6.2 エラーレスポンス（例）
```json
{ "ok": false, "error": { "code": "UNAUTHORIZED", "message": "login required" } }
```
- `code` の例: `BAD_REQUEST`, `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`, `INTERNAL`

### 10.10 戦闘APIの入出力（MVP推奨）
サーバ権威戦闘で詰まりやすい「進捗の持ち方」を統一するため、APIで扱う最低限の形を定義する。

- `POST /api/battle/start`（推奨入力）
  - `floor`: number（基本は `state_json.currentFloor` を送る）
  - `party`: string[]（3人、キャラID）
  - `state`: object（戦闘開始に必要な進捗スナップショット：所持アイテム数、各キャラLv/HP/MP等）
- `POST /api/battle/act`（推奨入力）
  - `battleId`, `actorId`, `action`, `target`, `payload`（skillId/itemId等）
- `BattleStartResponse/BattleActResponse`（推奨出力）
  - `battle`（battle state：敵/味方の現在HP、行動者、ログ）
  - `deltaState`（消費アイテムや獲得経験値など、進捗への差分。クライアントはローカル進捗へ適用）

#### 10.10.1 進捗の正（MVP確定）
MVPでは以下を**確定仕様**とする。
- **アイテム所持数の正はサーバ**とする
  - `POST /api/battle/act` で `payload.itemId` が指定された場合、サーバは `state.items[itemId]` を確認し、足りなければエラー（`BAD_REQUEST`）を返す
  - 成功時、サーバはアイテム消費を `deltaState` として返し、クライアントはローカル進捗へ適用する
- **スキルコスト（MP等）の正もサーバ**とする（同様に不足時はエラー）

> 注記: MVPは保存が終了/全滅時のみなので、戦闘中の進捗は「クライアントのローカル進捗 + サーバから返るdelta」で維持する設計が最も簡単。

---

## 11. 実装アーキテクチャ（ファイル構成 / クラス構成）
### 11.1 ファイル構成（推奨）
```
rpg_battle/
  client/
    src/
      assets/
        ui/
      components/
      pages/
        AdminPage.vue（管理者ページ）
        AdminCharacterEditPage.vue（キャラクター編集）
        AdminSkillEditPage.vue（スキル編集）
        AdminItemEditPage.vue（アイテム編集）
        AdminConditionEditPage.vue（状態異常編集）
        AdminEnemyEditPage.vue（敵編集）
      router/
      store/
      services/
      types/
  server/
    src/
      api/
        AdminController.ts（管理者API）
      auth/
        adminAuthGuard.ts（管理者認証ミドルウェア）
      db/
        MasterCharacterRepository.ts
        MasterSkillRepository.ts
        MasterItemRepository.ts
        MasterConditionRepository.ts
        MasterEnemyRepository.ts
        AdminUserRepository.ts
      game/
      master/
        MasterDataCache.ts（DBから読み込んだマスタデータのキャッシュ）
      uploads/
        characters/（キャラクター画像）
        enemies/（敵画像）
      validation/
  shared/
    types/
  master_data/（初期データ投入用、DB移行後は参照のみ）
    characters.json
    skills.json
    items.json
    conditions.json
    enemies.json
  README.md
```

### 11.2 クラス/モジュール構成（要点）
- サーバ:
  - `BattleService`, `EnemyFactory`, `TurnManager`, `DamageCalculator`, `ConditionSystem`, `EnemyAI`, `ExperienceService`
  - `BattleMemoryStore`（メモリ保持）
  - `UserRepository`, `UserStateRepository`, `RunRepository`
  - `MasterCharacterRepository`, `MasterSkillRepository`, `MasterItemRepository`, `MasterConditionRepository`, `MasterEnemyRepository`
  - `AdminUserRepository`
  - `MasterDataCache`（DBから読み込んだマスタデータをメモリキャッシュ）
  - `AuthController`, `StateController`, `BattleController`, `RunController`, `RankingController`, `AdminController`
  - `adminAuthGuard`（管理者認証ミドルウェア）
- クライアント:
  - `ApiClient`
  - `AuthStore`, `UserStateStore`, `BattleViewStore`, `StatsStore`
  - `LoginPage`, `RegisterPage`, `PartySelectPage`, `BattlePage`, `MenuPage`, `StatsRankingPage`, `RunDetailPage`
  - `AdminPage`, `AdminCharacterEditPage`, `AdminSkillEditPage`, `AdminItemEditPage`, `AdminConditionEditPage`, `AdminEnemyEditPage`

---

## 12. 開発フロー（破綻しない進め方）
### 12.1 方針
- 縦に切って「動くもの」を早く作る（登録→戦闘→終了保存）
- UIより先にサーバ戦闘（battle/start→battle/act）を通す
- マスタJSON/進捗JSONの変更に強い設計を優先する

### 12.2 推奨実装順
1. 土台（repo構成、DB接続、セッション、マスタロード）
2. 認証/進捗（register/login/state）
3. 戦闘API（start/act + メモリ保持）
4. クライアント導線（Login→PartySelect→Battle→Menu）
5. 戦績/ランキング（runs/ranking + 詳細表示）

### 12.3 動作確認チェック
- 登録→ログイン→state取得
- battle/start→battle/actで勝敗が出る
- 全滅で戦績保存 + 進捗初期化
- 終了で戦績保存 + 進捗保存

### 12.4 ファイルごとの開発フロー（詳細）
この章は「どの順番で、どのファイルを作る/触るか」を **MVPで詰まらない順**に並べる。
（ファイル名は推奨。実際の命名は多少変更してもよいが、責務は維持する）

#### 12.4.1 フェーズ0: プロジェクト土台（最初に作る）
- **server**
  - `server/package.json`: Node/依存関係、起動スクリプト
  - `server/src/index.ts`（or `index.js`）: サーバエントリ
  - `server/src/api/router.ts`: `/api/*` のルート集約
  - `server/src/auth/session.ts`: Cookieセッション設定
  - `server/src/db/db.ts`: DB接続（MySQL/MariaDB）
  - `server/src/master/MasterDataLoader.ts`: `master_data/*.json` ロード + 参照整合性チェック
  - `server/src/validation/validate.ts`: 共通バリデーション（必須キー、型、範囲）
- **client**
  - `client/package.json`: Vue/依存関係、起動スクリプト
  - `client/src/main.ts`: エントリ
  - `client/src/router/index.ts`: 画面ルーティング（Login/Register/Start/PartySelect/Battle/Menu/Stats/RunDetail）
  - `client/src/services/ApiClient.ts`: fetchラッパ（認証/進捗/戦闘/戦績）
- **master_data**
  - `master_data/characters.json`
  - `master_data/skills.json`
  - `master_data/items.json`
  - `master_data/conditions.json`
  - `master_data/enemies.json`

> ゴール: サーバ起動でマスタJSONを検証でき、クライアントからAPI疎通できる。

#### 12.4.2 フェーズ1: DBと認証（まず“ログインできる”まで）
- **DDL適用**
  - （手順）`9.3 DDL` をDBに反映
- **server**
  - `server/src/db/UserRepository.ts`
  - `server/src/db/UserStateRepository.ts`
  - `server/src/api/AuthController.ts`（register/login/logout）
  - `server/src/api/StateController.ts`（GET/PUT /api/state）
- **client**
  - `client/src/pages/LoginPage.vue`
  - `client/src/pages/RegisterPage.vue`
  - `client/src/store/AuthStore.ts`
  - `client/src/store/UserStateStore.ts`

> ゴール: 新規登録→ログイン→`GET /api/state` が成功する。

#### 12.4.3 フェーズ2: Start画面と再開（中断復帰の土台）
- **client**
  - `client/src/pages/StartPage.vue`
    - ユーザー名表示
    - 「ゲームスタート」「ログアウト」
  - `client/src/router/index.ts`: ログイン後はStartへ遷移
  - `client/src/store/UserStateStore.ts`: `resume.screen` を見て Menu/PartySelect に遷移
- **server**
  - `server/src/api/AuthController.ts`: logout の動作確認（10.5）

> ゴール: ログイン成功→Start→（resumeに応じて）Menu or PartySelectへ遷移できる。

#### 12.4.4 フェーズ3: 戦闘ドメイン（サーバ権威戦闘を先に完成）
- **server**
  - `server/src/game/BattleMemoryStore.ts`: battle state をメモリ保持
  - `server/src/game/TurnManager.ts`: 行動順（`initiative = speed * level` + 同値ランダム）
  - `server/src/game/DamageCalculator.ts`: ダメージ/回復/防御
  - `server/src/game/ConditionSystem.ts`: 状態異常（開始/終了処理）
  - `server/src/game/EnemyFactory.ts`: floorEnemyCost制約で敵生成
  - `server/src/game/EnemyAI.ts`: 敵行動決定（暫定）
  - `server/src/game/ExperienceService.ts`: 経験値/スキル経験値の付与
  - `server/src/game/BattleService.ts`: start/act のオーケストレーション
  - `server/src/api/BattleController.ts`: `/api/battle/start` `/api/battle/act` `/api/battle/:battleId`

> ゴール: Postman等なしでも、最低限のリクエストで start→act が成立し、ログとHPが動く。

#### 12.4.5 フェーズ4: クライアント戦闘画面（入力→サーバ→表示）
- **client**
  - `client/src/pages/BattlePage.vue`
  - `client/src/components/BattleLogWindow.vue`
  - `client/src/components/PartyStatusWindow.vue`
  - `client/src/components/EnemyDisplay.vue`
  - `client/src/components/CommandPanel.vue`（攻撃/じゅもん/どうぐ/ぼうぎょ）
  - `client/src/components/TargetSelector.vue`
  - `client/src/store/BattleViewStore.ts`
  - `client/src/services/ApiClient.ts`: `battleStart/battleAct/battleGet`
  - キーボード: ↑↓で選択、Enterで決定（6.1/13）

> ゴール: Battle画面から操作でき、サーバ戦闘が進む。

#### 12.4.6 フェーズ5: Menu/PartySelect（ゲームループの完成）
- **client**
  - `client/src/pages/PartySelectPage.vue`
  - `client/src/pages/MenuPage.vue`
  - 「次の戦闘」で floor+1 → battle/start
  - 「ゲーム終了」で 10.5 の順に API 呼び出し→Loginへ
- **server**
  - `server/src/api/StateController.ts`: PUT（終了時/全滅時）を実運用で確認

> ゴール: PartySelect→Battle→Menu→次の戦闘…→終了 が一周する。

#### 12.4.7 フェーズ6: 全滅時の仕様（ログイン維持でStartへ）
- **server**
  - `server/src/game/BattleService.ts`: 全滅判定→戦績保存用データ生成→進捗初期化（7.8）
- **client**
  - 全滅時: `/api/runs` → `PUT /api/state` を実行し、**ログアウトせず** Startへ戻す（6.4/10.5）

> ゴール: 全滅したらStartへ戻り、同アカウントでニューゲーム開始できる。

#### 12.4.8 フェーズ7: 戦績/ランキング画面
- **server**
  - `server/src/db/RunRepository.ts`
  - `server/src/api/RunController.ts` / `server/src/api/RankingController.ts`
- **client**
  - `client/src/pages/StatsRankingPage.vue`
  - `client/src/pages/RunDetailPage.vue`

> ゴール: 戦績一覧/ランキング/詳細が表示できる。

#### 12.4.9 フェーズ8: マスタデータDB移行と管理者機能
- **server**
  - `server/sql/schema.sql`: マスタテーブルDDL追加
  - `server/src/db/MasterCharacterRepository.ts` 等（各マスタRepository）
  - `server/src/master/MasterDataCache.ts`: DBからマスタデータを読み込みキャッシュ
  - `server/src/index.ts`: 起動時にMasterDataCacheを初期化
  - `server/src/api/MasterController.ts`: `GET /api/master`（キャッシュから返却）
  - `server/src/db/AdminUserRepository.ts`
  - `server/src/auth/adminAuthGuard.ts`: 管理者認証ミドルウェア
  - `server/src/api/AdminController.ts`: 管理者CRUD API
  - `server/src/index.ts`: 画像配信用の静的ファイル配信設定（`/uploads/*`）
  - `server/src/api/AdminController.ts`: 画像アップロード処理（`multer` 等を使用）
- **client**
  - `client/src/pages/AdminPage.vue`: 管理者ログイン/マスタデータ一覧
  - `client/src/pages/AdminCharacterEditPage.vue`: キャラクター追加/編集（画像アップロード含む）
  - `client/src/pages/AdminSkillEditPage.vue`: スキル追加/編集
  - `client/src/pages/AdminItemEditPage.vue`: アイテム追加/編集
  - `client/src/pages/AdminConditionEditPage.vue`: 状態異常追加/編集
  - `client/src/pages/AdminEnemyEditPage.vue`: 敵追加/編集（画像アップロード含む）
  - `client/src/services/apiClient.ts`: 管理者API呼び出しメソッド追加
- **初期データ投入**
  - `server/scripts/seed-master-data.js`: `master_data/*.json` からDBへ初期データ投入スクリプト

> ゴール: 管理者ページからマスタデータの追加・編集・削除ができ、画像もアップロードできる。ゲーム側はDBからマスタデータを取得して動作する。

---

## 13. 調整ポイント一覧（暫定値の差し替え箇所）
- キーボード操作のキー割当（MVP確定: 矢印キーで選択、Enterで決定）
- 行動順計算式（7.3.3）（MVP確定: `initiative = speed * level`）
- ダメージ/回復/防御の係数（7.3.4）
- 状態異常の効果量/適用順（7.3.5 / 8.5）
- 敵レベル式/敵AI/敵コスト/難易度曲線（7.4/7.5/8.6）
- 経験値/スキル育成曲線（7.6）

