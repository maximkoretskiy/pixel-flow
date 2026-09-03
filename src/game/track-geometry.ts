import { LAYOUT } from './layout';

export interface TrackPoint {
  readonly x: number;
  readonly y: number;
  readonly angle: number;
}

export function trackPoint(distance: number, routeLength: number): TrackPoint {
  if (routeLength <= 0) throw new RangeError('routeLength must be positive');

  const normalized = (((distance % routeLength) + routeLength) % routeLength) / routeLength;
  const { x, y, width, height } = LAYOUT.route;
  if (normalized <= 0.25) {
    return { x, y: y + height * (1 - normalized / 0.25), angle: -Math.PI / 2 };
  }
  if (normalized <= 0.5) {
    return { x: x + width * ((normalized - 0.25) / 0.25), y, angle: 0 };
  }
  if (normalized <= 0.75) {
    return { x: x + width, y: y + height * ((normalized - 0.5) / 0.25), angle: Math.PI / 2 };
  }
  return { x: x + width * (1 - (normalized - 0.75) / 0.25), y: y + height, angle: Math.PI };
}
