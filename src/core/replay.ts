import type {
  DomainEvent,
  GamePhase,
  LevelDefinition,
  SimulationOptions,
  TimedLaunch,
} from './model';
import { GameSimulation } from './simulation';

const REPLAY_STEP_MS = 50;
const DEFAULT_MAX_ELAPSED_MS = 120_000;

export interface ReplayOptions extends SimulationOptions {
  readonly maxElapsedMs?: number;
}

export interface ReplayResult {
  readonly phase: GamePhase;
  readonly elapsedMs: number;
  readonly events: readonly DomainEvent[];
  readonly peakActiveContainers: number;
  readonly peakBufferedContainers: number;
}

function assertValidLaunches(launches: readonly TimedLaunch[]): void {
  let previousAtMs = -1;
  for (const launch of launches) {
    if (!Number.isFinite(launch.atMs) || launch.atMs < 0) {
      throw new RangeError('launch atMs must be finite and non-negative');
    }
    if (launch.atMs < previousAtMs) throw new RangeError('launches must be ordered by atMs');
    previousAtMs = launch.atMs;
  }
}

export function replayLevel(
  level: LevelDefinition,
  launches: readonly TimedLaunch[],
  options: ReplayOptions = {},
): ReplayResult {
  assertValidLaunches(launches);
  const maxElapsedMs = options.maxElapsedMs ?? DEFAULT_MAX_ELAPSED_MS;
  const simulation = new GameSimulation(level, options);
  const events: DomainEvent[] = [];
  let elapsedMs = 0;
  let launchIndex = 0;
  let activeContainers = 0;
  let bufferedContainers = 0;
  let peakActiveContainers = 0;
  let peakBufferedContainers = 0;

  simulation.dispatch({ type: 'start' });
  while (elapsedMs < maxElapsedMs) {
    while (launches[launchIndex]?.atMs === elapsedMs) {
      simulation.dispatch({ type: 'launch', source: launches[launchIndex].source });
      launchIndex += 1;
    }

    const nextLaunchAtMs = launches[launchIndex]?.atMs ?? Number.POSITIVE_INFINITY;
    const advanceMs = Math.min(REPLAY_STEP_MS, nextLaunchAtMs - elapsedMs, maxElapsedMs - elapsedMs);
    if (advanceMs <= 0) break;
    const emitted = simulation.advance(advanceMs);
    events.push(...emitted);
    elapsedMs += advanceMs;

    for (const event of emitted) {
      if (event.type === 'containerLaunched') {
        activeContainers += 1;
        if (event.source.kind === 'buffer') bufferedContainers -= 1;
      } else if (event.type === 'containerDepleted') {
        activeContainers -= 1;
      } else if (event.type === 'containerBuffered') {
        activeContainers -= 1;
        bufferedContainers += 1;
      }
      peakActiveContainers = Math.max(peakActiveContainers, activeContainers);
      peakBufferedContainers = Math.max(peakBufferedContainers, bufferedContainers);
    }

    const phase = simulation.getSnapshot().phase;
    if (phase === 'won' || phase === 'lost' || phase === 'error') break;
  }

  return {
    phase: simulation.getSnapshot().phase,
    elapsedMs,
    events,
    peakActiveContainers,
    peakBufferedContainers,
  };
}
