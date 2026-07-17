import { expect, test, describe } from 'vitest';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

describe('CLI Integration and Validation', () => {
  const cliPath = path.resolve(__dirname, '../dist/cli/index.js');

  // Skip CLI tests if not built yet
  const hasBuild = fs.existsSync(cliPath);

  test.skipIf(!hasBuild)('fight command fails with invalid seed', () => {
    try {
      execSync(`node "${cliPath}" fight -c examples/game.yaml -a examples/cat-agile.yaml -b examples/dog-tank.yaml --seed abc`, { stdio: 'pipe' });
      expect.fail('Should have failed');
    } catch (err: any) {
      expect(err.status).toBe(1);
      const stderr = err.stderr.toString();
      expect(stderr).toContain('error: option \'--seed <number>\' argument \'abc\' is invalid');
      expect(stderr).toContain('Seed must be a valid integer');
    }
  });

  test.skipIf(!hasBuild)('run command fails with invalid battles count', () => {
    try {
      execSync(`node "${cliPath}" run -c examples/game.yaml -a examples/cat-agile.yaml -b examples/dog-tank.yaml -n abc`, { stdio: 'pipe' });
      expect.fail('Should have failed');
    } catch (err: any) {
      expect(err.status).toBe(1);
      const stderr = err.stderr.toString();
      expect(stderr).toContain('error: option \'-n, --battles <number>\' argument \'abc\' is invalid');
      expect(stderr).toContain('Number of battles must be a positive integer');
    }
  });

  test.skipIf(!hasBuild)('run command fails with negative battles count', () => {
    try {
      execSync(`node "${cliPath}" run -c examples/game.yaml -a examples/cat-agile.yaml -b examples/dog-tank.yaml -n -5`, { stdio: 'pipe' });
      expect.fail('Should have failed');
    } catch (err: any) {
      expect(err.status).toBe(1);
      const stderr = err.stderr.toString();
      expect(stderr).toContain('Number of battles must be a positive integer');
    }
  });

  test.skipIf(!hasBuild)('sweep command fails with invalid step', () => {
    try {
      execSync(`node "${cliPath}" sweep -c examples/game.yaml -a examples/cat-agile.yaml -b examples/dog-tank.yaml --stat ATK --from 10 --to 50 --step -2`, { stdio: 'pipe' });
      expect.fail('Should have failed');
    } catch (err: any) {
      expect(err.status).toBe(1);
      const stderr = err.stderr.toString();
      expect(stderr).toContain('Step must be a positive number');
    }
  });
});
