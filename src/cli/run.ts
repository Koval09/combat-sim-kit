import { Command, InvalidArgumentError } from 'commander';
import fs from 'fs';
import { loadConfig } from '../config';
import { loadFighter } from '../fighter';
import { runMonteCarlo } from '../montecarlo';
import { formatMonteCarloTable } from './formatter';

function parseSeed(val: string): number {
  const parsed = parseInt(val, 10);
  if (isNaN(parsed)) {
    throw new InvalidArgumentError('Seed must be a valid integer.');
  }
  return parsed;
}

function parseBattles(val: string): number {
  const parsed = parseInt(val, 10);
  if (isNaN(parsed) || parsed <= 0) {
    throw new InvalidArgumentError('Number of battles must be a positive integer.');
  }
  return parsed;
}

export const runCommand = new Command('run')
  .description('Run Monte-Carlo combat simulation')
  .requiredOption('-c, --config <file>', 'path to combat configuration YAML file')
  .requiredOption('-a, --fighter-a <file>', 'path to fighter A YAML file')
  .requiredOption('-b, --fighter-b <file>', 'path to fighter B YAML file')
  .option('-n, --battles <number>', 'number of battles to simulate', parseBattles, 10000)
  .option('--seed <number>', 'random seed (number) for the simulation', parseSeed)
  .option('--json <file>', 'export simulation results to a JSON file')
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

      const result = runMonteCarlo({
        a,
        b,
        config,
        battles: options.battles,
        seed,
      });

      console.log(formatMonteCarloTable(result, a.name, b.name));

      if (options.json) {
        fs.writeFileSync(options.json, JSON.stringify(result, null, 2), 'utf-8');
        console.log(`Results successfully exported to ${options.json}`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`Error: ${msg}`);
      process.exit(1);
    }
  });
