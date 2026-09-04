import { describe, expect, it } from 'vitest';
import { GAME_HEIGHT, GAME_WIDTH, LAYOUT } from './layout';
import { trackPoint } from './track-geometry';

describe('portrait layout', () => {
  it('fits the virtual canvas and keeps every source target at least 48 CSS px at 320x568', () => {
    expect(GAME_WIDTH).toBe(390);
    expect(GAME_HEIGHT).toBe(780);
    const minimumViewport = { width: 320, height: 568 };
    const fitScale = Math.min(
      minimumViewport.width / GAME_WIDTH,
      minimumViewport.height / GAME_HEIGHT,
    );
    for (const target of [...LAYOUT.bufferSlots, ...LAYOUT.stackTargets]) {
      expect(target.width * fitScale).toBeGreaterThanOrEqual(48);
      expect(target.height * fitScale).toBeGreaterThanOrEqual(48);
      expect(target.x).toBeGreaterThanOrEqual(0);
      expect(target.y).toBeGreaterThanOrEqual(0);
      expect(target.x + target.width).toBeLessThanOrEqual(GAME_WIDTH);
      expect(target.y + target.height).toBeLessThanOrEqual(GAME_HEIGHT);
    }
    for (const group of [LAYOUT.bufferSlots, LAYOUT.stackTargets]) {
      for (let index = 1; index < group.length; index += 1) {
        expect(group[index - 1].x + group[index - 1].width).toBeLessThan(group[index].x);
      }
    }
  });

  it('maps track distance counterclockwise from the bottom-left corner', () => {
    expect(trackPoint(0, 12)).toMatchObject({
      x: LAYOUT.route.x,
      y: LAYOUT.route.y + LAYOUT.route.height,
      angle: 0,
    });
    expect(trackPoint(3, 12)).toMatchObject({
      x: LAYOUT.route.x + LAYOUT.route.width,
      y: LAYOUT.route.y + LAYOUT.route.height,
    });
    expect(trackPoint(6, 12)).toMatchObject({
      x: LAYOUT.route.x + LAYOUT.route.width,
      y: LAYOUT.route.y,
    });
  });

  it('places an unlocked selector trigger and twelve cells inside the canvas', () => {
    expect(LAYOUT.levelButton).toEqual({ x: 20, y: 16, width: 180, height: 44 });
    expect(LAYOUT.levelSelectorCells).toHaveLength(12);
    for (const cell of LAYOUT.levelSelectorCells) {
      expect(cell.x).toBeGreaterThanOrEqual(0);
      expect(cell.y).toBeGreaterThanOrEqual(0);
      expect(cell.x + cell.width).toBeLessThanOrEqual(GAME_WIDTH);
      expect(cell.y + cell.height).toBeLessThanOrEqual(GAME_HEIGHT);
    }
  });
});
