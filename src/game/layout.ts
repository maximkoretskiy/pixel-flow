export const GAME_WIDTH = 390;
export const GAME_HEIGHT = 780;

export interface Rect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export const LAYOUT = {
  header: { x: 20, y: 16, width: 350, height: 44 },
  route: { x: 28, y: 72, width: 334, height: 430 },
  board: { x: 78, y: 148, width: 234, height: 234 },
  bufferSlots: Array.from({ length: 5 }, (_, index): Rect => ({
    x: 13 + index * 74,
    y: 518,
    width: 68,
    height: 68,
  })),
  stackTargets: Array.from({ length: 4 }, (_, index): Rect => ({
    x: 13 + index * 94,
    y: 602,
    width: 82,
    height: 164,
  })),
} as const;
