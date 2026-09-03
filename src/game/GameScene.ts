import Phaser from 'phaser';
import type { DomainEvent } from '../core/model';
import { buildRoute } from '../core/route';
import { FIXED_STEP_MS, GameSimulation } from '../core/simulation';
import { LEVEL_ONE } from '../levels/level-one';
import { LAYOUT } from './layout';
import { trackPoint } from './track-geometry';
import { BoardView, COLOR_HEX } from './views/BoardView';
import { RouteView } from './views/RouteView';
import { SourcesView } from './views/SourcesView';

export class GameScene extends Phaser.Scene {
  private readonly simulation = new GameSimulation(LEVEL_ONE);
  private boardView!: BoardView;
  private routeView!: RouteView;
  private sourcesView!: SourcesView;
  private readonly routeLength = buildRoute(LEVEL_ONE.board.width, LEVEL_ONE.board.height).length;

  constructor() {
    super('pixel-flow');
  }

  create(): void {
    this.boardView = new BoardView(this);
    this.routeView = new RouteView(this, this.routeLength);
    this.sourcesView = new SourcesView(this, (source) => {
      this.simulation.dispatch({ type: 'launch', source });
    });
    this.simulation.dispatch({ type: 'start' });
    this.simulation.advance(FIXED_STEP_MS);
    this.renderSnapshot();
  }

  update(_time: number, delta: number): void {
    const events = this.simulation.advance(delta);
    this.playEvents(events);
    this.renderSnapshot();
  }

  private renderSnapshot(): void {
    const snapshot = this.simulation.getSnapshot();
    this.boardView.render(snapshot);
    this.routeView.render(snapshot);
    this.sourcesView.render(snapshot);
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
    const cellWidth = LAYOUT.board.width / LEVEL_ONE.board.width;
    const cellHeight = LAYOUT.board.height / LEVEL_ONE.board.height;
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
