import { Expression } from 'expr-eval';
import { Config, Fighter } from './types';
import { Rng } from './rng';
import { rngStorage } from './config';
import fs from 'fs';
import yaml from 'yaml';
import { z } from 'zod';

/**
 * FighterInstance represents a fighter in a combat simulation.
 * It encapsulates the fighter's name, primary stats, and methods to resolve derived attributes.
 *
 * Caching Policy:
 * - Derived attributes WITHOUT `rand()` are evaluated once per combat context and cached in `derivedCache`.
 *   Since base stats are constant during a battle, these cached values will remain valid.
 * - Derived attributes WITH `rand()` are re-evaluated upon every access to ensure that the RNG
 *   is called correctly on each query.
 */
export class FighterInstance {
  readonly name: string;
  readonly stats: Record<string, number>;
  private config: Config;
  private enemy: FighterInstance | null = null;
  private rng: Rng | null = null;
  private derivedCache = new Map<string, number>();

  maxHp = 0;
  currentHp = 0;

  constructor(name: string, stats: Record<string, number>, config: Config) {
    this.name = name;
    this.stats = stats;
    this.config = config;

    // Verify all stats specified in the config are present in the fighter
    for (const stat of config.stats) {
      if (stats[stat.name] === undefined) {
        throw new Error(
          `Fighter "${name}" is missing required primary stat "${stat.name}"`
        );
      }
    }
  }

  /**
   * Sets the combat context for this fighter, linking them to an opponent and the battle's RNG.
   * This also clears the derived attribute cache for a fresh simulation run.
   */
  setCombatContext(enemy: FighterInstance, rng: Rng) {
    this.enemy = enemy;
    this.rng = rng;
    this.derivedCache.clear();
    this.maxHp = this.getDerived('hp');
    this.currentHp = this.maxHp;
  }

  /**
   * Clears the combat context and resets cached derived attributes.
   */
  clearCombatContext() {
    this.enemy = null;
    this.rng = null;
    this.derivedCache.clear();
  }

  /**
   * Retrieves the value of a derived attribute.
   * Leverages caching for non-random expressions, and re-evaluates random expressions.
   */
  getDerived(name: string): number {
    const compiled = this.config.derived[name];
    if (!compiled) {
      throw new Error(`Unknown derived attribute "${name}"`);
    }

    // Return cached value if available and not dependent on rand()
    if (!compiled.hasRand && this.derivedCache.has(name)) {
      return this.derivedCache.get(name)!;
    }

    // Evaluate the expression
    const value = this.evaluateExpression(compiled.expression);

    // Cache the result if it does not contain rand()
    if (!compiled.hasRand) {
      this.derivedCache.set(name, value);
    }

    return value;
  }

  /**
   * Evaluates an expression within the context of this fighter, their opponent, and the RNG.
   */
  evaluateExpression(expr: Expression, extraContext?: Record<string, any>): number {
    const context: Record<string, any> = {};

    if (extraContext) {
      Object.assign(context, extraContext);
    }

    // 1. Add own stats (as base name and with _self suffix)
    for (const statName of Object.keys(this.stats)) {
      const val = this.stats[statName];
      context[statName] = val;
      context[`${statName}_self`] = val;
    }

    // 2. Add enemy stats with _enemy suffix
    if (this.enemy) {
      for (const statName of Object.keys(this.enemy.stats)) {
        context[`${statName}_enemy`] = this.enemy.stats[statName];
      }
    } else {
      // Fallback fallback for when no opponent is set (e.g. test evaluation)
      for (const stat of this.config.stats) {
        context[`${stat.name}_enemy`] = 1;
      }
    }

    // 3. Define lazy getters for derived attributes to resolve them on-demand
    for (const derivedKey of Object.keys(this.config.derived)) {
      // Own derived (suffixless and _self)
      Object.defineProperty(context, derivedKey, {
        get: () => this.getDerived(derivedKey),
        enumerable: true,
        configurable: true,
      });
      Object.defineProperty(context, `${derivedKey}_self`, {
        get: () => this.getDerived(derivedKey),
        enumerable: true,
        configurable: true,
      });

      // Enemy derived (_enemy)
      Object.defineProperty(context, `${derivedKey}_enemy`, {
        get: () => {
          if (!this.enemy) {
            return 1; // Fallback when no opponent is set
          }
          return this.enemy.getDerived(derivedKey);
        },
        enumerable: true,
        configurable: true,
      });
    }

    const rngFunc = this.rng ? () => this.rng!.random() : () => 0.5;
    return rngStorage.run(rngFunc, () => expr.evaluate(context));
  }
}

/**
 * Creates a FighterInstance after validating the fighter object against the configuration.
 */
export function createFighter(fighter: Fighter, config: Config): FighterInstance {
  return new FighterInstance(fighter.name, fighter.stats, config);
}

export const FighterSchema = z.object({
  name: z.string().min(1, 'Fighter name cannot be empty'),
  stats: z.record(z.string(), z.number()),
});

export function loadFighter(filePath: string): Fighter {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Fighter file not found: ${filePath}`);
  }
  const content = fs.readFileSync(filePath, 'utf-8');
  let parsed: unknown;
  try {
    parsed = yaml.parse(content);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Invalid YAML format in fighter file "${filePath}": ${msg}`);
  }
  try {
    return FighterSchema.parse(parsed);
  } catch (err: unknown) {
    if (err instanceof z.ZodError) {
      const formatted = err.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
      throw new Error(`Fighter schema validation error in "${filePath}": ${formatted}`);
    }
    throw err;
  }
}
