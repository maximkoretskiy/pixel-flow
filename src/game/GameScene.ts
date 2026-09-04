import Phaser from 'phaser';
import type { DomainEvent, GamePhase, GameSnapshot } from '../core/model';
import { buildRoute } from '../core/route';
import { GameSimulation } from '../core/simulation';
import { LEVEL_CATALOG, getLevelById } from '../levels/catalog';
import type { LevelArtifact } from '../level-tools/types';
import { LAYOUT } from './layout';
import { trackPoint } from './track-geometry';
import { BoardView, COLOR_HEX } from './views/BoardView';
import { RouteView } from './views/RouteView';
import { SourcesView } from './views/SourcesView';
import { OverlayView } from './views/OverlayView';
import { HeaderView } from './views/HeaderView';
import { LevelSelectorView } from './views/LevelSelectorView';
import type { OverlayAction } from './views/OverlayView';
import { bindVisibility } from './visibility-controller';
import { getNextLevel, writeLevelSelection } from '../levels/selection';

export class GameScene extends Phaser.Scene {
  private simulation!: GameSimulation;
  private boardView!: BoardView;
  private routeView!: RouteView;
  private sourcesView!: SourcesView;
  private headerView!: HeaderView;
  private overlayView!: OverlayView;
  private levelSelectorView!: LevelSelectorView;
  private unbindVisibility?: () => void;
  private fatalError = false;
  private errorLogged = false;
  private entry!: LevelArtifact;
  private routeLength = 0;
  private resumeAfterSelector = false;

  constructor(private readonly initialLevelId: string = LEVEL_CATALOG[0].id) {
    super('pixel-flow');
  }

  init(data?: { readonly levelId?: string }): void {
    this.entry = getLevelById(data?.levelId ?? this.initialLevelId) ?? LEVEL_CATALOG[0];
    this.routeLength = buildRoute(
      this.entry.level.board.width,
      this.entry.level.board.height,
    ).length;
  }

  create(): void {
    this.simulation = new GameSimulation(this.entry.level);
    this.fatalError = false;
    this.errorLogged = false;
    this.boardView = new BoardView(this);
    this.routeView = new RouteView(this, this.routeLength);
    this.sourcesView = new SourcesView(this, (source) => {
      this.simulation.dispatch({ type: 'launch', source });
    });
    this.headerView = new HeaderView(
      this,
      `${this.entry.ordinal}. ${this.entry.title}`,
      () => this.openLevelSelector(),
    );
    this.overlayView = new OverlayView(this, (action) => this.handleOverlayAction(action));
    this.levelSelectorView = new LevelSelectorView(
      this,
      LEVEL_CATALOG,
      (entry) => this.selectLevel(entry.id),
      () => this.closeLevelSelector(),
    );
    this.unbindVisibility = bindVisibility(document, () => {
      this.simulation.dispatch({ type: 'pause' });
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.shutdown, this);
    this.renderSnapshot();
  }

  update(_time: number, delta: number): void {
    if (this.fatalError) return;
    try {
      const events = this.simulation.advance(delta);
      this.playEvents(events);
      this.renderSnapshot();
    } catch (error) {
      this.enterFatal(error);
    }
  }

  private renderSnapshot(): void {
    const snapshot = this.simulation.getSnapshot();
    this.boardView.render(snapshot);
    this.routeView.render(snapshot);
    this.sourcesView.render(snapshot);
    const phase = this.fatalError ? 'error' : snapshot.phase;
    this.headerView.render(phase, snapshot.danger);
    this.overlayView.render(phase, Boolean(getNextLevel(this.entry.id)));
    this.setObservability(snapshot, phase);
  }

  private handleOverlayAction(action: OverlayAction): void {
    if (action === 'start') this.simulation.dispatch({ type: 'start' });
    else if (action === 'continue') this.simulation.dispatch({ type: 'resume' });
    else if (action === 'levels') this.openLevelSelector();
    else if (action === 'next') {
      const next = getNextLevel(this.entry.id);
      if (next) this.selectLevel(next.id);
    } else this.scene.restart({ levelId: this.entry.id });
  }

  private openLevelSelector(): void {
    this.resumeAfterSelector = this.simulation.getSnapshot().phase === 'running';
    if (this.resumeAfterSelector) this.simulation.dispatch({ type: 'pause' });
    this.levelSelectorView.show();
  }

  private closeLevelSelector(): void {
    this.levelSelectorView.hide();
    if (this.resumeAfterSelector) this.simulation.dispatch({ type: 'resume' });
    this.resumeAfterSelector = false;
  }

  private selectLevel(levelId: string): void {
    writeLevelSelection(levelId, 'push');
    this.scene.restart({ levelId });
  }

  private setObservability(snapshot: GameSnapshot, phase: GamePhase): void {
    const root = this.game.canvas.parentElement;
    if (!(root instanceof HTMLElement)) throw new Error('Game canvas has no HTMLElement parent');
    root.dataset.phase = phase;
    root.dataset.levelId = this.entry.id;
    root.dataset.levelSelector = this.levelSelectorView.isVisible() ? 'open' : 'closed';
    root.dataset.activeContainers = String(snapshot.active.length);
    root.dataset.bufferedContainers = String(snapshot.buffer.filter(Boolean).length);
    root.dataset.remainingPixels = String(snapshot.board.flat().filter(Boolean).length);
  }

  private enterFatal(error: unknown): void {
    this.fatalError = true;
    if (!this.errorLogged) {
      this.errorLogged = true;
      console.error(error);
    }
    try {
      this.renderSnapshot();
    } catch (renderError) {
      if (!this.errorLogged) console.error(renderError);
    }
  }

  private shutdown(): void {
    this.unbindVisibility?.();
    this.unbindVisibility = undefined;
  }

  private playEvents(events: readonly DomainEvent[]): void {
    for (const event of events) {
      if (event.type !== 'pixelDestroyed') continue;
      this.animateDestroyedPixel(event);
    }
  }

  private animateDestroyedPixel(event: Extract<DomainEvent, { type: 'pixelDestroyed' }>): void {
    const renderedPoint = this.routeView.getPosition(event.launchId);
    const source = this.simulation.getSnapshot().active.find((item) => item.launchId === event.launchId);
    const sourcePoint = renderedPoint ?? (source
      ? trackPoint(source.distance % this.routeLength, this.routeLength)
      : { x: LAYOUT.route.x, y: LAYOUT.route.y });
    const cellWidth = LAYOUT.board.width / this.entry.level.board.width;
    const cellHeight = LAYOUT.board.height / this.entry.level.board.height;
    const targetX = LAYOUT.board.x + (event.x + 0.5) * cellWidth;
    const targetY = LAYOUT.board.y + (event.y + 0.5) * cellHeight;
    const tracer = this.add.line(0, 0, sourcePoint.x, sourcePoint.y, targetX, targetY, COLOR_HEX[event.color], 0.9)
      .setOrigin(0)
      .setLineWidth(3);
    const burst = this.add.rectangle(targetX, targetY, cellWidth - 2, cellHeight - 2, COLOR_HEX[event.color]);
    this.tweens.add({ targets: tracer, alpha: 0, duration: 120, onComplete: () => tracer.destroy() });
    this.tweens.add({
      targets: burst,
      alpha: 0,
      scale: 1.25,
      duration: 120,
      onComplete: () => burst.destroy(),
    });
  }
}
