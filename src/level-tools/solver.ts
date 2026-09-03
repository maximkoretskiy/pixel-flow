import type {
  DomainEvent,
  GameSnapshot,
  LaunchSource,
  LevelDefinition,
  TimedLaunch,
} from '../core/model';
import { GameSimulation } from '../core/simulation';

export interface SolverOptions {
  readonly quantumMs: 50;
  readonly minimumInputSpacingMs: number;
  readonly maxVisitedStates: number;
  readonly maxElapsedMs: number;
  readonly maxBufferOccupancy?: number;
  readonly requiredPeakBufferOccupancy?: number;
}

export interface SearchMetrics {
  readonly visitedStates: number;
  readonly generatedBranches: number;
  readonly deadEnds: number;
  readonly peakActiveContainers: number;
  readonly peakBufferedContainers: number;
  readonly actionCount: number;
  readonly elapsedMs: number;
}

export type SolverOutcome =
  | {
      readonly kind: 'solved';
      readonly witness: readonly TimedLaunch[];
      readonly metrics: SearchMetrics;
    }
  | {
      readonly kind: 'exhausted' | 'budget-exceeded';
      readonly metrics: SearchMetrics;
    };

interface SearchNode {
  readonly simulation: GameSimulation;
  readonly timeMs: number;
  readonly lastInputAtMs: number | null;
  readonly witness: readonly TimedLaunch[];
  readonly peakActiveContainers: number;
  readonly peakBufferedContainers: number;
}

function availableSources(snapshot: GameSnapshot): readonly LaunchSource[] {
  if (snapshot.active.length >= 5) return [];
  return [
    ...snapshot.stacks.flatMap((stack, index): LaunchSource[] =>
      stack.length > 0 ? [{ kind: 'stack', index }] : []),
    ...snapshot.buffer.flatMap((container, index): LaunchSource[] =>
      container ? [{ kind: 'buffer', index }] : []),
  ];
}

function observeTransientPeaks(
  snapshot: GameSnapshot,
  events: readonly DomainEvent[],
): { readonly active: number; readonly buffered: number } {
  let active = snapshot.active.length;
  let buffered = snapshot.buffer.filter(Boolean).length;
  let peakActive = active;
  let peakBuffered = buffered;
  for (const event of events) {
    if (event.type === 'containerLaunched') {
      active += 1;
      if (event.source.kind === 'buffer') buffered -= 1;
    } else if (event.type === 'containerDepleted') {
      active -= 1;
    } else if (event.type === 'containerBuffered') {
      active -= 1;
      buffered += 1;
    }
    peakActive = Math.max(peakActive, active);
    peakBuffered = Math.max(peakBuffered, buffered);
  }
  return { active: peakActive, buffered: peakBuffered };
}

function hashNode(node: SearchNode, minimumInputSpacingMs: number): string {
  const state = node.simulation.saveState();
  const spacingRemaining = node.lastInputAtMs === null
    ? 0
    : Math.max(0, minimumInputSpacingMs - (node.timeMs - node.lastInputAtMs));
  return JSON.stringify({ state, spacingRemaining, peakBuffer: node.peakBufferedContainers });
}

function makeMetrics(
  visitedStates: number,
  generatedBranches: number,
  deadEnds: number,
  peakActiveContainers: number,
  peakBufferedContainers: number,
  actionCount: number,
  elapsedMs: number,
): SearchMetrics {
  return {
    visitedStates,
    generatedBranches,
    deadEnds,
    peakActiveContainers,
    peakBufferedContainers,
    actionCount,
    elapsedMs,
  };
}

export function solveLevel(level: LevelDefinition, options: SolverOptions): SolverOutcome {
  if (options.quantumMs !== 50) throw new RangeError('quantumMs must be 50');
  const simulation = new GameSimulation(level, {
    maxBufferOccupancy: options.maxBufferOccupancy,
  });
  simulation.dispatch({ type: 'start' });
  const queue: SearchNode[] = [{
    simulation,
    timeMs: 0,
    lastInputAtMs: null,
    witness: [],
    peakActiveContainers: 0,
    peakBufferedContainers: 0,
  }];
  const seen = new Set<string>();
  let cursor = 0;
  let visitedStates = 0;
  let generatedBranches = 0;
  let deadEnds = 0;
  let globalPeakActive = 0;
  let globalPeakBuffered = 0;
  let greatestElapsedMs = 0;

  while (cursor < queue.length) {
    if (visitedStates >= options.maxVisitedStates) {
      return {
        kind: 'budget-exceeded',
        metrics: makeMetrics(
          visitedStates,
          generatedBranches,
          deadEnds,
          globalPeakActive,
          globalPeakBuffered,
          0,
          greatestElapsedMs,
        ),
      };
    }

    const node = queue[cursor];
    cursor += 1;
    visitedStates += 1;
    greatestElapsedMs = Math.max(greatestElapsedMs, node.timeMs);
    if (node.timeMs >= options.maxElapsedMs) {
      deadEnds += 1;
      continue;
    }

    const snapshot = node.simulation.getSnapshot();
    const spacingAllowsInput = node.lastInputAtMs === null ||
      node.timeMs - node.lastInputAtMs >= options.minimumInputSpacingMs;
    const sources = spacingAllowsInput ? availableSources(snapshot) : [];
    const choices: ReadonlyArray<LaunchSource | null> = [null, ...sources];

    for (const source of choices) {
      generatedBranches += 1;
      const childSimulation = node.simulation.fork();
      if (source) childSimulation.dispatch({ type: 'launch', source });
      const emitted = childSimulation.advance(options.quantumMs);
      const childTimeMs = node.timeMs + options.quantumMs;
      const observed = observeTransientPeaks(snapshot, emitted);
      const peakActiveContainers = Math.max(node.peakActiveContainers, observed.active);
      const peakBufferedContainers = Math.max(node.peakBufferedContainers, observed.buffered);
      globalPeakActive = Math.max(globalPeakActive, peakActiveContainers);
      globalPeakBuffered = Math.max(globalPeakBuffered, peakBufferedContainers);
      const witness = source
        ? [...node.witness, { atMs: node.timeMs, source }]
        : node.witness;
      const childSnapshot = childSimulation.getSnapshot();

      if (childSnapshot.phase === 'won') {
        if (peakBufferedContainers >= (options.requiredPeakBufferOccupancy ?? 0)) {
          return {
            kind: 'solved',
            witness,
            metrics: makeMetrics(
              visitedStates,
              generatedBranches,
              deadEnds,
              globalPeakActive,
              globalPeakBuffered,
              witness.length,
              childTimeMs,
            ),
          };
        }
        deadEnds += 1;
        continue;
      }
      if (childSnapshot.phase === 'lost' || childSnapshot.phase === 'error') {
        deadEnds += 1;
        continue;
      }

      const child: SearchNode = {
        simulation: childSimulation,
        timeMs: childTimeMs,
        lastInputAtMs: source ? node.timeMs : node.lastInputAtMs,
        witness,
        peakActiveContainers,
        peakBufferedContainers,
      };
      const hash = hashNode(child, options.minimumInputSpacingMs);
      if (seen.has(hash)) continue;
      seen.add(hash);
      queue.push(child);
    }
  }

  return {
    kind: 'exhausted',
    metrics: makeMetrics(
      visitedStates,
      generatedBranches,
      deadEnds,
      globalPeakActive,
      globalPeakBuffered,
      0,
      greatestElapsedMs,
    ),
  };
}
