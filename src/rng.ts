export interface Rng {
  random(): number;
  chance(p: number): boolean;
  pick<T>(array: T[]): T;
}

export function createRng(seed: number): Rng {
  let state = seed | 0;
  const random = () => {
    // Mulberry32 algorithm
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), state | 1);
    t = (t + Math.imul(t ^ (t >>> 7), t | 61)) | 0;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  return {
    random,
    chance: (p: number) => random() < p,
    pick: <T>(array: T[]): T => {
      if (array.length === 0) {
        throw new Error('Cannot pick from an empty array');
      }
      const index = Math.floor(random() * array.length);
      return array[index];
    },
  };
}
