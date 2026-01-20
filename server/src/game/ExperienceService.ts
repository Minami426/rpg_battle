export function calcExpReward(params: { enemies: { level: number; baseExp?: number }[] }): number {
  const sum = params.enemies.reduce((total, e) => {
    const baseExp = typeof e.baseExp === "number" ? e.baseExp : 0;
    const level = Math.max(1, e.level || 1);
    const multiplier = 1 + (level - 1) * 0.2;
    return total + baseExp * multiplier;
  }, 0);
  return Math.floor(sum);
}

