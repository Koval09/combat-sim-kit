import { Parser, Expression } from 'expr-eval';
import yaml from 'yaml';
import { z } from 'zod';
import { Config, RawConfig, CompiledExpression } from './types';

let activeRng: (() => number) | null = null;

export function setActiveRng(rngFunc: () => number) {
  activeRng = rngFunc;
}

export function clearActiveRng() {
  activeRng = null;
}

// Create a parser instance and register 'rand'
const parser = new Parser();
parser.functions.rand = () => {
  if (activeRng) {
    return activeRng();
  }
  return 0.5; // Stub for loading phase and validation
};

export const StatSchema = z.object({
  name: z.string().min(1, 'Stat name cannot be empty'),
});

export const RawConfigSchema = z.object({
  stats: z.array(StatSchema).min(1, 'At least one stat is required'),
  derived: z.record(z.string(), z.string()),
  combat: z.object({
    maxRounds: z.number().int().positive('maxRounds must be a positive integer'),
    initiative: z.string(),
    damage: z.string(),
    minDamage: z.number().int().nonnegative('minDamage must be a non-negative integer'),
    timeout: z.object({
      winner: z.string(),
      drawMarginPct: z.number().nonnegative('drawMarginPct must be non-negative'),
    }),
  }),
});

function compileAndValidate(
  exprStr: string,
  fieldName: string,
  allowedVars: Set<string>
): CompiledExpression {
  let expr: Expression;
  try {
    expr = parser.parse(exprStr);
  } catch (err: any) {
    throw new Error(`Failed to parse expression in "${fieldName}": ${err.message}`);
  }

  const vars = expr.variables();
  for (const v of vars) {
    if (!allowedVars.has(v)) {
      throw new Error(
        `Invalid configuration: Unknown identifier "${v}" in expression "${fieldName}" ("${exprStr}")`
      );
    }
  }

  const hasRand = expr.symbols().includes('rand');

  return {
    expression: expr,
    raw: exprStr,
    hasRand,
  };
}

export function loadConfig(yamlString: string): Config {
  if (typeof yamlString !== 'string') {
    throw new Error('Config must be a string');
  }

  let parsedYaml: any;
  try {
    parsedYaml = yaml.parse(yamlString);
  } catch (err: any) {
    throw new Error(`Invalid YAML format: ${err.message}`);
  }

  if (!parsedYaml || typeof parsedYaml !== 'object') {
    throw new Error('Config must be a valid YAML object');
  }

  // Zod validation
  let validated: RawConfig;
  try {
    validated = RawConfigSchema.parse(parsedYaml);
  } catch (err) {
    if (err instanceof z.ZodError) {
      const formatted = err.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
      throw new Error(`Schema validation error: ${formatted}`);
    }
    throw err;
  }

  const { stats, derived, combat } = validated;

  // Build allowedVars
  const allowedBaseVars = new Set<string>();
  for (const stat of stats) {
    allowedBaseVars.add(stat.name);
    allowedBaseVars.add(`${stat.name}_self`);
    allowedBaseVars.add(`${stat.name}_enemy`);
  }
  for (const key of Object.keys(derived)) {
    allowedBaseVars.add(key);
    allowedBaseVars.add(`${key}_self`);
    allowedBaseVars.add(`${key}_enemy`);
  }

  // Cycle detection for derived attributes
  const deps: Record<string, string[]> = {};
  for (const [key, exprStr] of Object.entries(derived)) {
    let parsed;
    try {
      parsed = parser.parse(exprStr);
    } catch (err: any) {
      throw new Error(`Failed to parse expression in "derived.${key}": ${err.message}`);
    }
    const vars = parsed.variables();
    deps[key] = vars
      .map((v) => {
        if (v.endsWith('_self')) return v.slice(0, -5);
        if (v.endsWith('_enemy')) return v.slice(0, -6);
        return v;
      })
      .filter((v) => v in derived);
  }

  const visited = new Set<string>();
  const recStack = new Set<string>();

  function checkCycle(node: string) {
    visited.add(node);
    recStack.add(node);

    for (const neighbor of deps[node] || []) {
      if (!visited.has(neighbor)) {
        if (checkCycle(neighbor)) return true;
      } else if (recStack.has(neighbor)) {
        return true;
      }
    }

    recStack.delete(node);
    return false;
  }

  for (const key of Object.keys(derived)) {
    if (!visited.has(key)) {
      if (checkCycle(key)) {
        throw new Error(`Circular dependency detected in derived attributes starting at "${key}"`);
      }
    }
  }

  // Compile and validate derived attributes
  const compiledDerived: Record<string, CompiledExpression> = {};
  for (const [key, exprStr] of Object.entries(derived)) {
    compiledDerived[key] = compileAndValidate(exprStr, `derived.${key}`, allowedBaseVars);
  }

  // Compile and validate combat initiative
  const compiledInitiative = compileAndValidate(
    combat.initiative,
    'combat.initiative',
    allowedBaseVars
  );

  // Compile and validate combat damage
  const allowedDamageVars = new Set(allowedBaseVars);
  allowedDamageVars.add('isCrit');
  const compiledDamage = compileAndValidate(
    combat.damage,
    'combat.damage',
    allowedDamageVars
  );

  // Test evaluate
  const dummyContext: Record<string, number> = {};
  for (const stat of stats) {
    dummyContext[stat.name] = 1;
    dummyContext[`${stat.name}_self`] = 1;
    dummyContext[`${stat.name}_enemy`] = 1;
  }
  for (const key of Object.keys(derived)) {
    dummyContext[key] = 1;
    dummyContext[`${key}_self`] = 1;
    dummyContext[`${key}_enemy`] = 1;
  }
  dummyContext['isCrit'] = 1;

  for (const [key, compExpr] of Object.entries(compiledDerived)) {
    try {
      compExpr.expression.evaluate(dummyContext);
    } catch (err: any) {
      throw new Error(`Error evaluating expression for "derived.${key}": ${err.message}`);
    }
  }

  try {
    compiledInitiative.expression.evaluate(dummyContext);
  } catch (err: any) {
    throw new Error(`Error evaluating expression for "combat.initiative": ${err.message}`);
  }

  try {
    compiledDamage.expression.evaluate(dummyContext);
  } catch (err: any) {
    throw new Error(`Error evaluating expression for "combat.damage": ${err.message}`);
  }

  return {
    stats,
    derived: compiledDerived,
    combat: {
      maxRounds: combat.maxRounds,
      initiative: compiledInitiative,
      damage: compiledDamage,
      minDamage: combat.minDamage,
      timeout: combat.timeout,
    },
  };
}
