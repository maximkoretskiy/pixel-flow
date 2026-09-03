import { describe, expect, it } from 'vitest';
import type { LevelDefinition } from './model';
import { FIXED_STEP_MS, GameSimulation } from './simulation';

function running(level: LevelDefinition): GameSimulation {
  const game = new GameSimulation(level);
  game.dispatch({ type: 'start' });
  game.advance(FIXED_STEP_MS);
  return game;
}

function protectedPinkLevel(id: string): LevelDefinition {
  const cells: LevelDefinition['board']['cells'][number][] = [];
  for (let y = 0; y < 5; y += 1) {
    for (let x = 0; x < 5; x += 1) {
      if (x === 0 || x === 4 || y === 0 || y === 4) cells.push({ x, y, color: 'blue' });
      else if (x !== 2 || y !== 2) cells.push({ x, y, color: 'pink' });
    }
  }
  return {
    id,
    board: { width: 5, height: 5, cells },
    stacks: [
      [{ color: 'pink', ammo: 1 }, { color: 'pink', ammo: 1 }, { color: 'blue', ammo: 16 }],
      [{ color: 'pink', ammo: 1 }, { color: 'pink', ammo: 1 }],
      [{ color: 'pink', ammo: 1 }, { color: 'pink', ammo: 1 }],
      [{ color: 'pink', ammo: 1 }, { color: 'pink', ammo: 1 }],
    ],
    speedTrackUnitsPerSecond: 1200,
  };
}

describe('GameSimulation rules', () => {
  it('does not shoot through a mismatched blocker', () => {
    const game = running({
      id: 'blocked',
      board: { width: 2, height: 1, cells: [
        { x: 0, y: 0, color: 'pink' }, { x: 1, y: 0, color: 'blue' },
      ] },
      stacks: [[{ color: 'blue', ammo: 1 }, { color: 'pink', ammo: 1 }], [], [], []],
      speedTrackUnitsPerSecond: 60,
    });
    game.dispatch({ type: 'launch', source: { kind: 'stack', index: 0 } });
    game.advance(FIXED_STEP_MS);
    expect(game.getSnapshot().board[0][0]).toBe('pink');
    expect(game.getSnapshot().active[0].ammo).toBe(1);
  });

  it('destroys one matching pixel and removes a depleted container', () => {
    const game = running({
      id: 'hit',
      board: { width: 1, height: 2, cells: [
        { x: 0, y: 0, color: 'blue' }, { x: 0, y: 1, color: 'blue' },
      ] },
      stacks: [[{ color: 'blue', ammo: 1 }, { color: 'blue', ammo: 1 }], [], [], []],
      speedTrackUnitsPerSecond: 60,
    });
    game.dispatch({ type: 'launch', source: { kind: 'stack', index: 0 } });
    const events = game.advance(FIXED_STEP_MS);
    expect(events.map((event) => event.type)).toEqual(expect.arrayContaining(['pixelDestroyed', 'containerDepleted']));
    expect(game.getSnapshot().active).toHaveLength(0);
    expect(game.getSnapshot().board.flat().filter(Boolean)).toHaveLength(1);
  });

  it('enters danger on five returns and loses on the sixth', () => {
    const game = running(protectedPinkLevel('overflow'));
    for (let index = 0; index < 4; index += 1) game.dispatch({ type: 'launch', source: { kind: 'stack', index } });
    game.dispatch({ type: 'launch', source: { kind: 'stack', index: 0 } });
    game.advance(FIXED_STEP_MS * 2);
    expect(game.getSnapshot()).toMatchObject({ danger: true, phase: 'running' });
    game.dispatch({ type: 'launch', source: { kind: 'stack', index: 1 } });
    game.advance(FIXED_STEP_MS * 2);
    expect(game.getSnapshot().phase).toBe('lost');
  });

  it('keeps a sixth container in its source while five are active', () => {
    const stack = Array.from({ length: 6 }, () => ({ color: 'pink' as const, ammo: 1 }));
    const game = running({
      id: 'active-limit',
      board: { width: 3, height: 2, cells: Array.from({ length: 6 }, (_, index) => ({
        x: index % 3,
        y: Math.floor(index / 3),
        color: 'pink' as const,
      })) },
      stacks: [stack, [], [], []],
      speedTrackUnitsPerSecond: 1,
    });
    for (let index = 0; index < 6; index += 1) {
      game.dispatch({ type: 'launch', source: { kind: 'stack', index: 0 } });
    }

    const events = game.advance(FIXED_STEP_MS);

    expect(events.filter((event) => event.type === 'containerLaunched')).toHaveLength(5);
    expect(game.getSnapshot().active).toHaveLength(5);
    expect(game.getSnapshot().stacks[0]).toEqual([{ color: 'pink', ammo: 1 }]);
  });

  it('compacts the remaining stacks left after a launch empties a stack', () => {
    const game = running({
      id: 'compact-stacks',
      board: { width: 3, height: 2, cells: [
        { x: 0, y: 0, color: 'pink' },
        { x: 1, y: 0, color: 'blue' },
        { x: 2, y: 0, color: 'blue' },
        { x: 0, y: 1, color: 'green' },
        { x: 1, y: 1, color: 'green' },
        { x: 2, y: 1, color: 'green' },
      ] },
      stacks: [
        [{ color: 'pink', ammo: 1 }],
        [{ color: 'blue', ammo: 2 }],
        [{ color: 'green', ammo: 3 }],
        [],
      ],
      speedTrackUnitsPerSecond: 1,
    });

    game.dispatch({ type: 'launch', source: { kind: 'stack', index: 0 } });
    game.advance(FIXED_STEP_MS);

    expect(game.getSnapshot().stacks).toEqual([
      [{ color: 'blue', ammo: 2 }],
      [{ color: 'green', ammo: 3 }],
      [],
      [],
    ]);
  });

  it('wins immediately after the last pixel', () => {
    const game = running({
      id: 'win', board: { width: 1, height: 1, cells: [{ x: 0, y: 0, color: 'blue' }] },
      stacks: [[{ color: 'blue', ammo: 1 }], [], [], []], speedTrackUnitsPerSecond: 60,
    });
    game.dispatch({ type: 'launch', source: { kind: 'stack', index: 0 } });
    expect(game.advance(FIXED_STEP_MS).at(-1)?.type).toBe('gameWon');
    expect(game.getSnapshot().phase).toBe('won');
  });

  it('can relaunch any occupied buffer slot and exits danger first', () => {
    const game = running(protectedPinkLevel('relaunch'));
    for (let index = 0; index < 4; index += 1) game.dispatch({ type: 'launch', source: { kind: 'stack', index } });
    game.dispatch({ type: 'launch', source: { kind: 'stack', index: 0 } });
    game.advance(FIXED_STEP_MS * 2);
    game.dispatch({ type: 'launch', source: { kind: 'buffer', index: 3 } });
    const events = game.advance(FIXED_STEP_MS);
    expect(events.some((event) => event.type === 'dangerExited')).toBe(true);
    expect(events.some((event) => event.type === 'containerLaunched' && event.source.kind === 'buffer' && event.source.index === 3)).toBe(true);
  });

  it('produces the same snapshot for different render-frame timing', () => {
    const level: LevelDefinition = {
      id: 'frames',
      board: { width: 1, height: 2, cells: [
        { x: 0, y: 0, color: 'pink' }, { x: 0, y: 1, color: 'blue' },
      ] },
      stacks: [[{ color: 'blue', ammo: 1 }, { color: 'pink', ammo: 1 }], [], [], []],
      speedTrackUnitsPerSecond: 1,
    };
    const run = (deltas: readonly number[]) => {
      const game = running(level);
      game.dispatch({ type: 'launch', source: { kind: 'stack', index: 0 } });
      deltas.forEach((delta) => game.advance(delta));
      return game.getSnapshot();
    };
    expect(run(Array.from({ length: 120 }, () => 1000 / 60)))
      .toEqual(run(Array.from({ length: 20 }, () => 100)));
  });

  it('resolves simultaneous shots by launch ID against the updated board', () => {
    const game = running({
      id: 'launch-order',
      board: { width: 1, height: 2, cells: [
        { x: 0, y: 0, color: 'pink' },
        { x: 0, y: 1, color: 'blue' },
      ] },
      stacks: [
        [{ color: 'blue', ammo: 1 }],
        [{ color: 'pink', ammo: 1 }],
        [],
        [],
      ],
      speedTrackUnitsPerSecond: 60,
    });
    game.dispatch({ type: 'launch', source: { kind: 'stack', index: 0 } });
    game.dispatch({ type: 'launch', source: { kind: 'stack', index: 1 } });

    const events = game.advance(FIXED_STEP_MS);

    expect(events.some((event) => event.type === 'gameWon')).toBe(true);
    expect(game.getSnapshot().board).toEqual([[null], [null]]);
  });

  it('does not move containers while paused', () => {
    const game = running({
      id: 'pause', board: { width: 1, height: 1, cells: [{ x: 0, y: 0, color: 'pink' }] },
      stacks: [[{ color: 'pink', ammo: 1 }], [], [], []], speedTrackUnitsPerSecond: 1,
    });
    game.dispatch({ type: 'launch', source: { kind: 'stack', index: 0 } });
    game.advance(FIXED_STEP_MS);
    game.dispatch({ type: 'pause' });
    game.advance(FIXED_STEP_MS);
    const pausedDistance = game.getSnapshot().active[0].distance;
    game.advance(1000);
    expect(game.getSnapshot().active[0].distance).toBe(pausedDistance);
  });
});
