#!/usr/bin/env node
import { Command } from 'commander';
import { fightCommand } from './fight';
import { runCommand } from './run';
import { sweepCommand } from './sweep';

const program = new Command();

program
  .name('combat-sim')
  .description('Monte-Carlo combat balance simulator for turn-based games')
  .version('0.1.0')
  .addCommand(fightCommand)
  .addCommand(runCommand)
  .addCommand(sweepCommand);

program.parse(process.argv);
