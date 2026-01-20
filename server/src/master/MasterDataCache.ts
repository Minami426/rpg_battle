import { Pool } from "mysql2/promise";
import { MasterCharacterRepository, MasterCharacter } from "../db/MasterCharacterRepository";
import { MasterSkillRepository, MasterSkill } from "../db/MasterSkillRepository";
import { MasterItemRepository, MasterItem } from "../db/MasterItemRepository";
import { MasterConditionRepository, MasterCondition } from "../db/MasterConditionRepository";
import { MasterEnemyRepository, MasterEnemy } from "../db/MasterEnemyRepository";

export interface MasterDataCacheData {
  characters: MasterCharacter[];
  skills: MasterSkill[];
  items: MasterItem[];
  conditions: MasterCondition[];
  enemies: MasterEnemy[];
}

/**
 * DBからマスタデータを読み込み、メモリにキャッシュするクラス
 * サーバ起動時に初期化し、管理者がデータを更新したらreload()で再読み込み
 */
export class MasterDataCache {
  private data: MasterDataCacheData | null = null;
  private characterRepo: MasterCharacterRepository;
  private skillRepo: MasterSkillRepository;
  private itemRepo: MasterItemRepository;
  private conditionRepo: MasterConditionRepository;
  private enemyRepo: MasterEnemyRepository;

  constructor(private db: Pool) {
    this.characterRepo = new MasterCharacterRepository(db);
    this.skillRepo = new MasterSkillRepository(db);
    this.itemRepo = new MasterItemRepository(db);
    this.conditionRepo = new MasterConditionRepository(db);
    this.enemyRepo = new MasterEnemyRepository(db);
  }

  /**
   * DBからマスタデータを読み込んでキャッシュに保持
   */
  async load(): Promise<void> {
    console.log("[MasterDataCache] Loading master data from DB...");
    const [characters, skills, items, conditions, enemies] = await Promise.all([
      this.characterRepo.findAll(),
      this.skillRepo.findAll(),
      this.itemRepo.findAll(),
      this.conditionRepo.findAll(),
      this.enemyRepo.findAll(),
    ]);

    this.data = { characters, skills, items, conditions, enemies };
    console.log(
      `[MasterDataCache] Loaded: ${characters.length} characters, ${skills.length} skills, ${items.length} items, ${conditions.length} conditions, ${enemies.length} enemies`
    );
  }

  /**
   * キャッシュを再読み込み（管理者がマスタデータを更新した際に呼ぶ）
   */
  async reload(): Promise<void> {
    await this.load();
  }

  /**
   * キャッシュされたデータを取得
   */
  getData(): MasterDataCacheData {
    if (!this.data) {
      throw new Error("[MasterDataCache] Data not loaded. Call load() first.");
    }
    return this.data;
  }

  /**
   * 旧形式（MasterFile形式）に変換して返す（後方互換性のため）
   */
  getDataAsLegacyFormat(): {
    characters: { schemaVersion: number; data: any[] };
    skills: { schemaVersion: number; data: any[] };
    items: { schemaVersion: number; data: any[] };
    conditions: { schemaVersion: number; data: any[] };
    enemies: { schemaVersion: number; data: any[] };
  } {
    const d = this.getData();
    return {
      characters: {
        schemaVersion: 1,
        data: d.characters.map((c) => ({
          id: c.id,
          name: c.name,
          description: c.description,
          imageKey: c.imagePath ? c.imagePath.split("/").pop()?.replace(".png", "") : c.id,
          imagePath: c.imagePath,
          baseStats: c.baseStats,
          growthPerLevel: c.growthPerLevel,
          initialSkillIds: c.initialSkillIds,
          learnableSkillIds: c.learnableSkillIds,
          skillLearnLevels: c.skillLearnLevels,
          tags: c.tags,
        })),
      },
      skills: {
        schemaVersion: 1,
        data: d.skills.map((s) => ({
          id: s.id,
          name: s.name,
          description: s.description,
          skillType: s.skillType,
          targetType: s.targetType,
          range: s.range,
          power: s.power,
          powerType: s.powerType,
          element: s.element,
          scaling: s.scaling,
          critRate: s.critRate,
          critMag: s.critMag,
          cost: s.cost,
          costType: s.costType,
          accuracy: s.accuracy,
          conditions: s.conditions,
          unlockLevel: s.unlockLevel,
          prerequisiteIds: s.prerequisiteIds,
          isPassive: s.isPassive,
        })),
      },
      items: {
        schemaVersion: 1,
        data: d.items.map((i) => ({
          id: i.id,
          name: i.name,
          description: i.description,
          type: i.type,
          target: i.target,
          battleUsable: i.battleUsable,
          maxStack: i.maxStack,
          effect: i.effect,
        })),
      },
      conditions: {
        schemaVersion: 1,
        data: d.conditions.map((c) => ({
          id: c.id,
          name: c.name,
          conditionType: c.conditionType,
          stat: c.stat,
          value: c.value,
          valueType: c.valueType,
          duration: c.duration,
        })),
      },
      enemies: {
        schemaVersion: 1,
        data: d.enemies.map((e) => ({
          id: e.id,
          name: e.name,
          imageKey: e.imagePath ? e.imagePath.split("/").pop()?.replace(".png", "") : e.id,
          imagePath: e.imagePath,
          baseCost: e.baseCost,
          baseExp: e.baseExp,
          appearMinFloor: e.appearMinFloor,
          appearMaxFloor: e.appearMaxFloor,
          isBoss: e.isBoss,
          baseStats: e.baseStats,
          growthPerLevel: e.growthPerLevel,
          skillIds: e.skillIds,
          aiProfile: e.aiProfile,
        })),
      },
    };
  }

  // リポジトリへのアクセス（管理者API用）
  getCharacterRepo() {
    return this.characterRepo;
  }
  getSkillRepo() {
    return this.skillRepo;
  }
  getItemRepo() {
    return this.itemRepo;
  }
  getConditionRepo() {
    return this.conditionRepo;
  }
  getEnemyRepo() {
    return this.enemyRepo;
  }
}

// グローバルインスタンス（シングルトン）
let instance: MasterDataCache | null = null;

export function initMasterDataCache(db: Pool): MasterDataCache {
  instance = new MasterDataCache(db);
  return instance;
}

export function getMasterDataCache(): MasterDataCache {
  if (!instance) {
    throw new Error("[MasterDataCache] Not initialized. Call initMasterDataCache() first.");
  }
  return instance;
}

