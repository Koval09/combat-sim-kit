import { Config, Fighter, MonteCarloResult } from './types';
import { createRng } from './rng';
import { simulateBattle } from './battle';

export function runMonteCarlo({
  a,
  b,
  config,
  battles,
  seed,
  onProgress,
}: {
  a: Fighter;
  b: Fighter;
  config: Config;
  battles: number;
  seed: number;
  onProgress?: (completed: number, total: number) => void;
}): MonteCarloResult {
  if (battles <= 0) {
    throw new Error('Number of battles must be greater than 0');
  }

  let winsA = 0;
  let winsB = 0;
  let draws = 0;
  let timeouts = 0;
  let totalRounds = 0;
  let totalDamage = 0;

  const roundsList: number[] = [];
  const roundsHistogram: Record<number, number> = {};

  const masterRng = createRng(seed);

  for (let i = 0; i < battles; i++) {
    // Generate sub-seed for this battle derived deterministically from the master seed
    const subSeed = Math.floor(masterRng.random() * 2147483648);
    const battleRng = createRng(subSeed);

    const result = simulateBattle({ a, b, config, rng: battleRng });

    // Update winner statistics
    if (result.winner === 'a') {
      winsA++;
    } else if (result.winner === 'b') {
      winsB++;
    } else {
      draws++;
    }

    if (result.winReason === 'timeout') {
      timeouts++;
    }

    // Log rounds count
    roundsList.push(result.rounds);
    totalRounds += result.rounds;
    roundsHistogram[result.rounds] = (roundsHistogram[result.rounds] || 0) + 1;

    // Accumulate total damage dealt in the battle
    for (const event of result.log) {
      totalDamage += event.damage;
    }

    // Progress callback (ensuring at least 500 battles gap between calls, but always run on final step)
    const completed = i + 1;
    if (completed === battles) {
      onProgress?.(completed, battles);
    } else if (completed % 500 === 0) {
      onProgress?.(completed, battles);
    }
  }

  // Aggregate rates
  const winRateA = winsA / battles;
  const winRateB = winsB / battles;
  const drawRate = draws / battles;
  const timeoutRate = timeouts / battles;
  const avgRounds = totalRounds / battles;

  // Calculate median rounds
  roundsList.sort((x, y) => x - y);
  let medianRounds = 0;
  const N = roundsList.length;
  if (N % 2 === 1) {
    medianRounds = roundsList[Math.floor(N / 2)];
  } else {
    medianRounds = (roundsList[N / 2 - 1] + roundsList[N / 2]) / 2;
  }

  // Calculate average damage per round
  const avgDamagePerRound = totalRounds > 0 ? totalDamage / totalRounds : 0;

  return {
    battles,
    winRateA,
    winRateB,
    drawRate,
    timeoutRate,
    avgRounds,
    medianRounds,
    roundsHistogram,
    avgDamagePerRound,
  };
}
