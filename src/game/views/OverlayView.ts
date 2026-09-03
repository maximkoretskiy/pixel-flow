import type Phaser from 'phaser';
import type { GamePhase } from '../../core/model';
import { GAME_HEIGHT, GAME_WIDTH } from '../layout';

type OverlayPhase = Exclude<GamePhase, 'running'>;

const COPY = {
  ready: { title: 'Pixel Flow', action: 'Start' },
  paused: { title: 'Paused', action: 'Continue' },
  won: { title: 'Level complete', action: 'Restart' },
  lost: { title: 'Buffer overflow', action: 'Restart' },
  error: { title: 'Something went wrong', action: 'Restart' },
} as const satisfies Record<OverlayPhase, { readonly title: string; readonly action: string }>;

export class OverlayView {
  private readonly scrim: Phaser.GameObjects.Rectangle;
  private readonly title: Phaser.GameObjects.Text;
  private readonly button: Phaser.GameObjects.Rectangle;
  private readonly buttonLabel: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, onAction: (phase: OverlayPhase) => void) {
    this.scrim = scene.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x0f172a, 0.76)
      .setDepth(100)
      .setInteractive();
    this.title = scene.add.text(GAME_WIDTH / 2, 332, '', {
      fontFamily: 'system-ui',
      fontSize: '28px',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(101);
    this.button = scene.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, 160, 56, 0x2563eb)
      .setStrokeStyle(2, 0x93c5fd)
      .setDepth(101)
      .setInteractive({ useHandCursor: true });
    this.buttonLabel = scene.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, '', {
      fontFamily: 'system-ui',
      fontSize: '20px',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(102);
    this.button.on('pointerup', () => onAction(this.phase));
    this.button.on('pointerover', () => this.button.setFillStyle(0x1d4ed8));
    this.button.on('pointerout', () => this.button.setFillStyle(0x2563eb));
    this.phase = 'ready';
  }

  private phase: OverlayPhase;

  render(phase: GamePhase): void {
    const visible = phase !== 'running';
    this.scrim.setVisible(visible);
    this.title.setVisible(visible);
    this.button.setVisible(visible);
    this.buttonLabel.setVisible(visible);
    if (!visible) return;
    this.phase = phase;
    const copy = COPY[phase];
    this.title.setText(copy.title);
    this.buttonLabel.setText(copy.action);
  }
}
