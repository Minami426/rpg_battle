import { Masters } from "../types";
import { scalePlayerStats } from "../game/playerStats";

export function createInitialState(masters?: Masters) {
  const characters: Record<string, any> = {};
  const skills: Record<string, any> = {};

  if (masters) {
    for (const c of masters.characters.data as any[]) {
      const stats = scalePlayerStats(c.baseStats, c.growthPerLevel, 1);
      characters[c.id] = { level: 1, exp: 0, hp: stats.maxHp, mp: stats.maxMp };
    }
    for (const s of masters.skills.data as any[]) {
      skills[s.id] = { level: 1, exp: 0 };
    }
  }

  return {
    schemaVersion: 1,
    currentFloor: 1,
    resume: { screen: "start" },
    currentRunMaxDamage: 0,
    party: [],
    characters,
    skills,
    items: {
      potion: 3,
      ether: 1,
    },
  };
}

