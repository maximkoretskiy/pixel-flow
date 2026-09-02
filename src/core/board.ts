import type { BoardDefinition, ColorId } from './model';

export type Board = Array<Array<ColorId | null>>;

export function createBoard(definition: BoardDefinition): Board {
  const board = Array.from({ length: definition.height }, () =>
    Array<ColorId | null>(definition.width).fill(null));
  definition.cells.forEach(({ x, y, color }) => { board[y][x] = color; });
  return board;
}

export function removePixel(board: Board, x: number, y: number): void { board[y][x] = null; }

export function countPixels(board: Board): number {
  return board.reduce((sum, row) => sum + row.filter(Boolean).length, 0);
}

export function cloneBoard(board: Board): Board { return board.map((row) => [...row]); }
