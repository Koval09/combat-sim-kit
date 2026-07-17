import { expect, test, describe } from 'vitest';
import { loadConfig } from '../src/config';
import { createFighter } from '../src/fighter';
import { createRng } from '../src/rng';

const configYaml = `
stats:
  - name: ATK
  - name: DEF
  - name: SPD
  - name: VIT
derived:
  hp: "150 + VIT * 12"
  baseDamage: "ATK * (0.9 + rand() * 0.2)"
  dodgeChance: "max(0.05, min(0.45, 0.10 + (SPD_self - SPD_enemy) / 150))"
combat:
  maxRounds: 50
  initiative: "SPD * (1.0 + rand() * 0.1)"
  damage: "baseDamage - DEF_enemy"
  minDamage: 1
  timeout:
    winner: "hpPercent"
    drawMarginPct: 3
`;

describe('Fighter Creation and Derived Attributes Resolution', () => {
  test('hp formula calculates correctly', () => {
    const config = loadConfig(configYaml);
    const fighter = createFighter(
      {
        name: 'test-fighter',
        stats: { ATK: 10, DEF: 10, SPD: 10, VIT: 20 },
      },
      config
    );

    // hp = 150 + 20 * 12 = 390
    expect(fighter.getDerived('hp')).toBe(390);
  });

  test('expression with SPD_self and SPD_enemy resolves correctly for both sides', () => {
    const config = loadConfig(configYaml);
    const fighterA = createFighter(
      {
        name: 'Fighter A',
        stats: { ATK: 10, DEF: 10, SPD: 150, VIT: 10 },
      },
      config
    );
    const fighterB = createFighter(
      {
        name: 'Fighter B',
        stats: { ATK: 10, DEF: 10, SPD: 100, VIT: 10 },
      },
      config
    );

    const rng = createRng(42);

    // Set A vs B context
    fighterA.setCombatContext(fighterB, rng);
    // Set B vs A context
    fighterB.setCombatContext(fighterA, rng);

    // For A: dodgeChance = max(0.05, min(0.45, 0.10 + (150 - 100) / 150)) = max(0.05, min(0.45, 0.10 + 50 / 150))
    // 0.10 + 0.3333333333333333 = 0.43333333333333335
    // min(0.45, 0.43333333333333335) = 0.43333333333333335
    expect(fighterA.getDerived('dodgeChance')).toBeCloseTo(0.4333, 4);

    // For B: dodgeChance = max(0.05, min(0.45, 0.10 + (100 - 150) / 150)) = max(0.05, min(0.45, 0.10 - 50 / 150))
    // 0.10 - 0.3333333333333333 = -0.2333333333333333
    // max(0.05, -0.2333) = 0.05
    expect(fighterB.getDerived('dodgeChance')).toBe(0.05);
  });

  test('expression with rand() is deterministic with fixed seed and changes on each call', () => {
    const config = loadConfig(configYaml);
    const fighter = createFighter(
      {
        name: 'Rng Fighter',
        stats: { ATK: 100, DEF: 10, SPD: 10, VIT: 10 },
      },
      config
    );

    const rng1 = createRng(12345);
    fighter.setCombatContext(fighter, rng1); // dummy enemy context pointing to itself

    // Fetch baseDamage multiple times
    const dmg1 = fighter.getDerived('baseDamage');
    const dmg2 = fighter.getDerived('baseDamage');

    // Since rand() is called, baseDamage should be different on successive calls due to RNG sequence advancing
    expect(dmg1).not.toBe(dmg2);

    // Recreate same conditions with identical seed
    const rng2 = createRng(12345);
    const fighter2 = createFighter(
      {
        name: 'Rng Fighter',
        stats: { ATK: 100, DEF: 10, SPD: 10, VIT: 10 },
      },
      config
    );
    fighter2.setCombatContext(fighter2, rng2);

    const checkDmg1 = fighter2.getDerived('baseDamage');
    const checkDmg2 = fighter2.getDerived('baseDamage');

    // Values should be byte-identical to the first sequence
    expect(checkDmg1).toBe(dmg1);
    expect(checkDmg2).toBe(dmg2);
  });

  test('missing stat throws clear error', () => {
    const config = loadConfig(configYaml);
    expect(() =>
      createFighter(
        {
          name: 'Incomplete Fighter',
          stats: { ATK: 10, DEF: 10, SPD: 10 }, // missing VIT
        },
        config
      )
    ).toThrow('Fighter "Incomplete Fighter" is missing required primary stat "VIT"');
  });
});
