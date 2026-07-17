import { Config, Fighter, SweepResult } from './types';
import { runMonteCarlo } from './montecarlo';

export function sweep({
  base,
  opponent,
  config,
  stat,
  from,
  to,
  step,
  battlesPerPoint,
  seed,
}: {
  base: Fighter;
  opponent: Fighter;
  config: Config;
  stat: string;
  from: number;
  to: number;
  step: number;
  battlesPerPoint: number;
  seed: number;
}): SweepResult {
  // Validate stat exists in config
  const statExists = config.stats.some((s) => s.name === stat);
  if (!statExists) {
    throw new Error(`Stat "${stat}" is not defined in the configuration`);
  }

  // Validate from <= to
  if (from > to) {
    throw new Error(`Invalid range: "from" (${from}) must be less than or equal to "to" (${to})`);
  }

  // Validate step > 0
  if (step <= 0) {
    throw new Error(`Invalid step: "step" (${step}) must be greater than 0`);
  }

  const results: SweepResult = [];

  // Calculate number of points precisely to avoid floating-point iteration bugs
  const numPoints = Math.floor((to - from) / step) + 1;

  for (let i = 0; i < numPoints; i++) {
    const statValue = from + i * step;

    // Clone base fighter and override the target stat value
    const modifiedBase: Fighter = {
      ...base,
      stats: {
        ...base.stats,
        [stat]: statValue,
      },
    };

    // Run Monte-Carlo simulation with the modified fighter
    const mcResult = runMonteCarlo({
      a: modifiedBase,
      b: opponent,
      config,
      battles: battlesPerPoint,
      seed,
    });

    results.push({
      statValue,
      winRate: mcResult.winRateA,
      avgRounds: mcResult.avgRounds,
    });
  }

  return results;
}
