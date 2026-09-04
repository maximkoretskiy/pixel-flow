import type Phaser from 'phaser';
import type { GamePhase } from '../../core/model';
import { LAYOUT } from '../layout';

const STATUS_LABELS = {
  ready: 'Ready',
  running: 'In progress',
  paused: 'Paused',
  won: 'Complete',
  lost: 'Lost',
  error: 'Error',
} as const satisfies Record<GamePhase, string>;

export function getStatusLabel(phase: GamePhase, danger: boolean): string {
  return phase === 'running' && danger ? 'Danger' : STATUS_LABELS[phase];
}

export class HeaderView {
  private readonly status: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, levelLabel = 'Level', onOpenLevels: () => void = () => undefined) {
    const header = LAYOUT.header;
    scene.add.rectangle(
      header.x + header.width / 2,
      header.y + header.height / 2,
      header.width,
      header.height,
      0x1e293b,
      0.96,
    ).setStrokeStyle(2, 0x475569).setDepth(150);
    const levelButton = LAYOUT.levelButton;
    const trigger = scene.add.rectangle(
      levelButton.x + levelButton.width / 2,
      levelButton.y + levelButton.height / 2,
      levelButton.width,
      levelButton.height,
      0x1e293b,
      0,
    ).setDepth(151).setInteractive({ useHandCursor: true });
    trigger.on('pointerup', onOpenLevels);
    scene.add.text(header.x + 16, header.y + header.height / 2, levelLabel, {
      fontFamily: 'system-ui',
      fontSize: '18px',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0, 0.5).setDepth(152);
    this.status = scene.add.text(
      header.x + header.width - 16,
      header.y + header.height / 2,
      '',
      { fontFamily: 'system-ui', fontSize: '16px', color: '#cbd5e1' },
    ).setOrigin(1, 0.5).setDepth(152);
  }

  render(phase: GamePhase, danger: boolean): void {
    this.status
      .setText(getStatusLabel(phase, danger))
      .setColor(phase === 'running' && danger ? '#f87171' : '#cbd5e1');
  }
}
