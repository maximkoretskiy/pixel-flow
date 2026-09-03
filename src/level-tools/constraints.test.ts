import { describe, expect, it } from 'vitest';
import type { LevelDefinition, TimedLaunch } from '../core/model';
import {
  evaluateFullBufferEvidence,
  validateLevelConstraints,
} from './constraints';
import type { SearchMetrics, SolverOutcome } from './solver';
import type { LevelRecipe } from './types';

const LEVEL: LevelDefinition = {
  id: 'constraint-one-pixel',
  board: { width: 1, height: 1, cells: [{ x: 0, y: 0, color: 'blue' }] },
  stacks: [[{ color: 'blue', ammo: 1 }], [], [], []],
  speedTrackUnitsPerSecond: 60,
};

const WITNESS: readonly TimedLaunch[] = [
  { atMs: 300, source: { kind: 'stack', index: 0 } },
];

const RECIPE: LevelRecipe = {
  id: LEVEL.id,
  title: 'Constraint fixture',
  board: { kind: 'programmed', build: () => LEVEL.board },
  seed: 1,
  targetDifficulty: 10,
  difficultyTolerance: 5,
  generationBudget: {
    maxCandidates: 1,
    maxVisitedStates: 100,
    maxElapsedMs: 1_000,
  },
  speedTrackUnitsPerSecond: 60,
};

const METRICS: SearchMetrics = {
  visitedStates: 10,
  generatedBranches: 12,
  deadEnds: 3,
  peakActiveContainers: 1,
  peakBufferedContainers: 0,
  actionCount: 1,
  elapsedMs: 500,
};

function outcome(kind: SolverOutcome['kind']): SolverOutcome {
  return kind === 'solved'
    ? { kind, witness: WITNESS, metrics: METRICS }
    : { kind, metrics: METRICS };
}

describe('evaluateFullBufferEvidence', () => {
  it('accepts a five-slot witness only after capped search exhausts', () => {
    expect(evaluateFullBufferEvidence(5, outcome('exhausted'))).toEqual({ ok: true });
  });

  it('rejects a level that still has a capped winning path', () => {
    expect(evaluateFullBufferEvidence(5, outcome('solved'))).toEqual({
      ok: false,
      reason: 'full-buffer-not-required',
    });
  });

  it('does not treat a search budget failure as proof', () => {
    expect(evaluateFullBufferEvidence(5, outcome('budget-exceeded'))).toEqual({
      ok: false,
      reason: 'full-buffer-proof-inconclusive',
    });
  });
});

describe('validateLevelConstraints', () => {
  it('accepts a robust ordinary level without capped search', () => {
    expect(validateLevelConstraints(LEVEL, RECIPE, WITNESS)).toEqual({
      ok: true,
      timingSchedulesChecked: 6,
    });
  });

  it('rejects a required-full-buffer witness whose peak is below five', () => {
    expect(validateLevelConstraints(
      LEVEL,
      { ...RECIPE, requiresFullBuffer: true },
      WITNESS,
    )).toEqual({
      ok: false,
      reason: 'witness-does-not-fill-buffer',
    });
  });
});
