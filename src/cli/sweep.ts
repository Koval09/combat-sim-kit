import { Command, InvalidArgumentError } from 'commander';
import fs from 'fs';
import { loadConfig } from '../config';
import { loadFighter } from '../fighter';
import { sweep } from '../sweep';
import { formatSweepTable } from './formatter';

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

function parseNumber(name: string) {
  return (val: string): number => {
    const parsed = parseFloat(val);
    if (isNaN(parsed)) {
      throw new InvalidArgumentError(`${name} must be a valid number.`);
    }
    return parsed;
  };
}

function parseStep(val: string): number {
  const parsed = parseFloat(val);
  if (isNaN(parsed) || parsed <= 0) {
    throw new InvalidArgumentError('Step must be a positive number.');
  }
  return parsed;
}

export const sweepCommand = new Command('sweep')
  .description('Run stat sweep analysis')
  .requiredOption('-c, --config <file>', 'path to combat configuration YAML file')
  .requiredOption('-a, --fighter-a <file>', 'path to fighter A YAML file')
  .requiredOption('-b, --fighter-b <file>', 'path to fighter B YAML file')
  .requiredOption('--stat <name>', 'name of the stat to sweep')
  .requiredOption('--from <number>', 'starting value of the stat', parseNumber('From'))
  .requiredOption('--to <number>', 'ending value of the stat', parseNumber('To'))
  .requiredOption('--step <number>', 'step increment for the stat', parseStep)
  .option('-n, --battles <number>', 'number of battles per data point', parseBattles, 2000)
  .option('--seed <number>', 'random seed (number) for the sweep simulation', parseSeed)
  .option('--json <file>', 'export sweep results to a JSON file')
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

      const result = sweep({
        base: a,
        opponent: b,
        config,
        stat: options.stat,
        from: options.from,
        to: options.to,
        step: options.step,
        battlesPerPoint: options.battles,
        seed,
      });

      console.log(formatSweepTable(result, options.stat));

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
