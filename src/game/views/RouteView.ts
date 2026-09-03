import type Phaser from 'phaser';
import type { GameSnapshot } from '../../core/model';
import { LAYOUT } from '../layout';
import { trackPoint } from '../track-geometry';
import { COLOR_HEX } from './BoardView';

type ActiveVisual = {
  readonly node: Phaser.GameObjects.Container;
  readonly label: Phaser.GameObjects.Text;
};

export class RouteView {
  private readonly visuals = new Map<number, ActiveVisual>();

  constructor(private readonly scene: Phaser.Scene, private readonly routeLength: number) {
    scene.add.graphics().lineStyle(14, 0x64748b).strokeRoundedRect(
      LAYOUT.route.x,
      LAYOUT.route.y,
      LAYOUT.route.width,
      LAYOUT.route.height,
      30,
    );
  }

  render(snapshot: GameSnapshot): void {
    const live = new Set(snapshot.active.map(({ launchId }) => launchId));
    for (const [launchId, visual] of this.visuals) {
      if (!live.has(launchId)) {
        visual.node.destroy(true);
        this.visuals.delete(launchId);
      }
    }
    for (const container of snapshot.active) {
      let visual = this.visuals.get(container.launchId);
      if (!visual) {
        const body = this.scene.add.rectangle(0, 0, 38, 28, COLOR_HEX[container.color])
          .setStrokeStyle(2, 0x0f172a);
        const label = this.scene.add.text(0, 0, String(container.ammo), {
          fontFamily: 'system-ui',
          fontSize: '15px',
          color: '#ffffff',
        }).setOrigin(0.5);
        visual = { node: this.scene.add.container(0, 0, [body, label]), label };
        this.visuals.set(container.launchId, visual);
      }
      visual.label.setText(String(container.ammo));
      const point = trackPoint(container.distance % this.routeLength, this.routeLength);
      visual.node.setPosition(point.x, point.y).setRotation(point.angle);
    }
  }

  getPosition(launchId: number): { readonly x: number; readonly y: number } | undefined {
    const visual = this.visuals.get(launchId);
    if (!visual) return undefined;
    return { x: visual.node.x, y: visual.node.y };
  }
}
