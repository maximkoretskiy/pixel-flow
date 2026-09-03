import { describe, expect, it } from 'vitest';
import { assertValidLevel } from '../core/level-validator';
import { SUPPORTED_COLORS } from '../core/model';
import { generateCandidates } from './candidate-generator';
import type { LevelRecipe } from './types';

const RECIPE: LevelRecipe = {
  id: 'candidate-test',
  title: 'Candidate test',
  board: {
    kind: 'ascii',
    rows: [
      'BBG',
      'OPB',
      'GOP',
    ],
    symbols: { B: 'blue', G: 'green', O: 'orange', P: 'pink' },
  },
  seed: 8675309,
  targetDifficulty: 50,
  difficultyTolerance: 10,
  generationBudget: {
    maxCandidates: 6,
    maxVisitedStates: 1_000,
    maxElapsedMs: 10_000,
  },
  speedTrackUnitsPerSecond: 30,
};

describe('generateCandidates', () => {
  it('returns the same candidates for the same seed', () => {
    expect([...generateCandidates(RECIPE)]).toEqual([...generateCandidates(RECIPE)]);
  });

  it('changes candidate data when the seed changes', () => {
    const original = [...generateCandidates(RECIPE)];
    const changed = [...generateCandidates({ ...RECIPE, seed: RECIPE.seed + 1 })];

    expect(changed).not.toEqual(original);
  });

  it('produces structurally valid levels that conserve each color total', () => {
    const expectedCounts = { blue: 3, green: 2, orange: 2, pink: 2 };

    for (const candidate of generateCandidates(RECIPE)) {
      expect(() => assertValidLevel(candidate)).not.toThrow();
      for (const color of SUPPORTED_COLORS) {
        const ammo = candidate.stacks.flat()
          .filter((container) => container.color === color)
          .reduce((sum, container) => sum + container.ammo, 0);
        expect(ammo).toBe(expectedCounts[color]);
      }
    }
  });

  it('stops at the configured candidate budget', () => {
    expect([...generateCandidates(RECIPE)]).toHaveLength(6);
  });
});
