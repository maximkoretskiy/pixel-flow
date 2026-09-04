import type { LevelDefinition, TimedLaunch } from '../core/model';
import { replayLevel } from '../core/replay';
import { createBoard } from '../core/board';
import { buildRoute } from '../core/route';
import type { Ray } from '../core/route';
import { traceFirstOccupied } from '../core/targeting';
import { solveLevel } from './solver';
import type { SolverOutcome } from './solver';
import { HUMAN_MINIMUM_INPUT_SPACING_MS, validateHumanTiming } from './timing-validator';
import type { FullBufferCertificate, LevelRecipe } from './types';

export type FullBufferEvidenceResult =
  | { readonly ok: true }
  | {
      readonly ok: false;
      readonly reason:
        | 'witness-does-not-fill-buffer'
        | 'full-buffer-not-required'
        | 'full-buffer-proof-inconclusive';
    };

export type CertificateVerificationResult =
  | { readonly ok: true }
  | {
      readonly ok: false;
      readonly reason:
        | 'invalid-prefix'
        | 'gate-container-is-not-unique'
        | 'blocked-color-is-exposed'
        | 'return-not-forced-before-next-input'
        | 'alternative-stack-source';
    };

function rayContainsColor(
  level: LevelDefinition,
  ray: Ray,
  color: FullBufferCertificate['blockedColor'],
): boolean {
  return level.board.cells.some((cell) => {
    if (cell.color !== color) return false;
    return ray.edge === 'top' || ray.edge === 'bottom'
      ? cell.x === ray.index
      : cell.y === ray.index;
  });
}

export function verifyFullBufferCertificate(
  level: LevelDefinition,
  certificate: FullBufferCertificate,
): CertificateVerificationResult {
  const stack = level.stacks[certificate.stackIndex];
  const prefix = stack?.slice(0, certificate.blockedPrefixCount) ?? [];
  const gateContainer = stack?.[certificate.blockedPrefixCount];
  if (prefix.length !== certificate.blockedPrefixCount ||
      prefix.some((container) => container.color !== certificate.blockedColor) ||
      gateContainer?.color !== certificate.gateColor) {
    return { ok: false, reason: 'invalid-prefix' };
  }
  const gateContainers = level.stacks.flat()
    .filter((container) => container.color === certificate.gateColor);
  if (gateContainers.length !== 1) {
    return { ok: false, reason: 'gate-container-is-not-unique' };
  }
  if (level.stacks.some((candidate, index) => index !== certificate.stackIndex && candidate.length > 0)) {
    return { ok: false, reason: 'alternative-stack-source' };
  }

  const lapDurationMs = buildRoute(level.board.width, level.board.height).length /
    level.speedTrackUnitsPerSecond * 1_000;
  if (lapDurationMs > HUMAN_MINIMUM_INPUT_SPACING_MS) {
    return { ok: false, reason: 'return-not-forced-before-next-input' };
  }

  const board = createBoard(level.board);
  for (const point of buildRoute(level.board.width, level.board.height).controlPoints) {
    if (!rayContainsColor(level, point.ray, certificate.blockedColor)) continue;
    if (traceFirstOccupied(board, point.ray)?.color !== certificate.gateColor) {
      return { ok: false, reason: 'blocked-color-is-exposed' };
    }
  }
  return { ok: true };
}

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
        | 'full-buffer-proof-inconclusive'
        | 'invalid-full-buffer-certificate';
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
  if (recipe.fullBufferCertificate) {
    const certificate = verifyFullBufferCertificate(level, recipe.fullBufferCertificate);
    if (!certificate.ok) return { ok: false, reason: 'invalid-full-buffer-certificate' };
    return { ok: true, timingSchedulesChecked: timing.schedulesChecked };
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
