import { describe, expect, it } from 'vitest';
import type { LevelDefinition } from '../core/model';
import { replayLevel } from '../core/replay';
import { solveLevel } from './solver';

const ONE_PIXEL_LEVEL: LevelDefinition = {
  id: 'solver-one-pixel',
  board: {
    width: 1,
    height: 1,
    cells: [{ x: 0, y: 0, color: 'blue' }],
  },
  stacks: [[{ color: 'blue', ammo: 1 }], [], [], []],
  speedTrackUnitsPerSecond: 60,
};

const FORCED_RETURN_LEVEL: LevelDefinition = {
  id: 'solver-forced-return',
  board: {
    width: 3,
    height: 3,
    cells: [
      { x: 1, y: 1, color: 'blue' },
      { x: 1, y: 0, color: 'orange' },
      { x: 2, y: 1, color: 'orange' },
      { x: 1, y: 2, color: 'orange' },
      { x: 0, y: 1, color: 'orange' },
    ],
  },
  stacks: [[
    { color: 'blue', ammo: 1 },
    { color: 'orange', ammo: 4 },
  ], [], [], []],
  speedTrackUnitsPerSecond: 60,
};

const OPTIONS = {
  quantumMs: 50 as const,
  minimumInputSpacingMs: 300,
  maxVisitedStates: 1_000,
  maxElapsedMs: 1_000,
};

describe('solveLevel', () => {
  it('finds a replay that wins under production rules', () => {
    const outcome = solveLevel(ONE_PIXEL_LEVEL, OPTIONS);

    expect(outcome.kind).toBe('solved');
    if (outcome.kind !== 'solved') return;
    expect(outcome.witness).toEqual([
      { atMs: 0, source: { kind: 'stack', index: 0 } },
    ]);
    expect(replayLevel(ONE_PIXEL_LEVEL, outcome.witness).phase).toBe('won');
  });

  it('exhausts the finite model when every playable launch violates the buffer cap', () => {
    const outcome = solveLevel(FORCED_RETURN_LEVEL, {
      ...OPTIONS,
      maxBufferOccupancy: 0,
    });

    expect(outcome.kind).toBe('exhausted');
    expect(outcome.metrics.visitedStates).toBeGreaterThan(0);
  });

  it('distinguishes search budget exhaustion from model exhaustion', () => {
    const outcome = solveLevel(FORCED_RETURN_LEVEL, {
      ...OPTIONS,
      maxVisitedStates: 1,
    });

    expect(outcome.kind).toBe('budget-exceeded');
    expect(outcome.metrics.visitedStates).toBe(1);
  });

  it('can require a minimum observed buffer peak', () => {
    const outcome = solveLevel(ONE_PIXEL_LEVEL, {
      ...OPTIONS,
      requiredPeakBufferOccupancy: 1,
    });

    expect(outcome.kind).toBe('exhausted');
  });
});
