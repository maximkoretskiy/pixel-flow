export type Ray =
  | { readonly edge: 'top' | 'bottom'; readonly index: number }
  | { readonly edge: 'left' | 'right'; readonly index: number };

export interface ControlPoint { readonly distance: number; readonly ray: Ray }
export interface Route { readonly length: number; readonly controlPoints: readonly ControlPoint[] }

export function buildRoute(width: number, height: number): Route {
  const rays: Ray[] = [];
  for (let x = 0; x < width; x += 1) rays.push({ edge: 'top', index: x });
  for (let y = 0; y < height; y += 1) rays.push({ edge: 'right', index: y });
  for (let x = width - 1; x >= 0; x -= 1) rays.push({ edge: 'bottom', index: x });
  for (let y = height - 1; y >= 0; y -= 1) rays.push({ edge: 'left', index: y });
  return { length: rays.length, controlPoints: rays.map((ray, index) => ({ distance: index + 0.5, ray })) };
}
