import type { Board } from './board';
import type { ColorId } from './model';
import type { Ray } from './route';

export interface PixelTarget { readonly x: number; readonly y: number; readonly color: ColorId }

export function traceFirstOccupied(board: Board, ray: Ray): PixelTarget | null {
  const height = board.length;
  const width = board[0]?.length ?? 0;
  const coordinates: Array<readonly [number, number]> = [];
  if (ray.edge === 'top') for (let y = 0; y < height; y += 1) coordinates.push([ray.index, y]);
  if (ray.edge === 'bottom') for (let y = height - 1; y >= 0; y -= 1) coordinates.push([ray.index, y]);
  if (ray.edge === 'left') for (let x = 0; x < width; x += 1) coordinates.push([x, ray.index]);
  if (ray.edge === 'right') for (let x = width - 1; x >= 0; x -= 1) coordinates.push([x, ray.index]);
  for (const [x, y] of coordinates) {
    const color = board[y]?.[x] ?? null;
    if (color) return { x, y, color };
  }
  return null;
}
