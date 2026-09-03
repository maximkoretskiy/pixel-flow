import type { LevelDefinition, PixelSeed } from '../core/model';

const cells: PixelSeed[] = [];
const rows = [
  'BBBBBBBBBBBBBBB',
  'BBBBBBPPPBBBBBB',
  'BBBBPPPPPPPBBBB',
  'BBBPPPPPPPPPBBB',
  'BBBPPPOOOPPPBBB',
  'BBPPPOOOOOPPPBB',
  'BBPPOOOOOOOPPBB',
  'BBPPPOOOOOPPPBB',
  'BBBPPPOOOPPPBBB',
  'BBBBPPPGPPPBBBB',
  'BBBBBBGGGBBBBBB',
  'BBBBBGGGGGBBBBB',
  'BBBGGGGGGGGGBBB',
  'BBBBBBGGGBBBBBB',
  'BBBBBBGGGBBBBBB',
] as const;
const symbols = { B: 'blue', G: 'green', O: 'orange', P: 'pink' } as const;
rows.forEach((row, y) => [...row].forEach((symbol, x) => {
  cells.push({ x, y, color: symbols[symbol as keyof typeof symbols] });
}));

export const LEVEL_ONE: LevelDefinition = {
  id: 'level-one',
  board: { width: 15, height: 15, cells },
  stacks: [
    [{ color: 'blue', ammo: 42 }, { color: 'pink', ammo: 18 }, { color: 'orange', ammo: 8 }],
    [{ color: 'blue', ammo: 42 }, { color: 'pink', ammo: 18 }, { color: 'orange', ammo: 8 }],
    [{ color: 'blue', ammo: 41 }, { color: 'pink', ammo: 17 }, { color: 'orange', ammo: 7 }],
    [{ color: 'green', ammo: 8 }, { color: 'green', ammo: 8 }, { color: 'green', ammo: 8 }],
  ],
  speedTrackUnitsPerSecond: 30,
};
