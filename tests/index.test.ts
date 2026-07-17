import { expect, test } from 'vitest';
import { createRng } from '../src/index';

test('index API exports', () => {
  expect(createRng).toBeDefined();
});
