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

function partitionIntoCount(total: number, count: number, random: () => number): number[] {
  if (!Number.isInteger(count) || count <= 0 || count > total) {
    throw new RangeError(`container count must be an integer from 1 through ${total}`);
  }
  const parts: number[] = [];
  let remaining = total;
  for (let index = 0; index < count - 1; index += 1) {
    const maximum = remaining - (count - index - 1);
    const part = 1 + Math.floor(random() * maximum);
    parts.push(part);
    remaining -= part;
  }
  parts.push(remaining);
  return stableShuffle(parts, random);
}

function countColors(board: BoardDefinition): Readonly<Record<ColorId, number>> {
  const counts: Record<ColorId, number> = { blue: 0, green: 0, orange: 0, pink: 0 };
  board.cells.forEach((cell) => { counts[cell.color] += 1; });
  return counts;
}

function countTemplateColors(stackColors: readonly (readonly ColorId[])[]): Record<ColorId, number> {
  const counts: Record<ColorId, number> = { blue: 0, green: 0, orange: 0, pink: 0 };
  stackColors.flat().forEach((color) => { counts[color] += 1; });
  return counts;
}

export function* generateCandidates(recipe: LevelRecipe): Iterable<LevelDefinition> {
  const board = compileRecipeBoard(recipe);
  const counts = countColors(board);
  const random = mulberry32(recipe.seed);
  const maximumPart = 2 * board.width + 2 * board.height;
  if (recipe.stackColors && recipe.stackColors.length !== 4) {
    throw new RangeError('stackColors must define exactly four stacks');
  }
  const templateCounts = recipe.stackColors ? countTemplateColors(recipe.stackColors) : undefined;

  for (let candidateIndex = 0;
    candidateIndex < recipe.generationBudget.maxCandidates;
    candidateIndex += 1) {
    const containersByColor = Object.fromEntries(
      SUPPORTED_COLORS.map((color) => {
        const requestedCount = templateCounts?.[color] ?? recipe.containerCounts?.[color];
        const parts = requestedCount === 0 && counts[color] === 0
          ? []
          : requestedCount === undefined
          ? partitionTotal(counts[color], maximumPart, random)
          : partitionIntoCount(counts[color], requestedCount, random);
        return [color, parts.map((ammo): ContainerSeed => ({ color, ammo }))] as const;
      }),
    ) as Record<ColorId, ContainerSeed[]>;
    const stacks: ContainerSeed[][] = recipe.stackColors
      ? recipe.stackColors.map((stack) => stack.map((color) => {
        const container = containersByColor[color].shift();
        if (!container) throw new RangeError(`stackColors requests too many ${color} containers`);
        return container;
      }))
      : Array.from({ length: 4 }, () => []);
    if (!recipe.stackColors) {
      const containers = stableShuffle(SUPPORTED_COLORS.flatMap((color) => containersByColor[color]), random);
      containers.forEach((container) => {
        const stackIndex = Math.floor(random() * stacks.length);
        stacks[stackIndex].push(container);
      });
    }

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
