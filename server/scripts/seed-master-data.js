/**
 * マスタデータをDBに初期投入するスクリプト
 * Usage: node scripts/seed-master-data.js
 * 
 * 環境変数:
 *   DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME
 */

const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function main() {
  const {
    DB_HOST = '127.0.0.1',
    DB_PORT = '3306',
    DB_USER = 'root',
    DB_PASSWORD = 'takayuki128080',
    DB_NAME = 'rpg_battle',
  } = process.env;

  console.log('[seed] Connecting to database...');
  const pool = mysql.createPool({
    host: DB_HOST,
    port: Number(DB_PORT),
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
    connectionLimit: 5,
  });

  try {
    const masterDir = path.resolve(__dirname, '..', '..', 'master_data');

    // Characters
    console.log('[seed] Seeding master_characters...');
    const characters = JSON.parse(fs.readFileSync(path.join(masterDir, 'characters.json'), 'utf-8'));
    for (const c of characters.data) {
      await pool.execute(
        `INSERT INTO master_characters 
         (id, name, description, image_path, base_stats_json, growth_per_level_json, initial_skill_ids_json, learnable_skill_ids_json, skill_learn_levels_json, tags_json)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
         name = VALUES(name),
         description = VALUES(description),
         image_path = VALUES(image_path),
         base_stats_json = VALUES(base_stats_json),
         growth_per_level_json = VALUES(growth_per_level_json),
         initial_skill_ids_json = VALUES(initial_skill_ids_json),
         learnable_skill_ids_json = VALUES(learnable_skill_ids_json),
         skill_learn_levels_json = VALUES(skill_learn_levels_json),
         tags_json = VALUES(tags_json)`,
        [
          c.id,
          c.name,
          c.description || null,
          c.imageKey ? `/uploads/characters/${c.imageKey}.png` : '',
          JSON.stringify(c.baseStats),
          JSON.stringify(c.growthPerLevel),
          JSON.stringify(c.initialSkillIds),
          JSON.stringify(c.learnableSkillIds),
          JSON.stringify(c.skillLearnLevels || {}),
          JSON.stringify(c.tags || []),
        ]
      );
    }
    console.log(`[seed] Inserted ${characters.data.length} characters`);

    // Skills
    console.log('[seed] Seeding master_skills...');
    const skills = JSON.parse(fs.readFileSync(path.join(masterDir, 'skills.json'), 'utf-8'));
    for (const s of skills.data) {
      await pool.execute(
        `INSERT INTO master_skills 
         (id, name, description, skill_type, target_type, \`range\`, power, power_type, element, scaling, crit_rate, crit_mag, cost, cost_type, accuracy, conditions_json, unlock_level, prerequisite_ids_json, is_passive)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
         name = VALUES(name),
         description = VALUES(description),
         skill_type = VALUES(skill_type),
         target_type = VALUES(target_type),
         \`range\` = VALUES(\`range\`),
         power = VALUES(power),
         power_type = VALUES(power_type),
         element = VALUES(element),
         scaling = VALUES(scaling),
         crit_rate = VALUES(crit_rate),
         crit_mag = VALUES(crit_mag),
         cost = VALUES(cost),
         cost_type = VALUES(cost_type),
         accuracy = VALUES(accuracy),
         conditions_json = VALUES(conditions_json),
         unlock_level = VALUES(unlock_level),
         prerequisite_ids_json = VALUES(prerequisite_ids_json),
         is_passive = VALUES(is_passive)`,
        [
          s.id,
          s.name,
          s.description || null,
          s.skillType,
          s.targetType,
          s.range,
          s.power,
          s.powerType,
          s.element || null,
          s.scaling || 'atk',
          s.critRate || 0,
          s.critMag || 1.5,
          s.cost,
          s.costType,
          s.accuracy || 1.0,
          JSON.stringify(s.conditions || []),
          s.unlockLevel || 1,
          JSON.stringify(s.prerequisiteIds || []),
          s.isPassive || false,
        ]
      );
    }
    console.log(`[seed] Inserted ${skills.data.length} skills`);

    // Items
    console.log('[seed] Seeding master_items...');
    const items = JSON.parse(fs.readFileSync(path.join(masterDir, 'items.json'), 'utf-8'));
    for (const i of items.data) {
      await pool.execute(
        `INSERT INTO master_items 
         (id, name, description, type, target, battle_usable, max_stack, effect_json)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
         name = VALUES(name),
         description = VALUES(description),
         type = VALUES(type),
         target = VALUES(target),
         battle_usable = VALUES(battle_usable),
         max_stack = VALUES(max_stack),
         effect_json = VALUES(effect_json)`,
        [
          i.id,
          i.name,
          i.description || null,
          i.type,
          i.target,
          i.battleUsable !== false,
          i.maxStack || 99,
          JSON.stringify(i.effect),
        ]
      );
    }
    console.log(`[seed] Inserted ${items.data.length} items`);

    // Conditions
    console.log('[seed] Seeding master_conditions...');
    const conditions = JSON.parse(fs.readFileSync(path.join(masterDir, 'conditions.json'), 'utf-8'));
    for (const c of conditions.data) {
      await pool.execute(
        `INSERT INTO master_conditions 
         (id, name, condition_type, stat, value, value_type, duration)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
         name = VALUES(name),
         condition_type = VALUES(condition_type),
         stat = VALUES(stat),
         value = VALUES(value),
         value_type = VALUES(value_type),
         duration = VALUES(duration)`,
        [
          c.id,
          c.name,
          c.conditionType,
          c.stat,
          c.value,
          c.valueType,
          c.duration,
        ]
      );
    }
    console.log(`[seed] Inserted ${conditions.data.length} conditions`);

    // Enemies
    console.log('[seed] Seeding master_enemies...');
    const enemies = JSON.parse(fs.readFileSync(path.join(masterDir, 'enemies.json'), 'utf-8'));
    for (const e of enemies.data) {
      await pool.execute(
        `INSERT INTO master_enemies 
         (id, name, image_path, base_cost, base_exp, appear_min_floor, appear_max_floor, is_boss, base_stats_json, growth_per_level_json, skill_ids_json, ai_profile_json)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
         name = VALUES(name),
         image_path = VALUES(image_path),
         base_cost = VALUES(base_cost),
         base_exp = VALUES(base_exp),
         appear_min_floor = VALUES(appear_min_floor),
         appear_max_floor = VALUES(appear_max_floor),
         is_boss = VALUES(is_boss),
         base_stats_json = VALUES(base_stats_json),
         growth_per_level_json = VALUES(growth_per_level_json),
         skill_ids_json = VALUES(skill_ids_json),
         ai_profile_json = VALUES(ai_profile_json)`,
        [
          e.id,
          e.name,
          e.imageKey ? `/uploads/enemies/${e.imageKey}.png` : '',
          e.baseCost,
          e.baseExp || 0,
          e.appearMinFloor || 1,
          e.appearMaxFloor || null,
          e.isBoss || false,
          JSON.stringify(e.baseStats),
          JSON.stringify(e.growthPerLevel),
          JSON.stringify(e.skillIds),
          JSON.stringify(e.aiProfile || { type: 'default' }),
        ]
      );
    }
    console.log(`[seed] Inserted ${enemies.data.length} enemies`);

    // Create default admin user (admin/admin)
    console.log('[seed] Creating default admin user...');
    await pool.execute(
      `INSERT INTO admin_users (username, password) VALUES (?, ?)
       ON DUPLICATE KEY UPDATE username = username`,
      ['admin', 'admin']
    );
    console.log('[seed] Default admin user created (username: admin, password: admin)');

    console.log('[seed] Done!');
  } catch (err) {
    console.error('[seed] Error:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();

