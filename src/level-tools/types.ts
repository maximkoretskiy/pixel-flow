import type {
  BoardDefinition,
  ColorId,
  LevelDefinition,
  TimedLaunch,
} from '../core/model';

export interface GenerationBudget {
  readonly maxCandidates: number;
  readonly maxVisitedStates: number;
  readonly maxElapsedMs: number;
}

export type BoardRecipe =
  | {
      readonly kind: 'ascii';
      readonly rows: readonly string[];
      readonly symbols: Readonly<Record<string, ColorId>>;
    }
  | {
      readonly kind: 'programmed';
      readonly build: () => BoardDefinition;
    };

export interface LevelRecipe {
  readonly id: string;
  readonly title: string;
  readonly board: BoardRecipe;
  readonly seed: number;
  readonly targetDifficulty: number;
  readonly difficultyTolerance: number;
  readonly containerCounts?: Readonly<Partial<Record<ColorId, number>>>;
  readonly stackColors?: readonly (readonly ColorId[])[];
  readonly requiresFullBuffer?: boolean;
  readonly fullBufferCertificate?: FullBufferCertificate;
  readonly generationBudget: GenerationBudget;
  readonly speedTrackUnitsPerSecond: number;
}

export interface FullBufferCertificate {
  readonly kind: 'blocked-prefix';
  readonly stackIndex: number;
  readonly blockedPrefixCount: 5;
  readonly blockedColor: ColorId;
  readonly gateColor: ColorId;
}

export interface DifficultyMetrics {
  readonly orderDependency: number;
  readonly bufferPressure: number;
  readonly decisionBranching: number;
  readonly timingPressure: number;
  readonly normalizedLength: number;
}

export interface LevelArtifact {
  readonly id: string;
  readonly level: LevelDefinition;
  readonly title: string;
  readonly ordinal: number;
  readonly difficulty: number;
  readonly difficultyVersion: string;
  readonly metrics: DifficultyMetrics;
  readonly recipeId: string;
  readonly seed: number;
  readonly requiresFullBuffer: boolean;
  readonly witness: readonly TimedLaunch[];
}
