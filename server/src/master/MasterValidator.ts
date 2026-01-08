import { Masters } from "../types";

export function validateMasters(masters: Masters) {
  const skillIds = new Set(masters.skills.data.map((s: any) => s.id));
  const itemIds = new Set(masters.items.data.map((i: any) => i.id));
  const condIds = new Set(masters.conditions.data.map((c: any) => c.id));
  const enemyIds = new Set(masters.enemies.data.map((e: any) => e.id));
  const charIds = new Set(masters.characters.data.map((c: any) => c.id));

  // characters skills
  for (const c of masters.characters.data) {
    for (const sid of c.initialSkillIds ?? []) {
      if (!skillIds.has(sid)) throw new Error(`[master] character ${c.id} initialSkillIds missing skill ${sid}`);
    }
    for (const sid of c.learnableSkillIds ?? []) {
      if (!skillIds.has(sid)) throw new Error(`[master] character ${c.id} learnableSkillIds missing skill ${sid}`);
    }
  }

  // skills conditions
  for (const s of masters.skills.data) {
    for (const cond of s.conditions ?? []) {
      if (!condIds.has(cond.conditionId)) throw new Error(`[master] skill ${s.id} references missing condition ${cond.conditionId}`);
    }
  }

  // enemies skills
  for (const e of masters.enemies.data) {
    for (const sid of e.skillIds ?? []) {
      if (!skillIds.has(sid)) throw new Error(`[master] enemy ${e.id} skillIds missing skill ${sid}`);
    }
  }

  // no-op checks for items/ids existence
  if (skillIds.size === 0) console.warn("[master] skills is empty");
  if (itemIds.size === 0) console.warn("[master] items is empty");
  if (condIds.size === 0) console.warn("[master] conditions is empty");
  if (enemyIds.size === 0) console.warn("[master] enemies is empty");
  if (charIds.size === 0) console.warn("[master] characters is empty");
}

