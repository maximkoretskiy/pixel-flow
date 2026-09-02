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

export type GamePhase = 'ready' | 'running' | 'paused' | 'won' | 'lost' | 'error';

export type LaunchSource = {
  readonly kind: 'stack' | 'buffer';
  readonly index: number;
};

export type GameCommand =
  | { readonly type: 'start' | 'pause' | 'resume' }
  | { readonly type: 'launch'; readonly source: LaunchSource };

export interface ActiveContainer {
  readonly launchId: number;
  readonly color: ColorId;
  readonly ammo: number;
  readonly distance: number;
}

export interface GameSnapshot {
  readonly phase: GamePhase;
  readonly board: ReadonlyArray<ReadonlyArray<ColorId | null>>;
  readonly stacks: ReadonlyArray<ReadonlyArray<ContainerSeed>>;
  readonly buffer: ReadonlyArray<ContainerSeed | null>;
  readonly active: ReadonlyArray<Readonly<ActiveContainer>>;
  readonly danger: boolean;
}

export type DomainEvent =
  | {
      readonly type:
        | 'gameStarted'
        | 'gamePaused'
        | 'gameResumed'
        | 'dangerEntered'
        | 'dangerExited'
        | 'gameWon'
        | 'gameLost';
    }
  | {
      readonly type: 'containerLaunched';
      readonly launchId: number;
      readonly source: LaunchSource;
      readonly color: ColorId;
      readonly ammo: number;
    }
  | {
      readonly type: 'pixelDestroyed';
      readonly launchId: number;
      readonly x: number;
      readonly y: number;
      readonly color: ColorId;
    }
  | { readonly type: 'containerDepleted'; readonly launchId: number }
  | {
      readonly type: 'containerBuffered';
      readonly launchId: number;
      readonly slot: number;
      readonly color: ColorId;
      readonly ammo: number;
    };
