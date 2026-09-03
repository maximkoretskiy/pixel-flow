import { describe, expect, it } from 'vitest';
import { createBoard } from './board';
import { buildRoute } from './route';
import { traceFirstOccupied } from './targeting';

describe('targeting', () => {
  const board = createBoard({
    width: 3,
    height: 3,
    cells: [
      { x: 1, y: 1, color: 'pink' },
      { x: 1, y: 2, color: 'blue' },
    ],
  });

  it('skips empty cells and stops at the first occupied pixel', () => {
    expect(traceFirstOccupied(board, { edge: 'top', index: 1 })).toEqual({ x: 1, y: 1, color: 'pink' });
    expect(traceFirstOccupied(board, { edge: 'bottom', index: 1 })).toEqual({ x: 1, y: 2, color: 'blue' });
  });

  it('returns null for an empty ray', () => {
    expect(traceFirstOccupied(board, { edge: 'left', index: 0 })).toBeNull();
  });

  it('builds clockwise control points starting from the bottom-left corner', () => {
    const route = buildRoute(2, 1);
    expect(route.length).toBe(6);
    expect(route.controlPoints.map(({ ray }) => ray)).toEqual([
      { edge: 'left', index: 0 },
      { edge: 'top', index: 0 }, { edge: 'top', index: 1 },
      { edge: 'right', index: 0 },
      { edge: 'bottom', index: 1 }, { edge: 'bottom', index: 0 },
    ]);
  });
});
