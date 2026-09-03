import { describe, expect, it } from 'vitest';
import type { ColorId, LaunchSource } from '../core/model';
import { FIXED_STEP_MS, GameSimulation } from '../core/simulation';
import { assertValidLevel } from '../core/level-validator';
import { LEVEL_ONE } from './level-one';

describe('LEVEL_ONE', () => {
  it('defines a balanced 15x15 pixel-art level', () => {
    expect(() => assertValidLevel(LEVEL_ONE)).not.toThrow();
    expect(LEVEL_ONE.board).toMatchObject({ width: 15, height: 15 });
    expect(LEVEL_ONE.board.cells).toHaveLength(225);
    expect(LEVEL_ONE.stacks).toHaveLength(4);
    expect(LEVEL_ONE.stacks.every((stack) => stack.length === 3)).toBe(true);
    expect(LEVEL_ONE.speedTrackUnitsPerSecond).toBe(30);

    const pixelCounts = Object.fromEntries(
      ['blue', 'green', 'orange', 'pink'].map((color) => [
        color,
        LEVEL_ONE.board.cells.filter((cell) => cell.color === color).length,
      ]),
    );
    const ammoCounts = Object.fromEntries(
      ['blue', 'green', 'orange', 'pink'].map((color) => [
        color,
        LEVEL_ONE.stacks.flat()
          .filter((container) => container.color === color)
          .reduce((total, container) => total + container.ammo, 0),
      ]),
    );
    const expectedCounts = { blue: 125, green: 24, orange: 23, pink: 53 };
    expect(pixelCounts).toEqual(expectedCounts);
    expect(ammoCounts).toEqual(expectedCounts);
  });

  it('is solvable by clearing its exposed color layers in order', () => {
    const game = new GameSimulation(LEVEL_ONE);
    game.dispatch({ type: 'start' });
    game.advance(FIXED_STEP_MS);

    const drain = (source: LaunchSource, color: ColorId) => {
      game.dispatch({ type: 'launch', source });
      for (let lap = 0; lap < 10; lap += 1) {
        game.advance(2100);
        const snapshot = game.getSnapshot();
        if (snapshot.phase === 'won' || !snapshot.board.flat().includes(color)) return;
        const slot = snapshot.buffer.findIndex((container) => container?.color === color);
        if (slot === -1) return;
        game.dispatch({ type: 'launch', source: { kind: 'buffer', index: slot } });
      }
      throw new Error(`container did not finish clearing ${color}`);
    };

    const drainNextStack = (color: ColorId) => {
      const index = game.getSnapshot().stacks.findIndex((stack) => stack[0]?.color === color);
      if (index === -1) throw new Error(`no stack starts with ${color}`);
      drain({ kind: 'stack', index }, color);
    };

    for (let index = 0; index < 3; index += 1) drainNextStack('blue');
    for (let index = 0; index < 3; index += 1) drainNextStack('pink');
    for (let index = 0; index < 3; index += 1) drainNextStack('orange');
    for (let index = 0; index < 3; index += 1) drainNextStack('green');

    expect(game.getSnapshot()).toMatchObject({ phase: 'won', danger: false });
  });
});
