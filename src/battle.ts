import { Config, Fighter, BattleResult, BattleEvent } from './types';
import { Rng } from './rng';
import { createFighter, FighterInstance } from './fighter';

export function simulateBattle({
  a,
  b,
  config,
  rng,
}: {
  a: Fighter;
  b: Fighter;
  config: Config;
  rng: Rng;
}): BattleResult {
  const fighterA = createFighter(a, config);
  const fighterB = createFighter(b, config);

  fighterA.setCombatContext(fighterB, rng);
  fighterB.setCombatContext(fighterA, rng);

  const log: BattleEvent[] = [];
  let round = 1;
  const maxRounds = config.combat.maxRounds;

  while (round <= maxRounds) {
    // Recompute initiative EVERY round for both fighters
    const initA = fighterA.evaluateExpression(config.combat.initiative.expression);
    const initB = fighterB.evaluateExpression(config.combat.initiative.expression);

    let first: FighterInstance;
    let second: FighterInstance;

    if (initA > initB) {
      first = fighterA;
      second = fighterB;
    } else if (initB > initA) {
      first = fighterB;
      second = fighterA;
    } else {
      // Tie breaker using RNG
      if (rng.chance(0.5)) {
        first = fighterA;
        second = fighterB;
      } else {
        first = fighterB;
        second = fighterA;
      }
    }

    // First attacker turns
    executeTurn(first, second, round, log, config, rng);
    if (second.currentHp <= 0) {
      const winnerName = first === fighterA ? 'a' : 'b';
      return {
        winner: winnerName,
        winReason: 'ko',
        rounds: round,
        log,
      };
    }

    // Second attacker turns
    executeTurn(second, first, round, log, config, rng);
    if (first.currentHp <= 0) {
      const winnerName = second === fighterA ? 'a' : 'b';
      return {
        winner: winnerName,
        winReason: 'ko',
        rounds: round,
        log,
      };
    }

    round++;
  }

  // Timeout logic
  const hpPctA = (fighterA.currentHp / fighterA.maxHp) * 100;
  const hpPctB = (fighterB.currentHp / fighterB.maxHp) * 100;
  const diff = Math.abs(hpPctA - hpPctB);

  let winner: 'a' | 'b' | 'draw';
  if (diff < config.combat.timeout.drawMarginPct) {
    winner = 'draw';
  } else if (hpPctA > hpPctB) {
    winner = 'a';
  } else {
    winner = 'b';
  }

  return {
    winner,
    winReason: 'timeout',
    rounds: maxRounds,
    log,
  };
}

function executeTurn(
  attacker: FighterInstance,
  defender: FighterInstance,
  round: number,
  log: BattleEvent[],
  config: Config,
  rng: Rng
) {
  // Roll dodge Chance for defender
  const dodgeChance = defender.getDerived('dodgeChance');
  if (rng.chance(dodgeChance)) {
    log.push({
      round,
      attacker: attacker.name,
      defender: defender.name,
      type: 'dodge',
      damage: 0,
      defenderHp: defender.currentHp,
    });
    return;
  }

  // Roll crit Chance for attacker
  const critChance = attacker.getDerived('critChance');
  const isCrit = rng.chance(critChance);

  // Evaluate damage
  const damageValue = attacker.evaluateExpression(config.combat.damage.expression, { isCrit });
  const finalDamage = Math.max(config.combat.minDamage, damageValue);

  // Apply damage
  defender.currentHp = Math.max(0, defender.currentHp - finalDamage);

  log.push({
    round,
    attacker: attacker.name,
    defender: defender.name,
    type: isCrit ? 'crit' : 'hit',
    damage: finalDamage,
    defenderHp: defender.currentHp,
  });
}
