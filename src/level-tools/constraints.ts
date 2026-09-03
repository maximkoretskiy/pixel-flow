import type { LevelDefinition, TimedLaunch } from '../core/model';
import { replayLevel } from '../core/replay';
import { solveLevel } from './solver';
import type { SolverOutcome } from './solver';
import { validateHumanTiming } from './timing-validator';
import type { LevelRecipe } from './types';

export type FullBufferEvidenceResult =
  | { readonly ok: true }
  | {
      readonly ok: false;
      readonly reason:
        | 'witness-does-not-fill-buffer'
        | 'full-buffer-not-required'
        | 'full-buffer-proof-inconclusive';
    };

export type ConstraintValidationResult =
  | {
      readonly ok: true;
      readonly timingSchedulesChecked: number;
      readonly cappedSearch?: SolverOutcome;
    }
  | {
      readonly ok: false;
      readonly reason:
        | 'human-timing'
        | 'witness-does-not-fill-buffer'
        | 'full-buffer-not-required'
        | 'full-buffer-proof-inconclusive';
    };

export function evaluateFullBufferEvidence(
  witnessPeakBufferedContainers: number,
  cappedSearch: SolverOutcome,
): FullBufferEvidenceResult {
  if (witnessPeakBufferedContainers < 5) {
    return { ok: false, reason: 'witness-does-not-fill-buffer' };
  }
  if (cappedSearch.kind === 'solved') {
    return { ok: false, reason: 'full-buffer-not-required' };
  }
  if (cappedSearch.kind === 'budget-exceeded') {
    return { ok: false, reason: 'full-buffer-proof-inconclusive' };
  }
  return { ok: true };
}

export function validateLevelConstraints(
  level: LevelDefinition,
  recipe: LevelRecipe,
  witness: readonly TimedLaunch[],
): ConstraintValidationResult {
  const timing = validateHumanTiming(level, witness);
  if (!timing.ok) return { ok: false, reason: 'human-timing' };
  if (!recipe.requiresFullBuffer) {
    return { ok: true, timingSchedulesChecked: timing.schedulesChecked };
  }

  const replay = replayLevel(level, witness);
  if (replay.peakBufferedContainers < 5) {
    return { ok: false, reason: 'witness-does-not-fill-buffer' };
  }
  const cappedSearch = solveLevel(level, {
    quantumMs: 50,
    minimumInputSpacingMs: 300,
    maxVisitedStates: recipe.generationBudget.maxVisitedStates,
    maxElapsedMs: recipe.generationBudget.maxElapsedMs,
    maxBufferOccupancy: 4,
  });
  const evidence = evaluateFullBufferEvidence(replay.peakBufferedContainers, cappedSearch);
  if (!evidence.ok) return evidence;
  return {
    ok: true,
    timingSchedulesChecked: timing.schedulesChecked,
    cappedSearch,
  };
}
