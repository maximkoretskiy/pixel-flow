import Phaser from 'phaser';
import { GameScene } from './GameScene';
import { GAME_HEIGHT, GAME_WIDTH } from './layout';

export function createGame(parent: HTMLElement, initialLevelId: string): Phaser.Game {
  parent.dataset.phase = 'ready';
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    backgroundColor: '#111827',
    scene: [new GameScene(initialLevelId)],
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    render: { antialias: true, pixelArt: false },
  });
}
