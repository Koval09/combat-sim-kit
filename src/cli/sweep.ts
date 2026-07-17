import { Command } from 'commander';
import fs from 'fs';
import { loadConfig } from '../config';
import { loadFighter } from '../fighter';
import { sweep } from '../sweep';
import { formatSweepTable } from './formatter';

export const sweepCommand = new Command('sweep')
  .description('Run stat sweep analysis')
  .requiredOption('-c, --config <file>', 'path to combat configuration YAML file')
  .requiredOption('-a, --fighter-a <file>', 'path to fighter A YAML file')
  .requiredOption('-b, --fighter-b <file>', 'path to fighter B YAML file')
  .requiredOption('--stat <name>', 'name of the stat to sweep')
  .requiredOption('--from <number>', 'starting value of the stat', (val) => parseFloat(val))
  .requiredOption('--to <number>', 'ending value of the stat', (val) => parseFloat(val))
  .requiredOption('--step <number>', 'step increment for the stat', (val) => parseFloat(val))
  .option('-n, --battles <number>', 'number of battles per data point', (val) => parseInt(val, 10), 2000)
  .option('--seed <number>', 'random seed (number) for the sweep simulation', (val) => parseInt(val, 10))
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
    } catch (err: any) {
      console.error(`Error: ${err.message}`);
      process.exit(1);
    }
  });
