# RPG Battle クラス図

このドキュメントは、rpg_battleプロジェクトのクラス構造と関係性を示すクラス図です。

## クラス図（Mermaid形式）

```mermaid
classDiagram
    %% Repository クラス群
    class UserRepository {
        -Pool pool
        +createUser(username, password) Promise~number~
        +findByUsername(username) Promise~UserRow~
        +findById(id) Promise~UserRow~
    }
    
    class UserStateRepository {
        -Pool pool
        +getState(userId) Promise~UserStateRow~
        +upsertState(userId, currentFloor, stateJson) Promise~void~
    }
    
    class RunRepository {
        -Pool pool
        +insertRun(params) Promise~number~
        +listRunsByUser(userId) Promise~RunRow[]~
        +listRanking() Promise~...~
    }
    
    class AdminUserRepository {
        -Pool db
        +findByUsername(username) Promise~AdminUser~
        +findById(id) Promise~AdminUser~
        +create(username, password) Promise~number~
        +updatePassword(id, password) Promise~void~
        +delete(id) Promise~void~
    }
    
    class MasterCharacterRepository {
        -Pool db
        +findAll() Promise~MasterCharacter[]~
        +findById(id) Promise~MasterCharacter~
        +create(data: Omit~MasterCharacter, "imagePath"~ & { imagePath?: string }) Promise~void~
        +update(id, data: Partial~Omit~MasterCharacter, "id"~~) Promise~void~
        +delete(id) Promise~void~
    }
    
    class MasterSkillRepository {
        -Pool db
        +findAll() Promise~MasterSkill[]~
        +findById(id) Promise~MasterSkill~
        +create(data: MasterSkill) Promise~void~
        +update(id, data: Partial~Omit~MasterSkill, "id"~~) Promise~void~
        +delete(id) Promise~void~
    }
    
    class MasterItemRepository {
        -Pool db
        +findAll() Promise~MasterItem[]~
        +findById(id) Promise~MasterItem~
        +create(data: MasterItem) Promise~void~
        +update(id, data: Partial~Omit~MasterItem, "id"~~) Promise~void~
        +delete(id) Promise~void~
    }
    
    class MasterConditionRepository {
        -Pool db
        +findAll() Promise~MasterCondition[]~
        +findById(id) Promise~MasterCondition~
        +create(data: MasterCondition) Promise~void~
        +update(id, data: Partial~Omit~MasterCondition, "id"~~) Promise~void~
        +delete(id) Promise~void~
    }
    
    class MasterEnemyRepository {
        -Pool db
        +findAll() Promise~MasterEnemy[]~
        +findById(id) Promise~MasterEnemy~
        +create(data: Omit~MasterEnemy, "imagePath"~ & { imagePath?: string }) Promise~void~
        +update(id, data: Partial~Omit~MasterEnemy, "id"~~) Promise~void~
        +delete(id) Promise~void~
    }
    
    %% Service / Cache クラス
    class MasterDataCache {
        -MasterDataCacheData data
        -MasterCharacterRepository characterRepo
        -MasterSkillRepository skillRepo
        -MasterItemRepository itemRepo
        -MasterConditionRepository conditionRepo
        -MasterEnemyRepository enemyRepo
        -Pool db
        +load() Promise~void~
        +reload() Promise~void~
        +getData() MasterDataCacheData
        +getDataAsLegacyFormat() object
        +getCharacterRepo() MasterCharacterRepository
        +getSkillRepo() MasterSkillRepository
        +getItemRepo() MasterItemRepository
        +getConditionRepo() MasterConditionRepository
        +getEnemyRepo() MasterEnemyRepository
    }
    
    class BattleService {
        -BattleMemoryStore store
        -Masters masters
        +startBattle(params) BattleState
        +act(params) object
        -buildParty(partyIds, state) Combatant[]
    }
    
    class BattleMemoryStore {
        -Map~string, BattleState~ store
        +create(state) void
        +get(battleId) BattleState
        +update(state) void
        +delete(battleId) void
    }
    
    %% API コントローラー（関数ベースモジュール）
    class AuthController <<module>> {
        {static} +register(req, res) void
        {static} +login(req, res) void
        {static} +logout(req, res) void
    }
    
    class AdminAuthController <<module>> {
        {static} +login(req, res) void
        {static} +logout(req, res) void
    }
    
    class AdminMasterController <<module>> {
        {static} +list(req, res) void
        {static} +get(req, res) void
        {static} +create(req, res) void
        {static} +update(req, res) void
        {static} +delete(req, res) void
        {static} +uploadImage(req, res) void
    }
    
    class StateController <<module>> {
        {static} +get(req, res) void
        {static} +put(req, res) void
        {static} +reset(req, res) void
    }
    
    class BattleController <<module>> {
        {static} +start(req, res) void
        {static} +act(req, res) void
    }
    
    class FlowController <<module>> {
        {static} +nextFloor(req, res) void
        {static} +quit(req, res) void
    }
    
    class RunController <<module>> {
        {static} +create(req, res) void
        {static} +list(req, res) void
        {static} +detail(req, res) void
    }
    
    class RankingController <<module>> {
        {static} +list(req, res) void
    }
    
    %% ゲームロジック（関数ベースモジュール）
    class DamageCalculator <<module>> {
        {static} +calcAttackDamage(attacker, defender) number
        {static} +calcSkillDamage(attacker, defender, skill) number
        {static} +calcHealing(attacker, power) number
    }
    
    class ConditionSystem <<module>> {
        {static} +startOfTurn(combatant, log) object
        {static} +endOfTurn(combatant) void
    }
    
    class EnemyFactory <<module>> {
        {static} +generateEnemies(floor, masters) Combatant[]
        {static} +floorEnemyCost(floor) number
    }
    
    class EnemyAI <<module>> {
        {static} +enemyTurn(state) void
    }
    
    class ExperienceService <<module>> {
        {static} +calcExpReward(params) number
    }
    
    class PlayerStats <<module>> {
        {static} +scalePlayerStats(base, growth, level) Stats
        {static} +getEffectiveStats(combatant) Stats
    }
    
    class Actions <<module>> {
        {static} +resolveAction(state, actor, payload, targetIds, masters) void
    }
    
    class TurnManager <<module>> {
        {static} +buildTurnOrder(combatants) number[]
    }
    
    %% マスタデータ管理（関数ベースモジュール）
    class MasterDataLoader <<module>> {
        {static} +loadMastersFromJson(baseDir) Masters
        {static} +loadMastersFromCache() Masters
        {static} +loadMasters(baseDir) Masters
    }
    
    class MasterValidator <<module>> {
        {static} +validateMasters(masters) void
    }
    
    %% ミドルウェア（関数ベースモジュール）
    class AuthGuard <<module>> {
        {static} +authGuard(req, res, next) void
        {static} +adminAuthGuard(req, res, next) void
    }
    
    %% ユーティリティ（関数ベースモジュール）
    class StateHelpers <<module>> {
        {static} +getOrCreateUserState(pool, userId, masters) Promise
        {static} +applyBattleDeltaToStateObject(params) void
        {static} +allocateExpToStateObject(params) void
        {static} +learnSkillsForCharacter(characterId, level, state, masters) void
    }
    
    class InitialState <<module>> {
        {static} +createInitialState(masters) object
    }
    
    %% クライアント側（関数ベースモジュール）
    class ApiClient <<module>> {
        {static} +register(username, password) Promise
        {static} +login(username, password) Promise
        {static} +logout() Promise
        {static} +getState() Promise
        {static} +saveState(currentFloor, state) Promise
        {static} +resetState() Promise
        {static} +startBattle(payload) Promise
        {static} +actBattle(payload) Promise
        {static} +getBattle(battleId) Promise
        {static} +saveRun(run) Promise
        {static} +listRuns() Promise
        {static} +ranking() Promise
        {static} +flowQuit(run, state) Promise
        {static} +flowGameOver(run) Promise
        {static} +applyBattleDelta(payload) Promise
        {static} +applyItem(payload) Promise
        {static} +allocateExp(payload) Promise
        {static} +adminLogin(username, password) Promise
        {static} +adminLogout() Promise
        {static} +adminGetCharacters() Promise
        {static} +adminCreateCharacter(data) Promise
        {static} +adminUpdateCharacter(id, data) Promise
        {static} +adminDeleteCharacter(id) Promise
        {static} +adminUploadCharacterImage(id, file) Promise
        {static} +adminGetSkills() Promise
        {static} +adminCreateSkill(data) Promise
        {static} +adminUpdateSkill(id, data) Promise
        {static} +adminDeleteSkill(id) Promise
        {static} +adminGetItems() Promise
        {static} +adminCreateItem(data) Promise
        {static} +adminUpdateItem(id, data) Promise
        {static} +adminDeleteItem(id) Promise
        {static} +adminGetConditions() Promise
        {static} +adminCreateCondition(data) Promise
        {static} +adminUpdateCondition(id, data) Promise
        {static} +adminDeleteCondition(id) Promise
        {static} +adminGetEnemies() Promise
        {static} +adminCreateEnemy(data) Promise
        {static} +adminUpdateEnemy(id, data) Promise
        {static} +adminDeleteEnemy(id) Promise
        {static} +adminUploadEnemyImage(id, file) Promise
    }
    
    class AppState <<module>> {
        {static} +user object
        {static} +state UserState
        {static} +battle object
        {static} +maxDamageCurrentRun number
        {static} +systemLog string[]
    }
    
    class SystemLog <<module>> {
        {static} +pushSystemLog(message) void
        {static} +clearSystemLog() void
    }
    
    %% 外部型（mysql2ライブラリ）
    class Pool <<external>> {
        <<mysql2/promise>>
        +execute(sql, params) Promise
        +query(sql, params) Promise
    }
    
    %% 依存関係
    UserRepository ..> Pool : uses
    UserStateRepository ..> Pool : uses
    RunRepository ..> Pool : uses
    AdminUserRepository ..> Pool : uses
    MasterCharacterRepository ..> Pool : uses
    MasterSkillRepository ..> Pool : uses
    MasterItemRepository ..> Pool : uses
    MasterConditionRepository ..> Pool : uses
    MasterEnemyRepository ..> Pool : uses
    
    MasterDataCache *-- MasterCharacterRepository : contains
    MasterDataCache *-- MasterSkillRepository : contains
    MasterDataCache *-- MasterItemRepository : contains
    MasterDataCache *-- MasterConditionRepository : contains
    MasterDataCache *-- MasterEnemyRepository : contains
    MasterDataCache ..> Pool : uses
    
    BattleService --> BattleMemoryStore : uses
    BattleService ..> Masters : uses
    
    %% API コントローラーの依存関係
    AuthController ..> UserRepository : uses
    AuthController ..> UserStateRepository : uses
    AdminAuthController ..> AdminUserRepository : uses
    AdminMasterController ..> MasterDataCache : uses
    StateController ..> UserStateRepository : uses
    BattleController --> BattleService : uses
    BattleController --> BattleMemoryStore : uses
    FlowController ..> UserStateRepository : uses
    FlowController ..> RunRepository : uses
    RunController ..> RunRepository : uses
    RankingController ..> RunRepository : uses
    
    %% ゲームロジックの依存関係
    BattleService ..> DamageCalculator : uses
    BattleService ..> ConditionSystem : uses
    BattleService ..> EnemyFactory : uses
    BattleService ..> EnemyAI : uses
    BattleService ..> ExperienceService : uses
    BattleService ..> PlayerStats : uses
    BattleService ..> Actions : uses
    BattleService ..> TurnManager : uses
    EnemyAI ..> ConditionSystem : uses
    EnemyAI ..> Actions : uses
    Actions ..> DamageCalculator : uses
    Actions ..> PlayerStats : uses
    EnemyFactory ..> PlayerStats : uses
    
    %% マスタデータ管理の依存関係
    MasterDataCache ..> MasterDataLoader : uses
    MasterDataLoader ..> MasterValidator : uses
    MasterDataLoader ..> MasterDataCache : uses
    
    %% ミドルウェアの依存関係
    AuthController ..> AuthGuard : uses
    AdminAuthController ..> AuthGuard : uses
    AdminMasterController ..> AuthGuard : uses
    StateController ..> AuthGuard : uses
    BattleController ..> AuthGuard : uses
    FlowController ..> AuthGuard : uses
    RunController ..> AuthGuard : uses
    
    %% ユーティリティの依存関係
    StateController ..> StateHelpers : uses
    StateController ..> InitialState : uses
    BattleController ..> StateHelpers : uses
    FlowController ..> StateHelpers : uses
    StateHelpers ..> InitialState : uses
    StateHelpers ..> PlayerStats : uses
    InitialState ..> PlayerStats : uses
    
    %% クライアント側の依存関係
    ApiClient ..> AuthController : HTTP
    ApiClient ..> StateController : HTTP
    ApiClient ..> BattleController : HTTP
    ApiClient ..> FlowController : HTTP
    ApiClient ..> RunController : HTTP
    ApiClient ..> RankingController : HTTP
    ApiClient ..> AdminAuthController : HTTP
    ApiClient ..> AdminMasterController : HTTP
    AppState ..> ApiClient : uses
    SystemLog ..> AppState : uses
```

## クラス分類

### 1. Repository クラス群（データアクセス層）

すべてのRepositoryクラスは `Pool` (MySQL接続プール) に依存し、データベースへのCRUD操作を提供します。

- **UserRepository**: ユーザー情報の管理
- **UserStateRepository**: ユーザーのゲーム状態の管理
- **RunRepository**: 戦績データの管理
- **AdminUserRepository**: 管理者ユーザーの管理
- **MasterCharacterRepository**: キャラクターマスタデータの管理
- **MasterSkillRepository**: スキルマスタデータの管理
- **MasterItemRepository**: アイテムマスタデータの管理
- **MasterConditionRepository**: 状態異常マスタデータの管理
- **MasterEnemyRepository**: 敵マスタデータの管理

### 2. Service / Cache クラス（ビジネスロジック層）

- **MasterDataCache**: 
  - マスタデータをメモリにキャッシュ
  - 複数のMaster*Repositoryを集約
  - シングルトンパターンで実装

- **BattleService**: 
  - 戦闘システムのメインロジック
  - BattleMemoryStoreを使用して戦闘状態を管理
  - Masters（マスタデータ）を参照

- **BattleMemoryStore**: 
  - 戦闘状態をメモリ上で管理（Map構造）
  - バトルIDをキーとして戦闘状態を保存

### 3. API コントローラー（関数ベースモジュール）

Express Routerを使用した関数ベースのAPIエンドポイント実装。各モジュールは`<<module>>`ステレオタイプで表現。

- **AuthController**: ユーザー認証（登録、ログイン、ログアウト）
- **AdminAuthController**: 管理者認証（ログイン、ログアウト）
- **AdminMasterController**: 管理者用マスタデータCRUD操作
- **StateController**: ユーザー状態の取得・更新・リセット
- **BattleController**: 戦闘開始・行動処理
- **FlowController**: ゲームフロー制御（次の階層、終了）
- **RunController**: 戦績データの作成・取得
- **RankingController**: ランキング取得

### 4. ゲームロジック（関数ベースモジュール）

戦闘システムの各種計算・処理ロジック。各モジュールは`<<module>>`ステレオタイプで表現。

- **DamageCalculator**: ダメージ計算（通常攻撃、スキル、回復）
- **ConditionSystem**: 状態異常処理（ターン開始・終了時の効果適用）
- **EnemyFactory**: 敵生成（フロアに応じた敵の生成とレベル計算）
- **EnemyAI**: 敵の行動決定
- **ExperienceService**: 経験値計算
- **PlayerStats**: キャラクターステータス計算（レベルスケーリング、バフ/デバフ適用）
- **Actions**: 行動解決（攻撃、スキル、アイテム使用の処理）
- **TurnManager**: ターン順序決定（速度とレベルに基づく）

### 5. マスタデータ管理（関数ベースモジュール）

マスタデータの読み込みとバリデーション。各モジュールは`<<module>>`ステレオタイプで表現。

- **MasterDataLoader**: 
  - マスタデータの読み込み（JSONファイルまたはDBキャッシュから）
  - DB読み込み失敗時のJSONフォールバック処理
  - `MasterDataCache`と連携

- **MasterValidator**: 
  - マスタデータの整合性チェック
  - 参照整合性の検証（スキルID、条件IDなど）

### 6. ミドルウェア（関数ベースモジュール）

Expressミドルウェアとして実装された認証ガード。各モジュールは`<<module>>`ステレオタイプで表現。

- **AuthGuard**: 
  - `authGuard`: 一般ユーザー認証（セッションの`userId`をチェック）
  - `adminAuthGuard`: 管理者認証（セッションの`adminUserId`をチェック）

### 7. ユーティリティ（関数ベースモジュール）

状態管理や初期化のヘルパー関数。各モジュールは`<<module>>`ステレオタイプで表現。

- **StateHelpers**: 
  - `getOrCreateUserState`: ユーザー状態の取得または作成
  - `applyBattleDeltaToStateObject`: 戦闘結果を状態に適用
  - `allocateExpToStateObject`: 経験値の割り振り処理
  - `learnSkillsForCharacter`: キャラクターのスキル習得処理

- **InitialState**: 
  - `createInitialState`: 初期ゲーム状態の作成

### 8. クライアント側（関数ベースモジュール）

Vue.js 3 Composition APIを使用したクライアント側の実装。各モジュールは`<<module>>`ステレオタイプで表現。

- **ApiClient**: 
  - サーバーAPIへのHTTPリクエストを抽象化
  - 認証、状態管理、戦闘、ランキング、管理者APIを提供
  - `fetch` APIを使用したHTTP通信
  - Cookieベースのセッション管理

- **AppState**: 
  - アプリケーション全体の状態をリアクティブに管理
  - Vue 3の`reactive`を使用したリアクティブオブジェクト
  - ユーザー情報、ゲーム状態、戦闘状態、システムログを管理

- **SystemLog**: 
  - システムログの追加・削除
  - 最大15件まで保持
  - `appState.systemLog`を操作する関数

## 設計パターン

1. **Repository パターン**: データアクセス層を抽象化
2. **Singleton パターン**: MasterDataCacheはグローバルインスタンスとして管理
3. **Dependency Injection**: コンストラクタで依存関係を注入

## 主要な型定義

### 外部ライブラリの型
- **Pool** (`mysql2/promise`): MySQL2の接続プールクラス
  - データベース接続を管理し、複数のクエリを効率的に処理
  - `createPool()`で作成され、各Repositoryクラスのコンストラクタで注入される
  - プロジェクト内で定義されたクラスではなく、外部ライブラリの型

### プロジェクト内の型
- **Masters**: マスタデータの集合体（characters, skills, items, conditions, enemies）
- **BattleState**: 戦闘状態を表す型
- **Combatant**: 戦闘参加者（キャラクター/敵）を表す型

## クラス一覧（網羅性確認）

### クラス（`export class` または `class` キーワードで定義）

プロジェクト内のすべてのクラスを確認した結果、以下の12個のクラスが存在します：

#### Repository クラス群（9クラス）
1. ✅ UserRepository
2. ✅ UserStateRepository
3. ✅ RunRepository
4. ✅ AdminUserRepository
5. ✅ MasterCharacterRepository
6. ✅ MasterSkillRepository
7. ✅ MasterItemRepository
8. ✅ MasterConditionRepository
9. ✅ MasterEnemyRepository

#### Service / Cache クラス（3クラス）
10. ✅ MasterDataCache
11. ✅ BattleService
12. ✅ BattleMemoryStore

**結論**: すべてのクラスがクラス図に含まれています。

### 関数ベースモジュール（`<<module>>` として表現）

関数として実装されているが、クラス図ではモジュールとして表現しているもの：

#### API コントローラー（8モジュール）
1. ✅ AuthController
2. ✅ AdminAuthController
3. ✅ AdminMasterController
4. ✅ StateController
5. ✅ BattleController
6. ✅ FlowController
7. ✅ RunController
8. ✅ RankingController

#### ゲームロジック（8モジュール）
9. ✅ DamageCalculator
10. ✅ ConditionSystem
11. ✅ EnemyFactory
12. ✅ EnemyAI
13. ✅ ExperienceService
14. ✅ PlayerStats
15. ✅ Actions
16. ✅ TurnManager

#### マスタデータ管理（2モジュール）
17. ✅ MasterDataLoader
18. ✅ MasterValidator

#### ミドルウェア（1モジュール）
19. ✅ AuthGuard

#### ユーティリティ（2モジュール）
20. ✅ StateHelpers
21. ✅ InitialState

#### クライアント側（3モジュール）
22. ✅ ApiClient
23. ✅ AppState
24. ✅ SystemLog

**結論**: すべての主要な関数ベースモジュールがクラス図に含まれています。

## 注意事項

- **関数ベースモジュールの表現**: APIコントローラー、ゲームロジック、マスタデータ管理、ミドルウェア、ユーティリティ、クライアント側のモジュールは、実際にはクラスではなく関数として実装されていますが、クラス図では`<<module>>`ステレオタイプを使用してモジュールとして表現しています。主要な関数は静的メソッド（`{static}`）として記載しています。
- **クライアント側のコンポーネント**: Vue.jsのページコンポーネント（`pages/*.vue`）は、このクラス図の対象外です。主にUI表示とユーザーインタラクション処理のため、クラス図には含めていません。
- **Vue Router**: ルーティング設定（`router/index.ts`）は、フレームワークの設定ファイルのため、クラス図には含めていません。
- **シングルトン関数**: `MasterDataCache`にはシングルトン関数（`initMasterDataCache`, `getMasterDataCache`）がありますが、これらはクラス図には含めていません。
- **クライアント-サーバー間の通信**: `ApiClient`からサーバー側のAPIコントローラーへの依存関係は、HTTP通信によるもので、直接的な関数呼び出しではありません。
- **Express Router**: `api/router.ts`は、ルーティングの集約のみを行うため、クラス図には含めていません。

