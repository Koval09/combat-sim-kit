import { BattleEvent, MonteCarloResult, SweepResult } from '../types';

export function formatBattleEvent(event: BattleEvent): string {
  const dmg = event.damage.toFixed(2);
  const hp = event.defenderHp.toFixed(2);
  if (event.type === 'dodge') {
    return `[Round ${event.round.toString().padStart(2, '0')}] ${event.attacker} attacks ${event.defender}, but ${event.defender} DODGES! (HP: ${hp})`;
  } else if (event.type === 'crit') {
    return `[Round ${event.round.toString().padStart(2, '0')}] ${event.attacker} CRITS ${event.defender} for ${dmg} damage! (HP: ${hp})`;
  } else {
    return `[Round ${event.round.toString().padStart(2, '0')}] ${event.attacker} hits ${event.defender} for ${dmg} damage (HP: ${hp})`;
  }
}

export function formatMonteCarloTable(
  result: MonteCarloResult,
  nameA: string,
  nameB: string
): string {
  const pct = (val: number) => `${(val * 100).toFixed(2)}%`;
  return [
    `--------------------------------------------------`,
    ` Monte-Carlo Simulation Results (${result.battles} battles)`,
    `--------------------------------------------------`,
    ` Win Rate (${nameA}):`.padEnd(30) + `${pct(result.winRateA)}`,
    ` Win Rate (${nameB}):`.padEnd(30) + `${pct(result.winRateB)}`,
    ` Draw Rate:`.padEnd(30) + `${pct(result.drawRate)}`,
    ` Timeout Rate:`.padEnd(30) + `${pct(result.timeoutRate)}`,
    ` Average Rounds:`.padEnd(30) + `${result.avgRounds.toFixed(2)}`,
    ` Median Rounds:`.padEnd(30) + `${result.medianRounds}`,
    ` Avg Damage/Round:`.padEnd(30) + `${result.avgDamagePerRound.toFixed(2)}`,
    `--------------------------------------------------`,
  ].join('\n');
}

export function formatSweepTable(results: SweepResult, statName: string): string {
  const lines = [
    `${statName.padEnd(10)} | ${'Win Rate'.padEnd(10)} | ${'Avg Rds'.padEnd(8)} | ${'Win Rate Chart'}`,
    `-----------+------------+----------+----------------------`,
  ];

  for (const pt of results) {
    const valStr = pt.statValue.toString().padEnd(10);
    const wrStr = `${(pt.winRate * 100).toFixed(1)}%`.padEnd(10);
    const rdStr = pt.avgRounds.toFixed(1).padEnd(8);

    const barLength = 20;
    const filled = Math.round(pt.winRate * barLength);
    const empty = barLength - filled;
    const bar = '█'.repeat(filled) + '░'.repeat(empty);

    lines.push(`${valStr} | ${wrStr} | ${rdStr} | [${bar}]`);
  }

  return lines.join('\n');
}
