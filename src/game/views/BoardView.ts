import type Phaser from 'phaser';
import type { GameSnapshot } from '../../core/model';
import { LAYOUT } from '../layout';

export const COLOR_HEX = {
  blue: 0x3b82f6,
  green: 0x22c55e,
  orange: 0xf59e0b,
  pink: 0xec4899,
} as const;

export class BoardView {
  private readonly graphics: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene) {
    this.graphics = scene.add.graphics();
  }

  render(snapshot: GameSnapshot): void {
    this.graphics.clear();
    const rows = snapshot.board.length;
    const columns = snapshot.board[0]?.length ?? 0;
    if (rows === 0 || columns === 0) return;
    const cellWidth = LAYOUT.board.width / columns;
    const cellHeight = LAYOUT.board.height / rows;
    snapshot.board.forEach((row, y) => row.forEach((color, x) => {
      if (!color) return;
      this.graphics.fillStyle(COLOR_HEX[color]);
      this.graphics.fillRoundedRect(
        LAYOUT.board.x + x * cellWidth + 1,
        LAYOUT.board.y + y * cellHeight + 1,
        cellWidth - 2,
        cellHeight - 2,
        4,
      );
    }));
  }
}
