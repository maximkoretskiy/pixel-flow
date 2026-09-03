import { describe, expect, it } from 'vitest';
import type { LevelDefinition } from './model';
import { replayLevel } from './replay';
import { FIXED_STEP_MS, GameSimulation } from './simulation';

const ONE_PIXEL_LEVEL: LevelDefinition = {
  id: 'one-pixel',
  board: {
    width: 1,
    height: 1,
    cells: [{ x: 0, y: 0, color: 'blue' }],
  },
  stacks: [[{ color: 'blue', ammo: 1 }], [], [], []],
  speedTrackUnitsPerSecond: 60,
};

const BLOCKED_BLUE_LEVEL: LevelDefinition = {
  id: 'blocked-blue',
  board: {
    width: 3,
    height: 3,
    cells: [
      { x: 1, y: 1, color: 'blue' },
      { x: 1, y: 0, color: 'orange' },
      { x: 2, y: 1, color: 'orange' },
      { x: 1, y: 2, color: 'orange' },
      { x: 0, y: 1, color: 'orange' },
    ],
  },
  stacks: [
    [{ color: 'blue', ammo: 1 }],
    [{ color: 'orange', ammo: 1 }],
    [{ color: 'orange', ammo: 1 }],
    [{ color: 'orange', ammo: 2 }],
  ],
  speedTrackUnitsPerSecond: 60,
};

describe('GameSimulation state', () => {
  it('forks without sharing mutable state', () => {
    const original = new GameSimulation(BLOCKED_BLUE_LEVEL);
    original.dispatch({ type: 'start' });
    original.advance(FIXED_STEP_MS);

    const fork = original.fork();
    fork.dispatch({ type: 'launch', source: { kind: 'stack', index: 0 } });
    fork.advance(FIXED_STEP_MS);

    expect(original.getSnapshot().active).toHaveLength(0);
    expect(original.getSnapshot().stacks.flat()).toHaveLength(4);
    expect(fork.getSnapshot().active).toHaveLength(1);
    expect(fork.getSnapshot().stacks.flat()).toHaveLength(3);
  });

  it('applies an optional buffer occupancy cap only to the fork', () => {
    const original = new GameSimulation(BLOCKED_BLUE_LEVEL);
    original.dispatch({ type: 'start' });
    original.dispatch({ type: 'launch', source: { kind: 'stack', index: 0 } });
    original.advance(FIXED_STEP_MS);

    const capped = original.fork({ maxBufferOccupancy: 0 });
    original.advance(250);
    capped.advance(250);

    expect(original.getSnapshot().phase).toBe('running');
    expect(original.getSnapshot().buffer.filter(Boolean)).toHaveLength(1);
    expect(capped.getSnapshot().phase).toBe('lost');
    expect(capped.getSnapshot().buffer.filter(Boolean)).toHaveLength(0);
  });
});

describe('replayLevel', () => {
  it('replays timestamped launches and records observed peaks', () => {
    const result = replayLevel(ONE_PIXEL_LEVEL, [
      { atMs: 0, source: { kind: 'stack', index: 0 } },
    ]);

    expect(result.phase).toBe('won');
    expect(result.peakActiveContainers).toBe(1);
    expect(result.peakBufferedContainers).toBe(0);
    expect(result.elapsedMs).toBe(50);
    expect(result.events.some((event) => event.type === 'gameWon')).toBe(true);
  });

  it('rejects launches that are out of chronological order', () => {
    expect(() => replayLevel(ONE_PIXEL_LEVEL, [
      { atMs: 300, source: { kind: 'stack', index: 0 } },
      { atMs: 0, source: { kind: 'stack', index: 1 } },
    ])).toThrow('launches must be ordered by atMs');
  });
});
