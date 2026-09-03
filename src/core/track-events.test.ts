import { describe, expect, it } from 'vitest';
import { buildRoute } from './route';
import { collectTrackEvents } from './track-events';

describe('collectTrackEvents', () => {
  const route = buildRoute(1, 1);

  it('reports every crossed control point and lap in chronological order', () => {
    const events = collectTrackEvents(
      [{ launchId: 2, color: 'blue', ammo: 2, distance: 3.25 }],
      1,
      route,
    );
    expect(events.map((event) => [event.type, event.offset])).toEqual([
      ['control', 0.25],
      ['lap', 0.75],
    ]);
  });

  it('resolves every same-step crossing by launch ID before fractional offset', () => {
    const events = collectTrackEvents([
      { launchId: 9, color: 'pink', ammo: 1, distance: 0.4 },
      { launchId: 3, color: 'blue', ammo: 1, distance: 0.2 },
    ], 0.3, route);
    expect(events.map((event) => event.launchId)).toEqual([3, 9]);
    expect(events[0].offset).toBeCloseTo(0.3);
    expect(events[1].offset).toBeCloseTo(0.1);
  });

  it('keeps route order within one container and resolves control before lap at equal offset', () => {
    const routeWithEndControl = {
      length: 4,
      controlPoints: [
        { distance: 3.5, ray: { edge: 'left' as const, index: 0 } },
        { distance: 4, ray: { edge: 'top' as const, index: 0 } },
      ],
    };
    const events = collectTrackEvents(
      [{ launchId: 1, color: 'blue', ammo: 2, distance: 3.25 }],
      0.75,
      routeWithEndControl,
    );
    expect(events.map((event) => event.type)).toEqual(['control', 'control', 'lap']);
  });
});
