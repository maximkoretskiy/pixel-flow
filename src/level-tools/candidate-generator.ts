import { assertValidLevel } from '../core/level-validator';
import { SUPPORTED_COLORS } from '../core/model';
import type { BoardDefinition, ColorId, ContainerSeed, LevelDefinition } from '../core/model';
import { compileRecipeBoard } from './ascii-board';
import { mulberry32, stableShuffle } from './random';
import type { LevelRecipe } from './types';

function partitionTotal(total: number, maximumPart: number, random: () => number): number[] {
  const parts: number[] = [];
  let remaining = total;
  while (remaining > 0) {
    const maximum = Math.min(maximumPart, remaining);
    const part = remaining <= maximumPart ? remaining : 1 + Math.floor(random() * maximum);
    parts.push(part);
    remaining -= part;
  }
  return stableShuffle(parts, random);
}

function countColors(board: BoardDefinition): Readonly<Record<ColorId, number>> {
  const counts: Record<ColorId, number> = { blue: 0, green: 0, orange: 0, pink: 0 };
  board.cells.forEach((cell) => { counts[cell.color] += 1; });
  return counts;
}

export function* generateCandidates(recipe: LevelRecipe): Iterable<LevelDefinition> {
  const board = compileRecipeBoard(recipe);
  const counts = countColors(board);
  const random = mulberry32(recipe.seed);
  const maximumPart = 2 * board.width + 2 * board.height;

  for (let candidateIndex = 0;
    candidateIndex < recipe.generationBudget.maxCandidates;
    candidateIndex += 1) {
    const containers = stableShuffle(
      SUPPORTED_COLORS.flatMap((color): ContainerSeed[] =>
        partitionTotal(counts[color], maximumPart, random).map((ammo) => ({ color, ammo }))),
      random,
    );
    const stacks: ContainerSeed[][] = Array.from({ length: 4 }, () => []);
    containers.forEach((container) => {
      const stackIndex = Math.floor(random() * stacks.length);
      stacks[stackIndex].push(container);
    });

    const level: LevelDefinition = {
      id: recipe.id,
      board: {
        width: board.width,
        height: board.height,
        cells: board.cells.map((cell) => ({ ...cell })),
      },
      stacks,
      speedTrackUnitsPerSecond: recipe.speedTrackUnitsPerSecond,
    };
    assertValidLevel(level);
    yield level;
  }
}
