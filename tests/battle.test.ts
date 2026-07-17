import { expect, test, describe } from 'vitest';
import { loadConfig } from '../src/config';
import { simulateBattle } from '../src/battle';
import { createRng } from '../src/rng';

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

describe('Battle Simulation (simulateBattle)', () => {
  test('battle is reproducible bit-by-bit with the same seed', () => {
    const config = loadConfig(configYaml);
    const a = { name: 'Cat', stats: { ATK: 50, DEF: 20, SPD: 120, VIT: 15, CRIT: 10 } };
    const b = { name: 'Dog', stats: { ATK: 40, DEF: 40, SPD: 80, VIT: 25, CRIT: 5 } };

    const result1 = simulateBattle({ a, b, config, rng: createRng(42) });
    const result2 = simulateBattle({ a, b, config, rng: createRng(42) });

    expect(result1.winner).toBe(result2.winner);
    expect(result1.winReason).toBe(result2.winReason);
    expect(result1.rounds).toBe(result2.rounds);
    expect(result1.log).toEqual(result2.log);
  });

  test('obviously stronger fighter wins by KO', () => {
    const config = loadConfig(configYaml);
    // GodCat has massive stats compared to weak mouse
    const a = { name: 'GodCat', stats: { ATK: 500, DEF: 100, SPD: 300, VIT: 100, CRIT: 50 } };
    const b = { name: 'Mouse', stats: { ATK: 5, DEF: 5, SPD: 5, VIT: 5, CRIT: 0 } };

    const result = simulateBattle({ a, b, config, rng: createRng(1) });
    expect(result.winner).toBe('a');
    expect(result.winReason).toBe('ko');
    expect(result.rounds).toBeLessThan(5); // should end very quickly
  });

  test('high dodge on both sides leads to timeout and draw or HP% win', () => {
    // Custom config with extremely high dodge (e.g. 0.99)
    const customConfigYaml = configYaml.replace(
      'dodgeChance: "max(0.05, min(0.45, 0.10 + (SPD_self - SPD_enemy) / 150))"',
      'dodgeChance: "0.99"'
    );
    const configHighDodge = loadConfig(customConfigYaml);

    const a = { name: 'Ninja A', stats: { ATK: 10, DEF: 10, SPD: 100, VIT: 20, CRIT: 5 } };
    const b = { name: 'Ninja B', stats: { ATK: 10, DEF: 10, SPD: 100, VIT: 20, CRIT: 5 } };

    const result = simulateBattle({ a, b, config: configHighDodge, rng: createRng(10) });

    expect(result.winReason).toBe('timeout');
    expect(result.rounds).toBe(50);
  });

  test('turn order changes between rounds with close speeds (initiative not fixed)', () => {
    const config = loadConfig(configYaml);
    // Close speeds with a big RNG initiative factor will result in alternating turns
    const a = { name: 'Speedy A', stats: { ATK: 10, DEF: 10, SPD: 100, VIT: 50, CRIT: 0 } };
    const b = { name: 'Speedy B', stats: { ATK: 10, DEF: 10, SPD: 100, VIT: 50, CRIT: 0 } };

    const result = simulateBattle({ a, b, config, rng: createRng(999) });

    // Let's count how many times A starts the round vs B starting the round.
    // In our log, we can check the first attacker of each round.
    const roundFirstAttackers = new Map<number, string>();
    for (const event of result.log) {
      if (!roundFirstAttackers.has(event.round)) {
        roundFirstAttackers.set(event.round, event.attacker);
      }
    }

    const firstAttackersList = Array.from(roundFirstAttackers.values());
    const uniqueAttackers = new Set(firstAttackersList);

    // If initiative is recalculated every round, both A and B should go first at least once
    expect(uniqueAttackers.has('Speedy A')).toBe(true);
    expect(uniqueAttackers.has('Speedy B')).toBe(true);
  });

  test('log is consistent with the result (damage sum matches HP loss)', () => {
    const config = loadConfig(configYaml);
    const a = { name: 'Cat', stats: { ATK: 30, DEF: 10, SPD: 100, VIT: 15, CRIT: 10 } };
    const b = { name: 'Dog', stats: { ATK: 25, DEF: 20, SPD: 90, VIT: 18, CRIT: 5 } };

    const result = simulateBattle({ a, b, config, rng: createRng(12345) });

    // Derive max HP from formula (150 + VIT * 12)
    const maxHpA = 150 + 15 * 12; // 330
    const maxHpB = 150 + 18 * 12; // 366

    let totalDamageToA = 0;
    let totalDamageToB = 0;

    for (const event of result.log) {
      if (event.defender === 'Cat') {
        totalDamageToA += event.damage;
        // Verify log defenderHp matches
        expect(event.defenderHp).toBeCloseTo(Math.max(0, maxHpA - totalDamageToA), 4);
      } else if (event.defender === 'Dog') {
        totalDamageToB += event.damage;
        // Verify log defenderHp matches
        expect(event.defenderHp).toBeCloseTo(Math.max(0, maxHpB - totalDamageToB), 4);
      }
    }

    // Verify final state matches log end
    const lastEventA = [...result.log].reverse().find(e => e.defender === 'Cat');
    const lastEventB = [...result.log].reverse().find(e => e.defender === 'Dog');

    const expectedFinalHpA = Math.max(0, maxHpA - totalDamageToA);
    const expectedFinalHpB = Math.max(0, maxHpB - totalDamageToB);

    if (lastEventA) {
      expect(lastEventA.defenderHp).toBeCloseTo(expectedFinalHpA, 4);
    }
    if (lastEventB) {
      expect(lastEventB.defenderHp).toBeCloseTo(expectedFinalHpB, 4);
    }
  });
});
