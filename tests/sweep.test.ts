import { expect, test, describe } from 'vitest';
import { loadConfig } from '../src/config';
import { sweep } from '../src/sweep';

const configYaml = `
stats:
  - name: ATK
  - name: DEF
  - name: SPD
  - name: VIT
derived:
  hp: "150 + VIT * 12"
  baseDamage: "ATK"
  dodgeChance: "0.1"
  critChance: "0"
combat:
  maxRounds: 50
  initiative: "SPD"
  damage: "baseDamage - DEF_enemy"
  minDamage: 1
  timeout:
    winner: "hpPercent"
    drawMarginPct: 3
`;

describe('Stat Sweep Analysis (sweep)', () => {
  test('correct number of sweep points is generated', () => {
    const config = loadConfig(configYaml);
    const base = { name: 'A', stats: { ATK: 20, DEF: 10, SPD: 10, VIT: 10 } };
    const opponent = { name: 'B', stats: { ATK: 20, DEF: 10, SPD: 10, VIT: 10 } };

    // from 10 to 30, step 5 -> points: 10, 15, 20, 25, 30 (5 points)
    const result = sweep({
      base,
      opponent,
      config,
      stat: 'ATK',
      from: 10,
      to: 30,
      step: 5,
      battlesPerPoint: 10,
      seed: 42,
    });

    expect(result.length).toBe(5);
    expect(result[0].statValue).toBe(10);
    expect(result[1].statValue).toBe(15);
    expect(result[2].statValue).toBe(20);
    expect(result[3].statValue).toBe(25);
    expect(result[4].statValue).toBe(30);
  });

  test('monotonically growing ATK stat yields non-decreasing winrate', () => {
    const config = loadConfig(configYaml);
    const base = { name: 'Challenger', stats: { ATK: 5, DEF: 10, SPD: 100, VIT: 15 } };
    const opponent = { name: 'Defender', stats: { ATK: 25, DEF: 15, SPD: 100, VIT: 15 } };

    // ATK sweeps from 10 to 40, step 5
    const result = sweep({
      base,
      opponent,
      config,
      stat: 'ATK',
      from: 10,
      to: 40,
      step: 5,
      battlesPerPoint: 200,
      seed: 12345,
    });

    // Check monotonicity: each subsequent winrate should be >= previous winrate
    for (let i = 1; i < result.length; i++) {
      expect(result[i].winRate).toBeGreaterThanOrEqual(result[i - 1].winRate);
    }

    // Verify it goes from very low winrate to very high winrate
    expect(result[0].winRate).toBeLessThan(0.1);
    expect(result[result.length - 1].winRate).toBeGreaterThan(0.9);
  });

  test('validation errors are thrown for invalid parameters', () => {
    const config = loadConfig(configYaml);
    const base = { name: 'A', stats: { ATK: 20, DEF: 10, SPD: 10, VIT: 10 } };
    const opponent = { name: 'B', stats: { ATK: 20, DEF: 10, SPD: 10, VIT: 10 } };

    // 1. Non-existent stat
    expect(() =>
      sweep({
        base,
        opponent,
        config,
        stat: 'CRIT', // not in config
        from: 10,
        to: 30,
        step: 5,
        battlesPerPoint: 10,
        seed: 42,
      })
    ).toThrow('Stat "CRIT" is not defined in the configuration');

    // 2. from > to
    expect(() =>
      sweep({
        base,
        opponent,
        config,
        stat: 'ATK',
        from: 30,
        to: 10,
        step: 5,
        battlesPerPoint: 10,
        seed: 42,
      })
    ).toThrow('Invalid range: "from" (30) must be less than or equal to "to" (10)');

    // 3. step <= 0
    expect(() =>
      sweep({
        base,
        opponent,
        config,
        stat: 'ATK',
        from: 10,
        to: 30,
        step: 0,
        battlesPerPoint: 10,
        seed: 42,
      })
    ).toThrow('Invalid step: "step" (0) must be greater than 0');

    expect(() =>
      sweep({
        base,
        opponent,
        config,
        stat: 'ATK',
        from: 10,
        to: 30,
        step: -2,
        battlesPerPoint: 10,
        seed: 42,
      })
    ).toThrow('Invalid step: "step" (-2) must be greater than 0');
  });
});
