import { Masters } from "../types";
import { scalePlayerStats } from "../game/playerStats";

export function createInitialState(masters?: Masters) {
  const characters: Record<string, any> = {};
  const skills: Record<string, any> = {};

  if (masters) {
    const learnedSkills = new Set<string>();
    for (const c of masters.characters.data as any[]) {
      const stats = scalePlayerStats(c.baseStats, c.growthPerLevel, 1);
      const initialSkillIds = Array.isArray(c.initialSkillIds) ? c.initialSkillIds : [];
      initialSkillIds.forEach((sid: string) => learnedSkills.add(sid));
      characters[c.id] = { level: 1, exp: 0, hp: stats.maxHp, mp: stats.maxMp, skillIds: initialSkillIds };
    }
    for (const sid of learnedSkills) {
      skills[sid] = { level: 1, exp: 0 };
    }
  }

  return {
    schemaVersion: 1,
    currentFloor: 1,
    resume: { screen: "start" },
    currentRunMaxDamage: 0,
    expStock: 0,
    party: [],
    characters,
    skills,
    items: {
      potion: 3,
      ether: 1,
    },
  };
}

