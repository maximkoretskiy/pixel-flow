import { cloneBoard, createBoard } from './board';
import type { Board } from './board';
import { assertValidLevel } from './level-validator';
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

export class GameSimulation {
  private phase: GamePhase = 'ready';
  private board: Board;
  private stacks: ContainerSeed[][];
  private buffer: Array<ContainerSeed | null> = Array.from({ length: 5 }, () => null);
  private active: ActiveContainer[] = [];
  private danger = false;
  private nextLaunchId = 1;
  private accumulatorMs = 0;
  private readonly commands: GameCommand[] = [];

  constructor(level: LevelDefinition) {
    assertValidLevel(level);
    this.board = createBoard(level.board);
    this.stacks = level.stacks.map((stack) => stack.map((seed) => ({ ...seed })));
  }

  dispatch(command: GameCommand): void {
    this.commands.push(command);
  }

  advance(elapsedMs: number): readonly DomainEvent[] {
    if (!Number.isFinite(elapsedMs) || elapsedMs < 0) {
      throw new RangeError('elapsedMs must be finite and non-negative');
    }
    this.accumulatorMs += elapsedMs;
    const emitted: DomainEvent[] = [];
    while (this.accumulatorMs + Number.EPSILON >= FIXED_STEP_MS) {
      this.tick(emitted);
      this.accumulatorMs -= FIXED_STEP_MS;
    }
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
        this.processLaunch(command.source, events);
      }
    }
  }

  private processLaunch(source: LaunchSource, events: DomainEvent[]): void {
    if (this.phase !== 'running') return;
    const seed = source.kind === 'stack'
      ? this.stacks[source.index]?.shift()
      : this.takeBuffer(source.index, events);
    if (!seed) return;
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
}
