import { describe, expect, it } from 'vitest';
import { GAME_HEIGHT, GAME_WIDTH, LAYOUT } from './layout';
import { trackPoint } from './track-geometry';

describe('portrait layout', () => {
  it('fits the virtual canvas and keeps every source target at least 48px', () => {
    expect(GAME_WIDTH).toBe(390);
    expect(GAME_HEIGHT).toBe(780);
    for (const target of [...LAYOUT.bufferSlots, ...LAYOUT.stackTargets]) {
      expect(target.width).toBeGreaterThanOrEqual(48);
      expect(target.height).toBeGreaterThanOrEqual(48);
      expect(target.x).toBeGreaterThanOrEqual(0);
      expect(target.x + target.width).toBeLessThanOrEqual(GAME_WIDTH);
    }
    for (const group of [LAYOUT.bufferSlots, LAYOUT.stackTargets]) {
      for (let index = 1; index < group.length; index += 1) {
        expect(group[index - 1].x + group[index - 1].width).toBeLessThanOrEqual(group[index].x);
      }
    }
  });

  it('maps track distance clockwise around the route rectangle', () => {
    expect(trackPoint(0, 12)).toMatchObject({ x: LAYOUT.route.x, y: LAYOUT.route.y });
    expect(trackPoint(3, 12).x).toBe(LAYOUT.route.x + LAYOUT.route.width);
    expect(trackPoint(6, 12).y).toBe(LAYOUT.route.y + LAYOUT.route.height);
  });
});
