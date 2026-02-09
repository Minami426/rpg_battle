# 実行方法 (Setup and Run)

## ⚡ クイックスタート（初回セットアップ）

### 必要な環境
- **Node.js**: v18以上（`node --version` で確認）
- **npm**: v9以上（`npm --version` で確認）
- **MySQL または MariaDB**: v8.0以上（ローカルで起動していること）

### セットアップ手順（全OS共通）

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

## トラブルシューティング

### よくあるエラーと対処法

**エラー: `ECONNREFUSED` または `Can't connect to MySQL server`**
- MySQL/MariaDBが起動していない可能性があります
- 確認: `mysql -u root -p` で接続できるか確認
- 対処: MySQL/MariaDBを起動してください

**エラー: `Access denied for user 'root'@'localhost'`**
- DBパスワードが間違っている可能性があります
- 対処: `server/.env` の `DB_PASSWORD` を正しい値に設定

**エラー: `Unknown database 'rpg_battle'`**
- データベースが作成されていません
- 対処: DB作成手順を実行してください

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
