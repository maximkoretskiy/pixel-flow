import { describe, expect, it } from 'vitest';
import type { LevelDefinition, TimedLaunch } from '../core/model';
import { buildJitterSchedules, validateHumanTiming } from './timing-validator';

const ONE_PIXEL_LEVEL: LevelDefinition = {
  id: 'timing-one-pixel',
  board: { width: 1, height: 1, cells: [{ x: 0, y: 0, color: 'blue' }] },
  stacks: [[{ color: 'blue', ammo: 1 }], [], [], []],
  speedTrackUnitsPerSecond: 60,
};

const TWO_ACTION_WITNESS: readonly TimedLaunch[] = [
  { atMs: 300, source: { kind: 'stack', index: 0 } },
  { atMs: 1_200, source: { kind: 'stack', index: 1 } },
];

function hasMinimumSpacing(witness: readonly TimedLaunch[]): boolean {
  return witness.every((launch, index) => index === 0 || launch.atMs - witness[index - 1].atMs >= 300);
}

describe('buildJitterSchedules', () => {
  it('builds nominal, global, alternating, and per-action schedules', () => {
    const schedules = buildJitterSchedules(TWO_ACTION_WITNESS);

    expect(schedules).toHaveLength(8);
    expect(schedules[0]).toEqual(TWO_ACTION_WITNESS);
    expect(schedules.every(hasMinimumSpacing)).toBe(true);
  });
});

describe('validateHumanTiming', () => {
  it('accepts a winning replay under every jitter schedule', () => {
    expect(validateHumanTiming(ONE_PIXEL_LEVEL, [
      { atMs: 300, source: { kind: 'stack', index: 0 } },
    ])).toEqual({ ok: true, schedulesChecked: 6 });
  });

  it('rejects nominal inputs less than 300 ms apart', () => {
    expect(validateHumanTiming(ONE_PIXEL_LEVEL, [
      { atMs: 0, source: { kind: 'stack', index: 0 } },
      { atMs: 250, source: { kind: 'stack', index: 1 } },
    ])).toEqual({ ok: false, reason: 'input-spacing', scheduleIndex: 0 });
  });
});
