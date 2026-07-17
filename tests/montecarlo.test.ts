import { expect, test, describe } from 'vitest';
import { loadConfig } from '../src/config';
import { runMonteCarlo } from '../src/montecarlo';

const configYaml = `
stats:
  - name: ATK
  - name: DEF
  - name: SPD
  - name: VIT
  - name: CRIT
derived:
  hp: "150 + VIT * 12"
  baseDamage: "ATK * (0.95 + rand() * 0.10)"
  dodgeChance: "max(0.05, min(0.45, 0.10 + (SPD_self - SPD_enemy) / 150))"
  critChance: "max(0.05, min(0.50, 0.05 + CRIT / 100))"
  critMultiplier: "1.5 + max(0, ATK / 1000)"
  absorbFlat: "DEF * 0.25"
  absorbPct: "DEF / (DEF + 300)"
combat:
  maxRounds: 50
  initiative: "SPD * (1.0 + rand() * 0.2)"
  damage: "(baseDamage * (isCrit ? critMultiplier : 1) - absorbFlat_enemy) * (1 - absorbPct_enemy)"
  minDamage: 1
  timeout:
    winner: "hpPercent"
    drawMarginPct: 3
`;

describe('Monte Carlo Simulation (runMonteCarlo)', () => {
  test('winRateA + winRateB + drawRate equals 1', () => {
    const config = loadConfig(configYaml);
    const a = { name: 'Cat', stats: { ATK: 35, DEF: 20, SPD: 100, VIT: 15, CRIT: 10 } };
    const b = { name: 'Dog', stats: { ATK: 30, DEF: 30, SPD: 90, VIT: 18, CRIT: 5 } };

    const result = runMonteCarlo({ a, b, config, battles: 100, seed: 123 });
    const sum = result.winRateA + result.winRateB + result.drawRate;
    expect(sum).toBeCloseTo(1, 8);
  });

  test('identical seeds yield byte-identical results', () => {
    const config = loadConfig(configYaml);
    const a = { name: 'Cat', stats: { ATK: 35, DEF: 20, SPD: 100, VIT: 15, CRIT: 10 } };
    const b = { name: 'Dog', stats: { ATK: 30, DEF: 30, SPD: 90, VIT: 18, CRIT: 5 } };

    const result1 = runMonteCarlo({ a, b, config, battles: 200, seed: 42 });
    const result2 = runMonteCarlo({ a, b, config, battles: 200, seed: 42 });

    expect(result1).toEqual(result2);
  });

  test('mirror match yields a winrate of ~0.5 (+/- 0.05 on 2000 battles)', () => {
    const config = loadConfig(configYaml);
    const a = { name: 'Gladiator A', stats: { ATK: 40, DEF: 20, SPD: 100, VIT: 20, CRIT: 10 } };
    const b = { name: 'Gladiator B', stats: { ATK: 40, DEF: 20, SPD: 100, VIT: 20, CRIT: 10 } }; // identical stats

    const result = runMonteCarlo({ a, b, config, battles: 2000, seed: 777 });

    // Since they are identical, expect winRateA to be close to 0.5
    // Win rate B should also be close to 0.5 (depending on draws, but here draws are unlikely given high ATK/DEF ratio)
    expect(result.winRateA).toBeGreaterThanOrEqual(0.45);
    expect(result.winRateA).toBeLessThanOrEqual(0.55);
  });

  test('histogram values sum up to total battles', () => {
    const config = loadConfig(configYaml);
    const a = { name: 'Cat', stats: { ATK: 35, DEF: 20, SPD: 100, VIT: 15, CRIT: 10 } };
    const b = { name: 'Dog', stats: { ATK: 30, DEF: 30, SPD: 90, VIT: 18, CRIT: 5 } };

    const result = runMonteCarlo({ a, b, config, battles: 150, seed: 99 });
    const histSum = Object.values(result.roundsHistogram).reduce((sum, val) => sum + val, 0);

    expect(histSum).toBe(150);
    expect(result.battles).toBe(150);
  });

  test('onProgress is throttled to at least 500 battles spacing', () => {
    const config = loadConfig(configYaml);
    const a = { name: 'Cat', stats: { ATK: 35, DEF: 20, SPD: 100, VIT: 15, CRIT: 10 } };
    const b = { name: 'Dog', stats: { ATK: 30, DEF: 30, SPD: 90, VIT: 18, CRIT: 5 } };

    const calls: { completed: number; total: number }[] = [];
    const onProgress = (completed: number, total: number) => {
      calls.push({ completed, total });
    };

    // Run 1200 battles
    // Expected calls at: 500, 1000, 1200 (final progress call is guaranteed)
    runMonteCarlo({ a, b, config, battles: 1200, seed: 1, onProgress });

    expect(calls).toEqual([
      { completed: 500, total: 1200 },
      { completed: 1000, total: 1200 },
      { completed: 1200, total: 1200 },
    ]);
  });
});
