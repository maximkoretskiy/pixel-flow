import { describe, expect, it } from 'vitest';
import type { LevelDefinition } from '../core/model';
import {
  deriveDifficultyMetrics,
  scoreDifficulty,
} from './difficulty';
import type { SearchMetrics } from './solver';
import type { DifficultyMetrics } from './types';

const LEVEL: LevelDefinition = {
  id: 'difficulty-fixture',
  board: {
    width: 2,
    height: 2,
    cells: [
      { x: 0, y: 0, color: 'blue' },
      { x: 1, y: 1, color: 'green' },
    ],
  },
  stacks: [[{ color: 'blue', ammo: 1 }], [{ color: 'green', ammo: 1 }], [], []],
  speedTrackUnitsPerSecond: 10,
};

describe('scoreDifficulty', () => {
  it('applies versioned weights and rounds only the final score', () => {
    const metrics: DifficultyMetrics = {
      orderDependency: 0.5,
      bufferPressure: 1,
      decisionBranching: 0.25,
      timingPressure: 0.5,
      normalizedLength: 0,
    };

    expect(scoreDifficulty(metrics)).toEqual({
      score: 58,
      version: '2',
      components: {
        orderDependency: 17.5,
        bufferPressure: 33,
        decisionBranching: 3.75,
        timingPressure: 3.5,
        normalizedLength: 0,
      },
    });
  });

  it('clamps every component before weighting', () => {
    const above: DifficultyMetrics = {
      orderDependency: 2,
      bufferPressure: 2,
      decisionBranching: 2,
      timingPressure: 2,
      normalizedLength: 2,
    };
    const below: DifficultyMetrics = {
      orderDependency: -1,
      bufferPressure: -1,
      decisionBranching: -1,
      timingPressure: -1,
      normalizedLength: -1,
    };

    expect(scoreDifficulty(above).score).toBe(100);
    expect(scoreDifficulty(below).score).toBe(0);
  });
});

describe('deriveDifficultyMetrics', () => {
  it('normalizes search pressure by level and solution size', () => {
    const search: SearchMetrics = {
      visitedStates: 20,
      generatedBranches: 10,
      deadEnds: 5,
      peakActiveContainers: 4,
      peakBufferedContainers: 3,
      actionCount: 4,
      elapsedMs: 2_000,
    };

    expect(deriveDifficultyMetrics(LEVEL, search)).toEqual({
      orderDependency: 1,
      bufferPressure: 0.6,
      decisionBranching: 0.5,
      timingPressure: 0.8,
      normalizedLength: 1,
    });
  });

  it('counts alternative search branches even before dead ends appear', () => {
    const search: SearchMetrics = {
      visitedStates: 10,
      generatedBranches: 30,
      deadEnds: 0,
      peakActiveContainers: 1,
      peakBufferedContainers: 0,
      actionCount: 2,
      elapsedMs: 1_000,
    };

    expect(deriveDifficultyMetrics(LEVEL, search).decisionBranching).toBe(0.5);
  });
});
