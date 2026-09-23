/**
 * Mulberry32 Seeded Pseudo-Random Number Generator (PRNG)
 * 
 * Provides deterministic simulation replayability across client, web worker,
 * and child-world generation.
 */

export class SeededPRNG {
  private state: number;

  constructor(seed: number = 1337) {
    this.state = seed >>> 0;
  }

  /**
   * Reseeds the generator.
   */
  public seed(newSeed: number): void {
    this.state = newSeed >>> 0;
  }

  /**
   * Generates a deterministic float in [0, 1).
   */
  public next(): number {
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /**
   * Generates a deterministic integer in [min, max] inclusive.
   */
  public nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  /**
   * Generates a deterministic float in [min, max).
   */
  public nextFloat(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  /**
   * Randomly chooses one item from an array deterministically.
   */
  public choice<T>(items: readonly T[]): T {
    if (items.length === 0) {
      throw new Error("Cannot choose from empty array");
    }
    const idx = Math.floor(this.next() * items.length);
    return items[idx];
  }

  /**
   * Deterministically shuffles an array (Fisher-Yates).
   */
  public shuffle<T>(items: T[]): T[] {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }
}

// Global default deterministic instance initialized with seed
export const globalPRNG = new SeededPRNG(424242);
