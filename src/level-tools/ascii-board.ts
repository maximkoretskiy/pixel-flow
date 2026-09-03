import { SUPPORTED_COLORS } from '../core/model';
import type { BoardDefinition, ColorId, PixelSeed } from '../core/model';
import type { LevelRecipe } from './types';

export function compileAsciiBoard(
  rows: readonly string[],
  symbols: Readonly<Record<string, ColorId>>,
): BoardDefinition {
  if (rows.length === 0) throw new Error('rows must contain at least one row');
  const width = [...rows[0]].length;
  if (width === 0) throw new Error('rows must not be empty');
  if (rows.some((row) => [...row].length !== width)) throw new Error('rows must have equal width');

  const cells: PixelSeed[] = [];
  rows.forEach((row, y) => [...row].forEach((symbol, x) => {
    if (symbol === '.') return;
    const color = symbols[symbol];
    if (!color) throw new Error(`unsupported symbol '${symbol}' at ${x},${y}`);
    cells.push({ x, y, color });
  }));
  return { width, height: rows.length, cells };
}

export function assertValidBoardDefinition(board: BoardDefinition): void {
  if (!Number.isInteger(board.width) || board.width <= 0) {
    throw new Error('board.width must be a positive integer');
  }
  if (!Number.isInteger(board.height) || board.height <= 0) {
    throw new Error('board.height must be a positive integer');
  }

  const supportedColors = new Set<string>(SUPPORTED_COLORS);
  const occupied = new Set<string>();
  board.cells.forEach((cell, index) => {
    const key = `${cell.x},${cell.y}`;
    if (!Number.isInteger(cell.x) || !Number.isInteger(cell.y) ||
        cell.x < 0 || cell.y < 0 || cell.x >= board.width || cell.y >= board.height) {
      throw new Error(`board.cells[${index}] is outside the board`);
    }
    if (occupied.has(key)) throw new Error(`board.cells[${index}] duplicates coordinate ${key}`);
    if (!supportedColors.has(cell.color)) {
      throw new Error(`board.cells[${index}].color is unsupported: ${cell.color}`);
    }
    occupied.add(key);
  });
}

export function compileRecipeBoard(recipe: LevelRecipe): BoardDefinition {
  const board = recipe.board.kind === 'ascii'
    ? compileAsciiBoard(recipe.board.rows, recipe.board.symbols)
    : recipe.board.build();

  if (recipe.board.kind === 'programmed') {
    const repeated = recipe.board.build();
    if (JSON.stringify(board) !== JSON.stringify(repeated)) {
      throw new Error('programmed board must be deterministic');
    }
  }

  assertValidBoardDefinition(board);
  return {
    width: board.width,
    height: board.height,
    cells: board.cells.map((cell) => ({ ...cell })),
  };
}
