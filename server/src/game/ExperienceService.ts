import { floorEnemyCost } from "./EnemyFactory";

export function calcExpReward(floor: number): number {
  return floorEnemyCost(floor) * 2;
}

