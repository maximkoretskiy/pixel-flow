import type { LevelDefinition } from '../core/model';
import type { SearchMetrics } from './solver';
import type { DifficultyMetrics } from './types';

export const DIFFICULTY_CONFIG = {
  version: '2',
  weights: {
    orderDependency: 35,
    bufferPressure: 33,
    decisionBranching: 15,
    timingPressure: 7,
    normalizedLength: 10,
  },
} as const;

export interface DifficultyResult {
  readonly score: number;
  readonly version: string;
  readonly components: DifficultyMetrics;
}

function clampUnit(value: number): number {
  return Math.min(1, Math.max(0, value));
}

export function scoreDifficulty(metrics: DifficultyMetrics): DifficultyResult {
  const components: DifficultyMetrics = {
    orderDependency: clampUnit(metrics.orderDependency) * DIFFICULTY_CONFIG.weights.orderDependency,
    bufferPressure: clampUnit(metrics.bufferPressure) * DIFFICULTY_CONFIG.weights.bufferPressure,
    decisionBranching: clampUnit(metrics.decisionBranching) * DIFFICULTY_CONFIG.weights.decisionBranching,
    timingPressure: clampUnit(metrics.timingPressure) * DIFFICULTY_CONFIG.weights.timingPressure,
    normalizedLength: clampUnit(metrics.normalizedLength) * DIFFICULTY_CONFIG.weights.normalizedLength,
  };
  const score = Math.round(
    components.orderDependency +
    components.bufferPressure +
    components.decisionBranching +
    components.timingPressure +
    components.normalizedLength,
  );
  return { score, version: DIFFICULTY_CONFIG.version, components };
}

export function deriveDifficultyMetrics(
  level: LevelDefinition,
  search: SearchMetrics,
): DifficultyMetrics {
  const containerCount = level.stacks.flat().length;
  const occupiedCellCount = level.board.cells.length;
  const safeContainerCount = Math.max(1, containerCount);
  const sizeUnits = Math.max(1, occupiedCellCount + containerCount);
  return {
    orderDependency: clampUnit((search.actionCount - containerCount) / safeContainerCount),
    bufferPressure: clampUnit(search.peakBufferedContainers / 5),
    decisionBranching: clampUnit(Math.max(
      search.deadEnds / Math.max(1, search.generatedBranches),
      (search.generatedBranches / Math.max(1, search.visitedStates) - 1) / 4,
    )),
    timingPressure: clampUnit(search.peakActiveContainers / 5),
    normalizedLength: clampUnit((search.actionCount + search.elapsedMs / 1_000) / sizeUnits),
  };
}
