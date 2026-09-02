export const SUPPORTED_COLORS = ['blue', 'green', 'orange', 'pink'] as const;
export type ColorId = (typeof SUPPORTED_COLORS)[number];

export interface PixelSeed { readonly x: number; readonly y: number; readonly color: ColorId }
export interface ContainerSeed { readonly color: ColorId; readonly ammo: number }
export interface BoardDefinition {
  readonly width: number;
  readonly height: number;
  readonly cells: readonly PixelSeed[];
}
export interface LevelDefinition {
  readonly id: string;
  readonly board: BoardDefinition;
  readonly stacks: readonly (readonly ContainerSeed[])[];
  readonly speedTrackUnitsPerSecond: number;
}
