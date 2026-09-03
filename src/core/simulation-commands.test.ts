import { describe, expect, it } from 'vitest';
import type { LevelDefinition } from './model';
import { FIXED_STEP_MS, GameSimulation } from './simulation';

const level: LevelDefinition = {
  id: 'commands',
  board: { width: 1, height: 3, cells: [
    { x: 0, y: 0, color: 'pink' },
    { x: 0, y: 1, color: 'pink' },
    { x: 0, y: 2, color: 'blue' },
  ] },
  stacks: [[{ color: 'pink', ammo: 2 }, { color: 'blue', ammo: 1 }], [], [], []],
  speedTrackUnitsPerSecond: 1,
};

describe('GameSimulation commands', () => {
  it('starts ready and processes commands on the next fixed step', () => {
    const game = new GameSimulation(level);
    expect(game.getSnapshot().phase).toBe('ready');
    game.dispatch({ type: 'start' });
    game.dispatch({ type: 'launch', source: { kind: 'stack', index: 0 } });
    const events = game.advance(FIXED_STEP_MS);
    expect(events.map((event) => event.type)).toEqual(['gameStarted', 'containerLaunched']);
    expect(game.getSnapshot().stacks[0][0]).toEqual({ color: 'blue', ammo: 1 });
    expect(game.getSnapshot().active[0]).toMatchObject({
      launchId: 1,
      color: 'pink',
      ammo: 2,
      distance: FIXED_STEP_MS / 1000,
    });
  });

  it('ignores stale launches from an empty source', () => {
    const game = new GameSimulation({
      ...level,
      board: { width: 1, height: 1, cells: [] },
      stacks: [[], [], [], []],
    });
    game.dispatch({ type: 'start' });
    game.dispatch({ type: 'launch', source: { kind: 'stack', index: 0 } });
    expect(game.advance(FIXED_STEP_MS).map((event) => event.type)).toEqual(['gameStarted']);
  });
});
