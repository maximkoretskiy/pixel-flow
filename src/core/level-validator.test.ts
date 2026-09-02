import { describe, expect, it } from 'vitest';
import type { LevelDefinition } from './model';
import { assertValidLevel, LevelValidationError } from './level-validator';

const valid: LevelDefinition = {
  id: 'test',
  board: { width: 2, height: 2, cells: [{ x: 0, y: 0, color: 'blue' }] },
  stacks: [[{ color: 'blue', ammo: 1 }], [], [], []],
  speedTrackUnitsPerSecond: 6,
};

describe('assertValidLevel', () => {
  it('accepts a valid four-stack level', () => {
    expect(() => assertValidLevel(valid)).not.toThrow();
  });

  it('reports duplicate cells, unknown colors, bad ammo, and stack count', () => {
    const invalid = {
      ...valid,
      board: {
        ...valid.board,
        cells: [
          { x: 0, y: 0, color: 'blue' },
          { x: 0, y: 0, color: 'ultraviolet' },
        ],
      },
      stacks: [[{ color: 'blue', ammo: 0 }]],
    } as unknown as LevelDefinition;

    expect(() => assertValidLevel(invalid)).toThrow(LevelValidationError);
    try {
      assertValidLevel(invalid);
    } catch (error) {
      expect((error as LevelValidationError).issues).toEqual(expect.arrayContaining([
        'board.cells[1] duplicates coordinate 0,0',
        'board.cells[1].color is unsupported: ultraviolet',
        'stacks must contain exactly 4 stacks',
        'stacks[0][0].ammo must be a positive integer',
      ]));
    }
  });
});
