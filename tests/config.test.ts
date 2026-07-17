import { expect, test, describe } from 'vitest';
import { loadConfig } from '../src/config';

const validConfigYaml = `
stats:
  - name: ATK
  - name: DEF
  - name: SPD
derived:
  hp: "100 + DEF * 10"
  baseDamage: "ATK * (0.9 + rand() * 0.2)"
  dodgeChance: "0.1"
  critChance: "0.1"
combat:
  maxRounds: 50
  initiative: "SPD * (1.0 + rand() * 0.1)"
  damage: "baseDamage - DEF_enemy"
  minDamage: 1
  timeout:
    winner: "hpPercent"
    drawMarginPct: 3
`;

describe('Config Loader (loadConfig)', () => {
  test('valid config loads successfully', () => {
    const config = loadConfig(validConfigYaml);
    expect(config.stats).toEqual([{ name: 'ATK' }, { name: 'DEF' }, { name: 'SPD' }]);
    expect(config.combat.maxRounds).toBe(50);
    expect(config.combat.minDamage).toBe(1);
    expect(config.combat.timeout.winner).toBe('hpPercent');
    expect(config.combat.timeout.drawMarginPct).toBe(3);

    // Derived compiled attributes
    expect(config.derived.hp).toBeDefined();
    expect(config.derived.hp.raw).toBe('100 + DEF * 10');
    expect(config.derived.hp.hasRand).toBe(false);

    expect(config.derived.baseDamage).toBeDefined();
    expect(config.derived.baseDamage.raw).toBe('ATK * (0.9 + rand() * 0.2)');
    expect(config.derived.baseDamage.hasRand).toBe(true);

    // Combat compiled expressions
    expect(config.combat.initiative.raw).toBe('SPD * (1.0 + rand() * 0.1)');
    expect(config.combat.initiative.hasRand).toBe(true);

    expect(config.combat.damage.raw).toBe('baseDamage - DEF_enemy');
    expect(config.combat.damage.hasRand).toBe(false);
  });

  test('invalid YAML throws clear error', () => {
    const invalidYaml = `
stats:
  - name: ATK
  - name: DEF
  derived:
    hp: "100"
combat:
  maxRounds: 50
  initiative: "SPD"
    damage: "ATK"
  minDamage: 1
  timeout:
    winner: "hpPercent"
    drawMarginPct: 3
`;
    expect(() => loadConfig(invalidYaml)).toThrow(/Invalid YAML format/);
  });

  test('schema validation violation throws clear error', () => {
    const missingStatsYaml = `
derived:
  hp: "100"
  dodgeChance: "0.1"
  critChance: "0.1"
combat:
  maxRounds: 50
  initiative: "SPD"
  damage: "ATK"
  minDamage: 1
  timeout:
    winner: "hpPercent"
    drawMarginPct: 3
`;
    expect(() => loadConfig(missingStatsYaml)).toThrow(/Schema validation error: stats: Required/);
  });

  test('unknown identifier (typo in stat name) throws clear error', () => {
    const typoYaml = `
stats:
  - name: ATK
  - name: DEF
derived:
  hp: "100 + DEFF * 10"
  dodgeChance: "0.1"
  critChance: "0.1"
combat:
  maxRounds: 50
  initiative: "ATK"
  damage: "ATK"
  minDamage: 1
  timeout:
    winner: "hpPercent"
    drawMarginPct: 3
`;
    expect(() => loadConfig(typoYaml)).toThrow(
      'Invalid configuration: Unknown identifier "DEFF" in expression "derived.hp" ("100 + DEFF * 10")'
    );
  });

  test('unknown identifier in combat initiative throws clear error', () => {
    const typoYaml = `
stats:
  - name: ATK
  - name: DEF
derived:
  hp: "100 + DEF * 10"
  dodgeChance: "0.1"
  critChance: "0.1"
combat:
  maxRounds: 50
  initiative: "SPD_typo"
  damage: "ATK"
  minDamage: 1
  timeout:
    winner: "hpPercent"
    drawMarginPct: 3
`;
    expect(() => loadConfig(typoYaml)).toThrow(
      'Invalid configuration: Unknown identifier "SPD_typo" in expression "combat.initiative" ("SPD_typo")'
    );
  });

  test('circular dependency in derived attributes throws clear error', () => {
    const circularYaml = `
stats:
  - name: ATK
derived:
  hp: "10 + baseDamage"
  baseDamage: "ATK + hp"
  dodgeChance: "0.1"
  critChance: "0.1"
combat:
  maxRounds: 50
  initiative: "ATK"
  damage: "ATK"
  minDamage: 1
  timeout:
    winner: "hpPercent"
    drawMarginPct: 3
`;
    expect(() => loadConfig(circularYaml)).toThrow(
      /Circular dependency detected in derived attributes/
    );
  });

  test('config missing mandatory derived attribute (hp) throws clear error', () => {
    const missingHpYaml = `
stats:
  - name: ATK
derived:
  dodgeChance: "0.1"
  critChance: "0.1"
combat:
  maxRounds: 50
  initiative: "ATK"
  damage: "ATK"
  minDamage: 1
  timeout:
    winner: "hpPercent"
    drawMarginPct: 3
`;
    expect(() => loadConfig(missingHpYaml)).toThrow(
      /Missing required derived attribute "hp"/
    );
  });

  test('unknown identifier in combat.damage throws clear error', () => {
    const unknownDamageYaml = `
stats:
  - name: ATK
derived:
  hp: "100"
  dodgeChance: "0.1"
  critChance: "0.1"
combat:
  maxRounds: 50
  initiative: "ATK"
  damage: "ATK_typo"
  minDamage: 1
  timeout:
    winner: "hpPercent"
    drawMarginPct: 3
`;
    expect(() => loadConfig(unknownDamageYaml)).toThrow(
      'Invalid configuration: Unknown identifier "ATK_typo" in expression "combat.damage" ("ATK_typo")'
    );
  });
});
