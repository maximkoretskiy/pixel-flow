import type { ActiveContainer } from './model';
import type { ControlPoint, Route } from './route';

export type TrackEvent =
  | { readonly type: 'control'; readonly launchId: number; readonly offset: number; readonly controlPoint: ControlPoint }
  | { readonly type: 'lap'; readonly launchId: number; readonly offset: number };

export function collectTrackEvents(
  active: readonly ActiveContainer[],
  travelDistance: number,
  route: Route,
): readonly TrackEvent[] {
  const events: TrackEvent[] = [];
  for (const container of active) {
    const start = container.distance;
    const end = start + travelDistance;
    const firstLap = Math.floor(start / route.length);
    const lastLap = Math.floor(end / route.length);
    for (let lap = firstLap; lap <= lastLap; lap += 1) {
      for (const controlPoint of route.controlPoints) {
        const absolute = lap * route.length + controlPoint.distance;
        if (absolute > start && absolute <= end) {
          events.push({ type: 'control', launchId: container.launchId, offset: absolute - start, controlPoint });
        }
      }
      const lapEnd = (lap + 1) * route.length;
      if (lapEnd > start && lapEnd <= end) events.push({ type: 'lap', launchId: container.launchId, offset: lapEnd - start });
    }
  }
  return events.sort((a, b) => a.offset - b.offset || a.launchId - b.launchId ||
    (a.type === 'control' ? -1 : 1));
}
