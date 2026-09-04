import { describe, expect, it } from 'vitest';
import { assertValidLevel } from '../core/level-validator';
import { replayLevel } from '../core/replay';
import { scoreDifficulty } from '../level-tools/difficulty';
import { validateHumanTiming } from '../level-tools/timing-validator';
import { LEVEL_CATALOG, getLevelById } from './catalog';

function countInRange(minimum: number, maximum: number): number {
  return LEVEL_CATALOG.filter((entry) =>
    entry.difficulty >= minimum && entry.difficulty <= maximum).length;
}

describe('LEVEL_CATALOG', () => {
  it('contains twelve ordered levels across the required score bands', () => {
    expect(LEVEL_CATALOG).toHaveLength(12);
    expect(LEVEL_CATALOG.map((entry) => entry.ordinal))
      .toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    expect(countInRange(15, 30)).toBe(4);
    expect(countInRange(35, 60)).toBe(4);
    expect(countInRange(65, 85)).toBe(4);
    expect(LEVEL_CATALOG.filter((entry) => entry.requiresFullBuffer).length)
      .toBeGreaterThanOrEqual(3);
  });

  it('ships only structurally valid levels with robust winning witnesses', () => {
    for (const entry of LEVEL_CATALOG) {
      expect(() => assertValidLevel(entry.level), entry.id).not.toThrow();
      expect(replayLevel(entry.level, entry.witness).phase, entry.id).toBe('won');
      expect(validateHumanTiming(entry.level, entry.witness).ok, entry.id).toBe(true);
      expect(scoreDifficulty(entry.metrics).score, entry.id).toBe(entry.difficulty);
      expect(entry.id, entry.id).toBe(entry.level.id);
    }
  });

  it('looks up entries by stable ID', () => {
    const first = LEVEL_CATALOG[0];
    expect(getLevelById(first.id)).toBe(first);
    expect(getLevelById('missing-level')).toBeUndefined();
  });
});
