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

  it('uses launch ID to break same-offset ties', () => {
    const events = collectTrackEvents([
      { launchId: 9, color: 'pink', ammo: 1, distance: 0 },
      { launchId: 3, color: 'blue', ammo: 1, distance: 0 },
    ], 0.5, route);
    expect(events.map((event) => event.launchId)).toEqual([3, 9]);
  });
});
