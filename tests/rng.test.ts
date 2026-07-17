import { expect, test, describe } from 'vitest';
import { createRng } from '../src/rng';

describe('Deterministic PRNG (mulberry32)', () => {
  test('same seed gives identical sequence', () => {
    const rng1 = createRng(42);
    const rng2 = createRng(42);

    const seq1 = Array.from({ length: 100 }, () => rng1.random());
    const seq2 = Array.from({ length: 100 }, () => rng2.random());

    expect(seq1).toEqual(seq2);
  });

  test('different seed gives different sequence', () => {
    const rng1 = createRng(42);
    const rng2 = createRng(43);

    const seq1 = Array.from({ length: 10 }, () => rng1.random());
    const seq2 = Array.from({ length: 10 }, () => rng2.random());

    expect(seq1).not.toEqual(seq2);
  });

  test('chance(0) is always false, chance(1) is always true', () => {
    const rng = createRng(12345);
    for (let i = 0; i < 100; i++) {
      expect(rng.chance(0)).toBe(false);
      expect(rng.chance(1)).toBe(true);
    }
  });

  test('chance(p) follows reasonable probabilities', () => {
    const rng = createRng(999);
    let trueCount = 0;
    const total = 10000;
    for (let i = 0; i < total; i++) {
      if (rng.chance(0.3)) {
        trueCount++;
      }
    }
    const rate = trueCount / total;
    // Expected rate ~0.3. Let's verify it is within a reasonable range (0.27 to 0.33)
    expect(rate).toBeGreaterThan(0.27);
    expect(rate).toBeLessThan(0.33);
  });

  test('pick(array) selects elements from the array', () => {
    const rng = createRng(888);
    const items = ['apple', 'banana', 'cherry'];
    const chosen = Array.from({ length: 100 }, () => rng.pick(items));

    for (const item of chosen) {
      expect(items).toContain(item);
    }

    // Check we get different items (not just the same one forever)
    const uniqueChosen = new Set(chosen);
    expect(uniqueChosen.size).toBe(3);
  });

  test('pick(array) throws on empty array', () => {
    const rng = createRng(111);
    expect(() => rng.pick([])).toThrow('Cannot pick from an empty array');
  });
});
