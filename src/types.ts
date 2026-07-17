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

export interface BattleEvent {
  round: number;
  attacker: string;
  defender: string;
  type: 'hit' | 'crit' | 'dodge';
  damage: number;
  defenderHp: number;
}

export interface BattleResult {
  winner: 'a' | 'b' | 'draw';
  winReason: 'ko' | 'timeout';
  rounds: number;
  log: BattleEvent[];
}
export interface MonteCarloResult {
  battles: number;
  winRateA: number;
  winRateB: number;
  drawRate: number;
  timeoutRate: number;
  avgRounds: number;
  medianRounds: number;
  roundsHistogram: Record<number, number>;
  avgDamagePerRound: number;
}
