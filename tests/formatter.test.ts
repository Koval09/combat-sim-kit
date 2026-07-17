import { expect, test, describe } from 'vitest';
import { formatBattleEvent, formatMonteCarloTable, formatSweepTable } from '../src/cli/formatter';
import { BattleEvent, MonteCarloResult, SweepResult } from '../src/types';

describe('CLI Output Formatting', () => {
  test('formatBattleEvent formats dodge, hit, and crit correctly', () => {
    const dodgeEvent: BattleEvent = {
      round: 1,
      attacker: 'Cat',
      defender: 'Dog',
      type: 'dodge',
      damage: 0,
      defenderHp: 100,
    };
    const hitEvent: BattleEvent = {
      round: 2,
      attacker: 'Cat',
      defender: 'Dog',
      type: 'hit',
      damage: 15.555,
      defenderHp: 84.445,
    };
    const critEvent: BattleEvent = {
      round: 12,
      attacker: 'Dog',
      defender: 'Cat',
      type: 'crit',
      damage: 40,
      defenderHp: 60,
    };

    expect(formatBattleEvent(dodgeEvent)).toBe(
      '[Round 01] Cat attacks Dog, but Dog DODGES! (HP: 100.00)'
    );
    expect(formatBattleEvent(hitEvent)).toBe(
      '[Round 02] Cat hits Dog for 15.55 damage (HP: 84.44)'
    );
    expect(formatBattleEvent(critEvent)).toBe(
      '[Round 12] Dog CRITS Cat for 40.00 damage! (HP: 60.00)'
    );
  });

  test('formatMonteCarloTable formats results correctly', () => {
    const result: MonteCarloResult = {
      battles: 1000,
      winRateA: 0.55123,
      winRateB: 0.40877,
      drawRate: 0.04,
      timeoutRate: 0.015,
      avgRounds: 15.25,
      medianRounds: 14,
      roundsHistogram: {},
      avgDamagePerRound: 32.123,
    };

    const formatted = formatMonteCarloTable(result, 'Cat', 'Dog');
    expect(formatted).toContain(' Win Rate (Cat):              55.12%');
    expect(formatted).toContain(' Win Rate (Dog):              40.88%');
    expect(formatted).toContain(' Draw Rate:                   4.00%');
    expect(formatted).toContain(' Timeout Rate:                1.50%');
    expect(formatted).toContain(' Average Rounds:              15.25');
    expect(formatted).toContain(' Median Rounds:               14');
    expect(formatted).toContain(' Avg Damage/Round:            32.12');
  });

  test('formatSweepTable formats results and ASCII bar chart correctly', () => {
    const results: SweepResult = [
      { statValue: 10, winRate: 0.0, avgRounds: 10 },
      { statValue: 20, winRate: 0.5, avgRounds: 12 },
      { statValue: 30, winRate: 1.0, avgRounds: 8 },
    ];

    const formatted = formatSweepTable(results, 'ATK');
    expect(formatted).toContain('ATK        | Win Rate   | Avg Rds  | Win Rate Chart');
    // 0.0 winrate -> 0 blocks -> all 20 empty
    expect(formatted).toContain('10         | 0.0%       | 10.0     | [░░░░░░░░░░░░░░░░░░░░]');
    // 0.5 winrate -> 10 blocks -> 10 filled, 10 empty
    expect(formatted).toContain('20         | 50.0%      | 12.0     | [██████████░░░░░░░░░░]');
    // 1.0 winrate -> 20 blocks -> all 20 filled
    expect(formatted).toContain('30         | 100.0%     | 8.0      | [████████████████████]');
  });
});
