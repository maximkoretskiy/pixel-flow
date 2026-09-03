import type { LevelDefinition, PixelSeed } from '../core/model';

const cells: PixelSeed[] = [];
const rows = ['BBB', 'BPB', 'BBB'] as const;
const symbols = { B: 'blue', P: 'pink' } as const;
rows.forEach((row, y) => [...row].forEach((symbol, x) => {
  cells.push({ x, y, color: symbols[symbol as keyof typeof symbols] });
}));

export const LEVEL_ONE: LevelDefinition = {
  id: 'level-one',
  board: { width: 3, height: 3, cells },
  stacks: [
    [{ color: 'pink', ammo: 1 }, { color: 'blue', ammo: 8 }],
    [{ color: 'orange', ammo: 1 }, { color: 'green', ammo: 1 }],
    [{ color: 'green', ammo: 1 }, { color: 'orange', ammo: 1 }],
    [{ color: 'orange', ammo: 1 }, { color: 'green', ammo: 1 }],
  ],
  speedTrackUnitsPerSecond: 6,
};
