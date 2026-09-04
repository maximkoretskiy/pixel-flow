import type Phaser from 'phaser';
import type { GamePhase } from '../../core/model';
import { GAME_HEIGHT, GAME_WIDTH } from '../layout';

type OverlayPhase = Exclude<GamePhase, 'running'>;
export type OverlayAction = 'start' | 'continue' | 'replay' | 'next' | 'levels';

const TITLES: Record<OverlayPhase, string> = {
  ready: 'Pixel Flow',
  paused: 'Paused',
  won: 'Level complete',
  lost: 'Buffer overflow',
  error: 'Something went wrong',
};

const ACTION_LABELS: Record<OverlayAction, string> = {
  start: 'Start',
  continue: 'Continue',
  replay: 'Replay',
  next: 'Next level',
  levels: 'All levels',
};

export function getOverlayActions(phase: OverlayPhase, hasNext: boolean): readonly OverlayAction[] {
  if (phase === 'ready') return ['start', 'levels'];
  if (phase === 'paused') return ['continue', 'levels'];
  if (phase === 'won') return hasNext ? ['replay', 'next', 'levels'] : ['replay', 'levels'];
  return ['replay', 'levels'];
}

export class OverlayView {
  private readonly scrim: Phaser.GameObjects.Rectangle;
  private readonly title: Phaser.GameObjects.Text;
  private readonly buttons: Phaser.GameObjects.Rectangle[] = [];
  private readonly buttonLabels: Phaser.GameObjects.Text[] = [];
  private actions: readonly OverlayAction[] = [];

  constructor(scene: Phaser.Scene, onAction: (action: OverlayAction) => void) {
    this.scrim = scene.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x0f172a, 0.76)
      .setDepth(100)
      .setInteractive();
    this.title = scene.add.text(GAME_WIDTH / 2, 300, '', {
      fontFamily: 'system-ui', fontSize: '28px', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(101);

    for (let index = 0; index < 3; index += 1) {
      const y = 370 + index * 66;
      const button = scene.add.rectangle(GAME_WIDTH / 2, y, 180, 52, 0x2563eb)
        .setStrokeStyle(2, 0x93c5fd)
        .setDepth(101)
        .setInteractive({ useHandCursor: true });
      const label = scene.add.text(GAME_WIDTH / 2, y, '', {
        fontFamily: 'system-ui', fontSize: '18px', color: '#ffffff', fontStyle: 'bold',
      }).setOrigin(0.5).setDepth(102);
      button.on('pointerup', () => {
        const action = this.actions[index];
        if (action) onAction(action);
      });
      button.on('pointerover', () => button.setFillStyle(0x1d4ed8));
      button.on('pointerout', () => button.setFillStyle(0x2563eb));
      this.buttons.push(button);
      this.buttonLabels.push(label);
    }
  }

  render(phase: GamePhase, hasNext: boolean): void {
    const visible = phase !== 'running';
    this.scrim.setVisible(visible);
    this.title.setVisible(visible);
    this.buttons.forEach((button) => button.setVisible(false));
    this.buttonLabels.forEach((label) => label.setVisible(false));
    if (!visible) return;

    this.title.setText(TITLES[phase]);
    this.actions = getOverlayActions(phase, hasNext);
    this.actions.forEach((action, index) => {
      this.buttons[index].setVisible(true);
      this.buttonLabels[index].setText(ACTION_LABELS[action]).setVisible(true);
    });
  }
}
