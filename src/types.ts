import { Expression } from 'expr-eval';

export interface Stat {
  name: string;
}

export interface RawConfig {
  stats: Stat[];
  derived: Record<string, string>;
  combat: {
    maxRounds: number;
    initiative: string;
    damage: string;
    minDamage: number;
    timeout: {
      winner: string;
      drawMarginPct: number;
    };
  };
}

export interface CompiledExpression {
  expression: Expression;
  raw: string;
  hasRand: boolean;
}

export interface Config {
  stats: Stat[];
  derived: Record<string, CompiledExpression>;
  combat: {
    maxRounds: number;
    initiative: CompiledExpression;
    damage: CompiledExpression;
    minDamage: number;
    timeout: {
      winner: string;
      drawMarginPct: number;
    };
  };
}

export interface Fighter {
  name: string;
  stats: Record<string, number>;
}
