import { Command } from 'commander';
import fs from 'fs';
import { loadConfig } from '../config';
import { loadFighter } from '../fighter';
import { createRng } from '../rng';
import { simulateBattle } from '../battle';
import { formatBattleEvent } from './formatter';

export const fightCommand = new Command('fight')
  .description('Run a single combat simulation with detailed log')
  .requiredOption('-c, --config <file>', 'path to combat configuration YAML file')
  .requiredOption('-a, --fighter-a <file>', 'path to fighter A YAML file')
  .requiredOption('-b, --fighter-b <file>', 'path to fighter B YAML file')
  .option('--seed <number>', 'random seed (number) for the battle', (val) => parseInt(val, 10))
  .action((options) => {
    try {
      if (!fs.existsSync(options.config)) {
        throw new Error(`Config file not found: ${options.config}`);
      }
      const configStr = fs.readFileSync(options.config, 'utf-8');
      const config = loadConfig(configStr);

      const a = loadFighter(options.fighterA);
      const b = loadFighter(options.fighterB);

      const seed = options.seed !== undefined ? options.seed : Math.floor(Math.random() * 2147483648);
      console.log(`Using seed: ${seed}`);

      const rng = createRng(seed);
      const result = simulateBattle({ a, b, config, rng });

      for (const event of result.log) {
        console.log(formatBattleEvent(event));
      }

      const reason = result.winReason === 'ko' ? 'KO' : 'Timeout';
      console.log(`\nWinner: ${result.winner === 'draw' ? 'Draw' : result.winner.toUpperCase()} (${reason})`);
    } catch (err: any) {
      console.error(`Error: ${err.message}`);
      process.exit(1);
    }
  });
