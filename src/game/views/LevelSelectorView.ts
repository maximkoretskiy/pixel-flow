import type Phaser from 'phaser';
import type { LevelArtifact } from '../../level-tools/types';
import { GAME_HEIGHT, GAME_WIDTH, LAYOUT } from '../layout';

type VisibleObject = { setVisible(visible: boolean): unknown };

export class LevelSelectorView {
  private readonly objects: VisibleObject[] = [];
  private visible = false;

  constructor(
    scene: Phaser.Scene,
    entries: readonly LevelArtifact[],
    onSelect: (entry: LevelArtifact) => void,
    onClose: () => void = () => undefined,
  ) {
    const scrim = scene.add.rectangle(
      GAME_WIDTH / 2,
      GAME_HEIGHT / 2,
      GAME_WIDTH,
      GAME_HEIGHT,
      0x0f172a,
      0.96,
    ).setDepth(200).setInteractive();
    scrim.on('pointerup', onClose);
    this.objects.push(scrim);

    this.objects.push(scene.add.text(20, 106, 'Choose a level', {
      fontFamily: 'system-ui',
      fontSize: '28px',
      color: '#f8fafc',
      fontStyle: 'bold',
    }).setDepth(201));
    this.objects.push(scene.add.text(GAME_WIDTH - 20, 116, 'tap outside to close', {
      fontFamily: 'system-ui',
      fontSize: '12px',
      color: '#94a3b8',
    }).setOrigin(1, 0).setDepth(201));

    entries.forEach((entry, index) => {
      const cell = LAYOUT.levelSelectorCells[index];
      if (!cell) return;
      const panel = scene.add.rectangle(cell.width / 2, cell.height / 2, cell.width, cell.height, 0x1e293b)
        .setStrokeStyle(2, entry.requiresFullBuffer ? 0xf59e0b : 0x475569);
      const number = scene.add.text(10, 8, String(entry.ordinal).padStart(2, '0'), {
        fontFamily: 'system-ui', fontSize: '17px', color: '#93c5fd', fontStyle: 'bold',
      });
      const title = scene.add.text(10, 33, entry.title, {
        fontFamily: 'system-ui', fontSize: '13px', color: '#f8fafc', wordWrap: { width: 88 },
      });
      const score = scene.add.text(cell.width - 9, 9, String(entry.difficulty), {
        fontFamily: 'system-ui', fontSize: '13px', color: '#cbd5e1',
      }).setOrigin(1, 0);
      const container = scene.add.container(cell.x, cell.y, [panel, number, title, score])
        .setDepth(201)
        .setSize(cell.width, cell.height)
        .setInteractive({ useHandCursor: true });
      container.on('pointerup', () => onSelect(entry));
      container.on('pointerover', () => panel.setFillStyle(0x334155));
      container.on('pointerout', () => panel.setFillStyle(0x1e293b));
      this.objects.push(container);
    });
    this.hide();
  }

  show(): void {
    this.visible = true;
    this.objects.forEach((object) => object.setVisible(true));
  }

  hide(): void {
    this.visible = false;
    this.objects.forEach((object) => object.setVisible(false));
  }

  isVisible(): boolean {
    return this.visible;
  }
}
