import { describe, expect, it } from 'vitest';
import type { LevelDefinition, TimedLaunch } from '../core/model';
import {
  evaluateFullBufferEvidence,
  verifyFullBufferCertificate,
  validateLevelConstraints,
} from './constraints';
import type { SearchMetrics, SolverOutcome } from './solver';
import type { LevelRecipe } from './types';
import type { FullBufferCertificate } from './types';

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

describe('verifyFullBufferCertificate', () => {
  const certificate: FullBufferCertificate = {
    kind: 'blocked-prefix',
    stackIndex: 0,
    blockedPrefixCount: 5,
    blockedColor: 'blue',
    gateColor: 'orange',
  };
  const shellCells = Array.from({ length: 5 }, (_, y) =>
    Array.from({ length: 5 }, (_, x) => ({
      x,
      y,
      color: x === 0 || x === 4 || y === 0 || y === 4 ? 'orange' as const : 'blue' as const,
    }))).flat();
  const certifiedLevel: LevelDefinition = {
    id: 'certified-shell',
    board: { width: 5, height: 5, cells: shellCells },
    stacks: [[
      ...Array.from({ length: 4 }, () => ({ color: 'blue' as const, ammo: 2 })),
      { color: 'blue', ammo: 1 },
      { color: 'orange', ammo: 16 },
    ], [], [], []],
    speedTrackUnitsPerSecond: 80,
  };

  it('accepts a fully gated blocked prefix', () => {
    expect(verifyFullBufferCertificate(certifiedLevel, certificate)).toEqual({ ok: true });
  });

  it('rejects a blocked pixel exposed through the gate shell', () => {
    const levelWithGap: LevelDefinition = {
      ...certifiedLevel,
      board: {
        ...certifiedLevel.board,
        cells: certifiedLevel.board.cells.filter((cell) => !(cell.x === 2 && cell.y === 4)),
      },
      stacks: [[
        ...certifiedLevel.stacks[0].slice(0, -1),
        { color: 'orange', ammo: 15 },
      ], [], [], []],
    };

    expect(verifyFullBufferCertificate(levelWithGap, certificate)).toEqual({
      ok: false,
      reason: 'blocked-color-is-exposed',
    });
  });

  it('rejects a lap too slow to force a return before the next input', () => {
    expect(verifyFullBufferCertificate(
      { ...certifiedLevel, speedTrackUnitsPerSecond: 10 },
      certificate,
    )).toEqual({ ok: false, reason: 'return-not-forced-before-next-input' });
  });

  it('rejects alternative stacks outside the certified sequence', () => {
    expect(verifyFullBufferCertificate(
      { ...certifiedLevel, stacks: [certifiedLevel.stacks[0], [{ color: 'blue', ammo: 1 }], [], []] },
      certificate,
    )).toEqual({ ok: false, reason: 'alternative-stack-source' });
  });
});
