import type { BoardDefinition, ColorId } from '../../src/core/model';
import type { LevelRecipe } from '../../src/level-tools/types';

const SYMBOLS = { B: 'blue', G: 'green', O: 'orange', P: 'pink' } as const;
const DEFAULT_BUDGET = {
  maxCandidates: 4,
  maxVisitedStates: 250_000,
  maxElapsedMs: 12_000,
} as const;

function asciiRecipe(
  id: string,
  title: string,
  rows: readonly string[],
  seed: number,
  targetDifficulty: number,
  containerCounts?: LevelRecipe['containerCounts'],
): LevelRecipe {
  return {
    id,
    title,
    board: { kind: 'ascii', rows, symbols: SYMBOLS },
    seed,
    targetDifficulty,
    difficultyTolerance: 2,
    containerCounts,
    generationBudget: DEFAULT_BUDGET,
    speedTrackUnitsPerSecond: 30,
  };
}

function solidBoard(size: number, color: ColorId): BoardDefinition {
  return {
    width: size,
    height: size,
    cells: Array.from({ length: size }, (_, y) =>
      Array.from({ length: size }, (_, x) => ({ x, y, color }))).flat(),
  };
}

function shellBoard(size: number): BoardDefinition {
  return {
    width: size,
    height: size,
    cells: Array.from({ length: size }, (_, y) =>
      Array.from({ length: size }, (_, x) => ({
        x,
        y,
        color: x === 0 || x === size - 1 || y === 0 || y === size - 1
          ? 'orange' as const
          : 'blue' as const,
      }))).flat(),
  };
}

function solidRecipe(id: string, title: string, size: number, color: ColorId, seed: number): LevelRecipe {
  return {
    id,
    title,
    board: { kind: 'programmed', build: () => solidBoard(size, color) },
    seed,
    targetDifficulty: 45,
    difficultyTolerance: 2,
    stackColors: [[color], [], [], []],
    generationBudget: DEFAULT_BUDGET,
    speedTrackUnitsPerSecond: 30,
  };
}

function pressureRecipe(
  id: string,
  title: string,
  size: number,
  blockedContainers: 4 | 5,
  seed: number,
): LevelRecipe {
  const requiresFullBuffer = blockedContainers === 5;
  return {
    id,
    title,
    board: { kind: 'programmed', build: () => shellBoard(size) },
    seed,
    targetDifficulty: requiresFullBuffer ? 72 : 65,
    difficultyTolerance: 5,
    stackColors: [[...Array.from({ length: blockedContainers }, () => 'blue' as const), 'orange'], [], [], []],
    requiresFullBuffer,
    fullBufferCertificate: requiresFullBuffer ? {
      kind: 'blocked-prefix',
      stackIndex: 0,
      blockedPrefixCount: 5,
      blockedColor: 'blue',
      gateColor: 'orange',
    } : undefined,
    generationBudget: DEFAULT_BUDGET,
    // A lap is 250 ms: every blocked container returns before the next valid 300 ms input.
    speedTrackUnitsPerSecond: 16 * size,
  };
}

export const RECIPES: readonly LevelRecipe[] = [
  asciiRecipe('little-flower', 'Little Flower', ['..P..', '.PGP.', 'PGBGP', '.PGP.', '..O..'], 107, 20),
  asciiRecipe('woven-square', 'Woven Square', [
    'BGBGB',
    'GOPPG',
    'BPOPB',
    'GPOOG',
    'BGBGB',
  ], 102, 28, { blue: 3, green: 3, orange: 2, pink: 2 }),
  asciiRecipe('nested-diamond', 'Nested Diamond', [
    '..B..',
    '.BGB.',
    'BGOGB',
    '.BGB.',
    '..P..',
  ], 103, 28, { blue: 2, green: 2 }),
  asciiRecipe('sunflower', 'Sunflower', [
    '..PPP..',
    '.POOOP.',
    'POOOOOP',
    'POOBOOP',
    'POOOOOP',
    '.POOOP.',
    '..G.G..',
  ], 108, 28),
  solidRecipe('blue-layers', 'Blue Layers', 3, 'blue', 105),
  solidRecipe('green-layers', 'Green Layers', 4, 'green', 106),
  solidRecipe('pink-layers', 'Pink Layers', 5, 'pink', 107),
  solidRecipe('orange-layers', 'Orange Layers', 6, 'orange', 108),
  pressureRecipe('pressure-ring', 'Pressure Ring', 9, 4, 109),
  pressureRecipe('blue-vault', 'Blue Vault', 5, 5, 110),
  pressureRecipe('deep-vault', 'Deep Vault', 7, 5, 111),
  pressureRecipe('grand-vault', 'Grand Vault', 9, 5, 112),
];
