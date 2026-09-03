import { describe, expect, it } from 'vitest';
import { compileAsciiBoard, compileRecipeBoard } from './ascii-board';
import type { LevelRecipe } from './types';

const BASE_RECIPE: Omit<LevelRecipe, 'board'> = {
  id: 'test-recipe',
  title: 'Test recipe',
  seed: 42,
  targetDifficulty: 25,
  difficultyTolerance: 5,
  generationBudget: {
    maxCandidates: 10,
    maxVisitedStates: 1_000,
    maxElapsedMs: 10_000,
  },
  speedTrackUnitsPerSecond: 30,
};

describe('compileAsciiBoard', () => {
  it('compiles mapped colors and omits dot cells', () => {
    expect(compileAsciiBoard(['B.', '.G'], { B: 'blue', G: 'green' })).toEqual({
      width: 2,
      height: 2,
      cells: [
        { x: 0, y: 0, color: 'blue' },
        { x: 1, y: 1, color: 'green' },
      ],
    });
  });

  it('rejects an empty row collection', () => {
    expect(() => compileAsciiBoard([], { B: 'blue' })).toThrow('rows must contain at least one row');
  });

  it('rejects rows with unequal widths', () => {
    expect(() => compileAsciiBoard(['BB', 'B'], { B: 'blue' })).toThrow('rows must have equal width');
  });

  it('identifies an unsupported symbol by coordinate', () => {
    expect(() => compileAsciiBoard(['BX'], { B: 'blue' })).toThrow("unsupported symbol 'X' at 1,0");
  });
});

describe('compileRecipeBoard', () => {
  it('accepts deterministic programmed output', () => {
    const recipe: LevelRecipe = {
      ...BASE_RECIPE,
      board: {
        kind: 'programmed',
        build: () => ({
          width: 1,
          height: 1,
          cells: [{ x: 0, y: 0, color: 'pink' }],
        }),
      },
    };

    expect(compileRecipeBoard(recipe)).toEqual({
      width: 1,
      height: 1,
      cells: [{ x: 0, y: 0, color: 'pink' }],
    });
  });

  it('rejects non-deterministic programmed output', () => {
    let width = 0;
    const recipe: LevelRecipe = {
      ...BASE_RECIPE,
      board: {
        kind: 'programmed',
        build: () => ({ width: width += 1, height: 1, cells: [] }),
      },
    };

    expect(() => compileRecipeBoard(recipe)).toThrow('programmed board must be deterministic');
  });

  it('rejects duplicate programmed coordinates', () => {
    const recipe: LevelRecipe = {
      ...BASE_RECIPE,
      board: {
        kind: 'programmed',
        build: () => ({
          width: 1,
          height: 1,
          cells: [
            { x: 0, y: 0, color: 'blue' },
            { x: 0, y: 0, color: 'green' },
          ],
        }),
      },
    };

    expect(() => compileRecipeBoard(recipe)).toThrow('duplicates coordinate 0,0');
  });
});
