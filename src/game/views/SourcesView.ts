import type Phaser from 'phaser';
import type { ContainerSeed, GameSnapshot, LaunchSource } from '../../core/model';
import type { Rect } from '../layout';
import { LAYOUT } from '../layout';
import { COLOR_HEX } from './BoardView';

export class SourcesView {
  private readonly graphics: Phaser.GameObjects.Graphics;
  private readonly labels: Phaser.GameObjects.Text[] = [];

  constructor(private readonly scene: Phaser.Scene, onLaunch: (source: LaunchSource) => void) {
    this.graphics = scene.add.graphics();
    const addZone = (rect: Rect, source: LaunchSource) => {
      const zone = scene.add.zone(rect.x, rect.y, rect.width, rect.height).setOrigin(0).setInteractive();
      const pressedOverlay = scene.add.rectangle(
        rect.x + rect.width / 2,
        rect.y + rect.height / 2,
        rect.width,
        rect.height,
        0xffffff,
        0.18,
      ).setVisible(false);
      zone.on('pointerdown', () => pressedOverlay.setVisible(true));
      zone.on('pointerout', () => pressedOverlay.setVisible(false));
      zone.on('pointerup', () => {
        pressedOverlay.setVisible(false);
        onLaunch(source);
      });
    };
    LAYOUT.bufferSlots.forEach((rect, index) => addZone(rect, { kind: 'buffer', index }));
    LAYOUT.stackTargets.forEach((rect, index) => addZone(rect, { kind: 'stack', index }));
  }

  render(snapshot: GameSnapshot): void {
    this.graphics.clear();
    this.labels.splice(0).forEach((label) => label.destroy());
    const drawSeed = (seed: ContainerSeed, rect: Rect) => {
      this.graphics.fillStyle(COLOR_HEX[seed.color]).fillRoundedRect(
        rect.x,
        rect.y,
        rect.width,
        rect.height,
        12,
      );
      this.labels.push(this.scene.add.text(
        rect.x + rect.width / 2,
        rect.y + rect.height / 2,
        String(seed.ammo),
        { fontFamily: 'system-ui', fontSize: '18px', color: '#ffffff' },
      ).setOrigin(0.5));
    };
    const firstSlot = LAYOUT.bufferSlots[0];
    const lastSlot = LAYOUT.bufferSlots.at(-1);
    if (snapshot.danger && firstSlot && lastSlot) {
      const width = lastSlot.x + lastSlot.width - firstSlot.x;
      this.graphics.fillStyle(0xef4444, 0.2).fillRoundedRect(firstSlot.x - 4, firstSlot.y - 4, width + 8, firstSlot.height + 8, 14);
      this.graphics.lineStyle(4, 0xef4444).strokeRoundedRect(firstSlot.x - 4, firstSlot.y - 4, width + 8, firstSlot.height + 8, 14);
    }
    LAYOUT.bufferSlots.forEach((rect, index) => {
      this.graphics.lineStyle(2, 0x64748b)
        .strokeRoundedRect(rect.x, rect.y, rect.width, rect.height, 10);
      const seed = snapshot.buffer[index];
      if (seed) drawSeed(seed, rect);
    });
    LAYOUT.stackTargets.forEach((target, stackIndex) => {
      const stack = snapshot.stacks[stackIndex];
      stack.forEach((seed, itemIndex) => drawSeed(seed, {
        x: target.x,
        y: target.y + itemIndex * 54,
        width: target.width,
        height: 48,
      }));
    });
  }
}
