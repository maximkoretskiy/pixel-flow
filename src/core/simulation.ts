import { cloneBoard, countPixels, createBoard, removePixel } from './board';
import type { Board } from './board';
import { assertValidLevel } from './level-validator';
import { buildRoute } from './route';
import type { ControlPoint, Route } from './route';
import { traceFirstOccupied } from './targeting';
import { collectTrackEvents } from './track-events';
import type {
  ActiveContainer,
  ContainerSeed,
  DomainEvent,
  GameCommand,
  GamePhase,
  GameSnapshot,
  LaunchSource,
  LevelDefinition,
} from './model';

export const FIXED_STEP_MS = 1000 / 60;
const MAX_ACTIVE_CONTAINERS = 5;

type MutableActiveContainer = {
  -readonly [Key in keyof ActiveContainer]: ActiveContainer[Key]
};

export class GameSimulation {
  private phase: GamePhase = 'ready';
  private board: Board;
  private stacks: ContainerSeed[][];
  private buffer: Array<ContainerSeed | null> = Array.from({ length: 5 }, () => null);
  private active: MutableActiveContainer[] = [];
  private danger = false;
  private nextLaunchId = 1;
  private accumulatorMs = 0;
  private readonly commands: GameCommand[] = [];
  private readonly route: Route;

  constructor(private readonly level: LevelDefinition) {
    assertValidLevel(level);
    this.board = createBoard(level.board);
    this.stacks = level.stacks.map((stack) => stack.map((seed) => ({ ...seed })));
    this.route = buildRoute(level.board.width, level.board.height);
  }

  dispatch(command: GameCommand): void {
    this.commands.push(command);
  }

  restart(): void {
    this.phase = 'ready';
    this.board = createBoard(this.level.board);
    this.stacks = this.level.stacks.map((stack) => stack.map((seed) => ({ ...seed })));
    this.buffer = Array.from({ length: 5 }, () => null);
    this.active = [];
    this.danger = false;
    this.nextLaunchId = 1;
    this.accumulatorMs = 0;
    this.commands.length = 0;
  }

  advance(elapsedMs: number): readonly DomainEvent[] {
    if (!Number.isFinite(elapsedMs) || elapsedMs < 0) {
      throw new RangeError('elapsedMs must be finite and non-negative');
    }
    this.accumulatorMs += elapsedMs;
    const emitted: DomainEvent[] = [];
    const stepCount = Math.floor((this.accumulatorMs + 1e-9) / FIXED_STEP_MS);
    for (let step = 0; step < stepCount; step += 1) {
      this.tick(emitted);
    }
    this.accumulatorMs -= stepCount * FIXED_STEP_MS;
    if (Math.abs(this.accumulatorMs) < 1e-9) this.accumulatorMs = 0;
    return emitted;
  }

  getSnapshot(): GameSnapshot {
    return {
      phase: this.phase,
      board: cloneBoard(this.board),
      stacks: this.stacks.map((stack) => stack.map((seed) => ({ ...seed }))),
      buffer: this.buffer.map((seed) => (seed ? { ...seed } : null)),
      active: this.active.map((container) => ({ ...container })),
      danger: this.danger,
    };
  }

  private tick(events: DomainEvent[]): void {
    const pending = this.commands.splice(0);
    let shouldCompactStacks = false;
    for (const command of pending) {
      if (command.type === 'start' && this.phase === 'ready') {
        this.phase = 'running';
        events.push({ type: 'gameStarted' });
      } else if (command.type === 'pause' && this.phase === 'running') {
        this.phase = 'paused';
        events.push({ type: 'gamePaused' });
      } else if (command.type === 'resume' && this.phase === 'paused') {
        this.phase = 'running';
        events.push({ type: 'gameResumed' });
      } else if (command.type === 'launch') {
        shouldCompactStacks = this.processLaunch(command.source, events) || shouldCompactStacks;
      }
    }
    if (shouldCompactStacks) {
      const occupied = this.stacks.filter((stack) => stack.length > 0);
      this.stacks = [
        ...occupied,
        ...Array.from({ length: this.stacks.length - occupied.length }, () => []),
      ];
    }
    if (this.phase !== 'running') return;

    const travelDistance = this.level.speedTrackUnitsPerSecond * (FIXED_STEP_MS / 1000);
    const scheduled = collectTrackEvents(this.active, travelDistance, this.route);
    for (const event of scheduled) {
      const container = this.active.find((item) => item.launchId === event.launchId);
      if (!container || this.phase !== 'running') continue;
      if (event.type === 'control') this.resolveControlPoint(container, event.controlPoint, events);
      else this.resolveLap(container, events);
    }
    this.active.forEach((container) => { container.distance += travelDistance; });
  }

  private processLaunch(source: LaunchSource, events: DomainEvent[]): boolean {
    if (this.phase !== 'running' || this.active.length >= MAX_ACTIVE_CONTAINERS) return false;
    const seed = source.kind === 'stack'
      ? this.stacks[source.index]?.shift()
      : this.takeBuffer(source.index, events);
    if (!seed) return false;
    const container = {
      launchId: this.nextLaunchId++,
      color: seed.color,
      ammo: seed.ammo,
      distance: 0,
    };
    this.active.push(container);
    events.push({
      type: 'containerLaunched',
      launchId: container.launchId,
      source,
      color: container.color,
      ammo: container.ammo,
    });
    return source.kind === 'stack' && this.stacks[source.index]?.length === 0;
  }

  private takeBuffer(index: number, events: DomainEvent[]): ContainerSeed | undefined {
    const seed = this.buffer[index] ?? undefined;
    if (!seed) return undefined;
    this.buffer[index] = null;
    if (this.danger) {
      this.danger = false;
      events.push({ type: 'dangerExited' });
    }
    return seed;
  }

  private resolveControlPoint(
    container: MutableActiveContainer,
    point: ControlPoint,
    events: DomainEvent[],
  ): void {
    const target = traceFirstOccupied(this.board, point.ray);
    if (!target || target.color !== container.color) return;
    removePixel(this.board, target.x, target.y);
    container.ammo -= 1;
    events.push({ type: 'pixelDestroyed', launchId: container.launchId, ...target });
    if (container.ammo === 0) {
      this.active = this.active.filter((item) => item.launchId !== container.launchId);
      events.push({ type: 'containerDepleted', launchId: container.launchId });
    }
    if (countPixels(this.board) === 0) {
      this.phase = 'won';
      events.push({ type: 'gameWon' });
    }
  }

  private resolveLap(container: MutableActiveContainer, events: DomainEvent[]): void {
    if (container.ammo === 0) return;
    const slot = this.buffer.findIndex((item) => item === null);
    if (slot === -1) {
      this.phase = 'lost';
      events.push({ type: 'gameLost' });
      return;
    }
    this.buffer[slot] = { color: container.color, ammo: container.ammo };
    this.active = this.active.filter((item) => item.launchId !== container.launchId);
    events.push({
      type: 'containerBuffered',
      launchId: container.launchId,
      slot,
      color: container.color,
      ammo: container.ammo,
    });
    if (this.buffer.every(Boolean) && !this.danger) {
      this.danger = true;
      events.push({ type: 'dangerEntered' });
    }
  }
}
