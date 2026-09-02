# Pixel Flow MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build one deterministic, mobile-first Pixel Flow level playable by touch or mouse and deployable as a static GitHub Pages site.

**Architecture:** Keep all rules in a browser-independent TypeScript simulation driven by fixed time steps. Phaser renders immutable snapshots, converts pointer input into commands, and plays domain events without deciding outcomes. A single Vite page owns viewport sizing, lifecycle handling, and static deployment.

**Tech Stack:** Phaser 3, TypeScript, Vite, Vitest, ESLint, Playwright, GitHub Actions, GitHub Pages

**Spec:** `docs/superpowers/specs/2026-09-02-pixel-flow-mvp-design.md`

## Global Constraints

- Ship exactly one handcrafted level with exactly four fully visible stacks and five reusable buffer slots.
- Use one centered portrait layout on mobile and desktop; wide screens receive side margins, not a second layout.
- Every actionable stack top and buffer slot must have a non-overlapping hit area of at least `48 × 48` CSS pixels.
- Multiple containers move concurrently at one fixed speed; they do not collide or overtake.
- A control-point crossing traces through empty cells and stops at the first occupied pixel; it destroys at most one matching pixel.
- Unused ammunition persists between laps; a zero-ammunition container disappears immediately.
- Five occupied buffer slots are danger, not loss; the next live return while full causes loss.
- Win immediately when the last pixel is destroyed.
- Process same-step crossings by ascending launch ID.
- The game core must not import Phaser or browser APIs.
- Pause when the document becomes hidden and require explicit Continue after returning; never simulate background elapsed time.
- Disable document scrolling, overscroll, and browser gestures over the canvas; fullscreen and PWA support are out of scope.
- Use original procedural geometry; do not copy visual assets from the reference game.
- No React, Vue, backend, physics engine, progression, persistence, boosters, keys, durable pixels, or native packaging.
- The spec defines no library version floors; install current releases at execution time and commit `package-lock.json`.
- Before every commit run the relevant tests plus project lint and typecheck; never stage `.env` files or secrets.

---

## File Map

| Path | Responsibility |
|---|---|
| `package.json`, `package-lock.json`, `.gitignore` | Reproducible scripts, dependencies, generated-file exclusions |
| `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json` | Strict browser and tooling compilation |
| `eslint.config.js`, `vite.config.ts`, `vitest.config.ts` | Lint, build, test, and Pages base-path configuration |
| `index.html`, `src/styles.css`, `src/main.ts` | Static shell, no-scroll viewport, game boot |
| `src/core/model.ts` | Domain types shared by level, state, commands, and events |
| `src/core/level-validator.ts` | Runtime validation with actionable issue messages |
| `src/core/board.ts` | Mutable board creation and immutable snapshots |
| `src/core/route.ts` | Clockwise control-point definitions around a grid |
| `src/core/targeting.ts` | First-occupied-cell ray tracing |
| `src/core/track-events.ts` | Deterministic crossings and lap-event scheduling |
| `src/core/simulation.ts` | Command queue, fixed-step updates, shots, buffer, outcomes |
| `src/levels/level-one.ts` | The only handcrafted level definition |
| `src/game/layout.ts` | Virtual portrait geometry and touch target dimensions |
| `src/game/track-geometry.ts` | Map normalized track distance to canvas coordinates |
| `src/game/views/BoardView.ts` | Pixel-grid rendering and destruction feedback |
| `src/game/views/RouteView.ts` | Conveyor and active-container rendering |
| `src/game/views/SourcesView.ts` | Four stacks, five buffer slots, pointer hit areas |
| `src/game/views/OverlayView.ts` | Start, Continue, win, loss, restart, fatal overlays |
| `src/game/GameScene.ts` | Simulation/render orchestration and event playback |
| `src/game/create-game.ts` | Phaser configuration and root observability attributes |
| `src/game/visibility-controller.ts` | Pause-on-hidden lifecycle adapter |
| `playwright.config.ts`, `e2e/game.spec.ts` | Mobile viewport and input smoke tests |
| `.github/workflows/deploy.yml` | Verify, build, and publish `dist/` to Pages |
| `README.md` | Development, verification, deployment, and device QA commands |

---

### Task 1: Bootstrap the Verified Static TypeScript App

**Files:**
- Create: `package.json`
- Create: `package-lock.json`
- Create: `tsconfig.json`
- Create: `tsconfig.app.json`
- Create: `tsconfig.node.json`
- Create: `eslint.config.js`
- Create: `vite.config.ts`
- Create: `vitest.config.ts`
- Create: `index.html`
- Create: `src/app-meta.test.ts`
- Create: `src/app-meta.ts`
- Create: `src/main.ts`
- Create: `src/styles.css`
- Modify: `.gitignore`

**Interfaces:**
- Consumes: none
- Produces: `APP_NAME: "Pixel Flow"`; scripts `dev`, `build`, `preview`, `lint`, `typecheck`, `test`, `test:watch`

- [ ] **Step 1: Install the runtime and development toolchain**

Run:

```bash
npm init -y
npm install phaser
npm install --save-dev typescript vite vitest eslint @eslint/js typescript-eslint @types/node globals
npm pkg set type=module
npm pkg set private=true --json
npm pkg set scripts.dev="vite" scripts.build="tsc -b && vite build" scripts.preview="vite preview" scripts.lint="eslint ." scripts.typecheck="tsc -b" scripts.test="vitest run" scripts.test:watch="vitest"
```

Expected: `package.json` and `package-lock.json` exist; `package.json` contains the declared project scripts.

- [ ] **Step 2: Add strict compiler, lint, build, and test configuration**

Create `tsconfig.json`:

```json
{
  "files": [],
  "references": [
    { "path": "./tsconfig.app.json" },
    { "path": "./tsconfig.node.json" }
  ]
}
```

Create `tsconfig.app.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "noEmit": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "types": ["vite/client"]
  },
  "include": ["src"]
}
```

Create `tsconfig.node.json`:

```json
{
  "compilerOptions": {
    "composite": true,
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "noEmit": true,
    "types": ["node"]
  },
  "include": ["vite.config.ts", "vitest.config.ts"]
}
```

Create `eslint.config.js`:

```js
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';

export default tseslint.config(
  { ignores: ['dist', 'coverage', 'playwright-report', 'test-results'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.ts'],
    languageOptions: { globals: globals.browser },
    rules: { '@typescript-eslint/consistent-type-imports': 'error' },
  },
  { files: ['*.config.ts', 'e2e/**/*.ts'], languageOptions: { globals: globals.node } },
);
```

Create `vite.config.ts`:

```ts
import { defineConfig } from 'vite';

export default defineConfig({
  base: process.env.PAGES_BASE ?? '/',
});
```

Create `vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    coverage: { reporter: ['text', 'html'] },
  },
});
```

- [ ] **Step 3: Write the failing application metadata test**

Create `src/app-meta.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { APP_NAME } from './app-meta';

describe('application metadata', () => {
  it('uses the product name', () => {
    expect(APP_NAME).toBe('Pixel Flow');
  });
});
```

- [ ] **Step 4: Run the test and verify the red state**

Run: `npm test -- src/app-meta.test.ts`

Expected: FAIL because `./app-meta` does not exist.

- [ ] **Step 5: Add the minimal browser shell**

Create `src/app-meta.ts`:

```ts
export const APP_NAME = 'Pixel Flow' as const;
```

Create `index.html`:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover,user-scalable=no" />
    <meta name="theme-color" content="#111827" />
    <title>Pixel Flow</title>
  </head>
  <body>
    <main id="game-root" aria-label="Pixel Flow game"></main>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

Create `src/main.ts`:

```ts
import { APP_NAME } from './app-meta';
import './styles.css';

const root = document.querySelector<HTMLElement>('#game-root');
if (!root) throw new Error('Missing #game-root');
root.textContent = APP_NAME;
```

Create `src/styles.css`:

```css
:root { font-family: system-ui, sans-serif; color: #f8fafc; background: #0f172a; }
* { box-sizing: border-box; }
html, body, #game-root { width: 100%; height: 100%; margin: 0; }
html, body { overflow: hidden; overscroll-behavior: none; }
body { min-height: 100dvh; background: #0f172a; }
#game-root {
  display: grid;
  place-items: center;
  min-height: 100dvh;
  padding: env(safe-area-inset-top) env(safe-area-inset-right)
           env(safe-area-inset-bottom) env(safe-area-inset-left);
  touch-action: none;
  user-select: none;
  -webkit-user-select: none;
}
canvas { display: block; max-width: 100%; max-height: 100%; touch-action: none; }
```

Append generated artifacts to `.gitignore` while preserving `.superpowers/`:

```gitignore
node_modules/
dist/
coverage/
playwright-report/
test-results/
```

- [ ] **Step 6: Verify the bootstrap**

Run:

```bash
npm test -- src/app-meta.test.ts
npm run lint
npm run typecheck
npm run build
```

Expected: test PASS; lint/typecheck/build exit 0; `dist/index.html` exists.

- [ ] **Step 7: Commit the verified bootstrap**

```bash
git add .gitignore package.json package-lock.json tsconfig.json tsconfig.app.json tsconfig.node.json eslint.config.js vite.config.ts vitest.config.ts index.html src
git commit -m "chore: bootstrap Pixel Flow web app"
```

---

### Task 2: Define and Validate Level Data

**Files:**
- Create: `src/core/model.ts`
- Create: `src/core/level-validator.ts`
- Test: `src/core/level-validator.test.ts`

**Interfaces:**
- Consumes: none
- Produces: `ColorId`, `PixelSeed`, `ContainerSeed`, `LevelDefinition`, `LevelValidationError`, `assertValidLevel(level): void`

- [ ] **Step 1: Write failing validator tests**

Create `src/core/level-validator.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import type { LevelDefinition } from './model';
import { assertValidLevel, LevelValidationError } from './level-validator';

const valid: LevelDefinition = {
  id: 'test',
  board: { width: 2, height: 2, cells: [{ x: 0, y: 0, color: 'blue' }] },
  stacks: [[{ color: 'blue', ammo: 1 }], [], [], []],
  speedTrackUnitsPerSecond: 6,
};

describe('assertValidLevel', () => {
  it('accepts a valid four-stack level', () => {
    expect(() => assertValidLevel(valid)).not.toThrow();
  });

  it('reports duplicate cells, unknown colors, bad ammo, and stack count', () => {
    const invalid = {
      ...valid,
      board: {
        ...valid.board,
        cells: [
          { x: 0, y: 0, color: 'blue' },
          { x: 0, y: 0, color: 'ultraviolet' },
        ],
      },
      stacks: [[{ color: 'blue', ammo: 0 }]],
    } as unknown as LevelDefinition;

    expect(() => assertValidLevel(invalid)).toThrow(LevelValidationError);
    try {
      assertValidLevel(invalid);
    } catch (error) {
      expect((error as LevelValidationError).issues).toEqual(expect.arrayContaining([
        'board.cells[1] duplicates coordinate 0,0',
        'board.cells[1].color is unsupported: ultraviolet',
        'stacks must contain exactly 4 stacks',
        'stacks[0][0].ammo must be a positive integer',
      ]));
    }
  });
});
```

- [ ] **Step 2: Run the validator tests and verify failure**

Run: `npm test -- src/core/level-validator.test.ts`

Expected: FAIL because `model.ts` and `level-validator.ts` do not exist.

- [ ] **Step 3: Define the domain model**

Create `src/core/model.ts`:

```ts
export const SUPPORTED_COLORS = ['blue', 'green', 'orange', 'pink'] as const;
export type ColorId = (typeof SUPPORTED_COLORS)[number];

export interface PixelSeed { readonly x: number; readonly y: number; readonly color: ColorId }
export interface ContainerSeed { readonly color: ColorId; readonly ammo: number }
export interface BoardDefinition {
  readonly width: number;
  readonly height: number;
  readonly cells: readonly PixelSeed[];
}
export interface LevelDefinition {
  readonly id: string;
  readonly board: BoardDefinition;
  readonly stacks: readonly (readonly ContainerSeed[])[];
  readonly speedTrackUnitsPerSecond: number;
}
```

- [ ] **Step 4: Implement exact runtime validation**

Create `src/core/level-validator.ts`:

```ts
import { SUPPORTED_COLORS } from './model';
import type { LevelDefinition } from './model';

export class LevelValidationError extends Error {
  constructor(public readonly issues: readonly string[]) {
    super(`Invalid level:\n${issues.join('\n')}`);
    this.name = 'LevelValidationError';
  }
}

export function assertValidLevel(level: LevelDefinition): void {
  const issues: string[] = [];
  const colors = new Set<string>(SUPPORTED_COLORS);
  if (!level.id.trim()) issues.push('id must not be empty');
  if (!Number.isInteger(level.board.width) || level.board.width <= 0) issues.push('board.width must be a positive integer');
  if (!Number.isInteger(level.board.height) || level.board.height <= 0) issues.push('board.height must be a positive integer');
  if (level.stacks.length !== 4) issues.push('stacks must contain exactly 4 stacks');
  if (!Number.isFinite(level.speedTrackUnitsPerSecond) || level.speedTrackUnitsPerSecond <= 0) {
    issues.push('speedTrackUnitsPerSecond must be positive');
  }

  const occupied = new Set<string>();
  level.board.cells.forEach((cell, index) => {
    const key = `${cell.x},${cell.y}`;
    if (!Number.isInteger(cell.x) || !Number.isInteger(cell.y) || cell.x < 0 || cell.y < 0 ||
        cell.x >= level.board.width || cell.y >= level.board.height) {
      issues.push(`board.cells[${index}] is outside the board`);
    }
    if (occupied.has(key)) issues.push(`board.cells[${index}] duplicates coordinate ${key}`);
    occupied.add(key);
    if (!colors.has(cell.color)) issues.push(`board.cells[${index}].color is unsupported: ${cell.color}`);
  });

  level.stacks.forEach((stack, stackIndex) => stack.forEach((container, containerIndex) => {
    if (!colors.has(container.color)) issues.push(`stacks[${stackIndex}][${containerIndex}].color is unsupported: ${container.color}`);
    if (!Number.isInteger(container.ammo) || container.ammo <= 0) {
      issues.push(`stacks[${stackIndex}][${containerIndex}].ammo must be a positive integer`);
    }
  }));

  if (issues.length > 0) throw new LevelValidationError(issues);
}
```

- [ ] **Step 5: Verify and commit level validation**

Run:

```bash
npm test -- src/core/level-validator.test.ts
npm run lint
npm run typecheck
git add src/core/model.ts src/core/level-validator.ts src/core/level-validator.test.ts
git commit -m "feat: validate declarative level data"
```

Expected: tests/lint/typecheck PASS; one atomic feature commit.

---

### Task 3: Build Board, Route, and Blocking Targeting

**Files:**
- Create: `src/core/board.ts`
- Create: `src/core/route.ts`
- Create: `src/core/targeting.ts`
- Test: `src/core/targeting.test.ts`

**Interfaces:**
- Consumes: `BoardDefinition`, `ColorId`
- Produces: `Board`, `Ray`, `ControlPoint`, `createBoard(definition): Board`, `buildRoute(width, height): Route`, `traceFirstOccupied(board, ray): PixelTarget | null`

- [ ] **Step 1: Write the blocking and route-order tests**

Create `src/core/targeting.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { createBoard } from './board';
import { buildRoute } from './route';
import { traceFirstOccupied } from './targeting';

describe('targeting', () => {
  const board = createBoard({
    width: 3,
    height: 3,
    cells: [
      { x: 1, y: 1, color: 'pink' },
      { x: 1, y: 2, color: 'blue' },
    ],
  });

  it('skips empty cells and stops at the first occupied pixel', () => {
    expect(traceFirstOccupied(board, { edge: 'top', index: 1 })).toEqual({ x: 1, y: 1, color: 'pink' });
    expect(traceFirstOccupied(board, { edge: 'bottom', index: 1 })).toEqual({ x: 1, y: 2, color: 'blue' });
  });

  it('returns null for an empty ray', () => {
    expect(traceFirstOccupied(board, { edge: 'left', index: 0 })).toBeNull();
  });

  it('builds clockwise top, right, bottom, left control points', () => {
    const route = buildRoute(2, 1);
    expect(route.length).toBe(6);
    expect(route.controlPoints.map(({ ray }) => ray)).toEqual([
      { edge: 'top', index: 0 }, { edge: 'top', index: 1 },
      { edge: 'right', index: 0 },
      { edge: 'bottom', index: 1 }, { edge: 'bottom', index: 0 },
      { edge: 'left', index: 0 },
    ]);
  });
});
```

- [ ] **Step 2: Run the tests and verify failure**

Run: `npm test -- src/core/targeting.test.ts`

Expected: FAIL because the board, route, and targeting modules do not exist.

- [ ] **Step 3: Implement board creation and removal**

Create `src/core/board.ts`:

```ts
import type { BoardDefinition, ColorId } from './model';

export type Board = Array<Array<ColorId | null>>;

export function createBoard(definition: BoardDefinition): Board {
  const board = Array.from({ length: definition.height }, () =>
    Array<ColorId | null>(definition.width).fill(null));
  definition.cells.forEach(({ x, y, color }) => { board[y][x] = color; });
  return board;
}

export function removePixel(board: Board, x: number, y: number): void { board[y][x] = null; }
export function countPixels(board: Board): number { return board.reduce((sum, row) => sum + row.filter(Boolean).length, 0); }
export function cloneBoard(board: Board): Board { return board.map((row) => [...row]); }
```

- [ ] **Step 4: Implement route construction and ray tracing**

Create `src/core/route.ts`:

```ts
export type Ray =
  | { readonly edge: 'top' | 'bottom'; readonly index: number }
  | { readonly edge: 'left' | 'right'; readonly index: number };

export interface ControlPoint { readonly distance: number; readonly ray: Ray }
export interface Route { readonly length: number; readonly controlPoints: readonly ControlPoint[] }

export function buildRoute(width: number, height: number): Route {
  const rays: Ray[] = [];
  for (let x = 0; x < width; x += 1) rays.push({ edge: 'top', index: x });
  for (let y = 0; y < height; y += 1) rays.push({ edge: 'right', index: y });
  for (let x = width - 1; x >= 0; x -= 1) rays.push({ edge: 'bottom', index: x });
  for (let y = height - 1; y >= 0; y -= 1) rays.push({ edge: 'left', index: y });
  return { length: rays.length, controlPoints: rays.map((ray, index) => ({ distance: index + 0.5, ray })) };
}
```

Create `src/core/targeting.ts`:

```ts
import type { Board } from './board';
import type { ColorId } from './model';
import type { Ray } from './route';

export interface PixelTarget { readonly x: number; readonly y: number; readonly color: ColorId }

export function traceFirstOccupied(board: Board, ray: Ray): PixelTarget | null {
  const height = board.length;
  const width = board[0]?.length ?? 0;
  const coordinates: Array<readonly [number, number]> = [];
  if (ray.edge === 'top') for (let y = 0; y < height; y += 1) coordinates.push([ray.index, y]);
  if (ray.edge === 'bottom') for (let y = height - 1; y >= 0; y -= 1) coordinates.push([ray.index, y]);
  if (ray.edge === 'left') for (let x = 0; x < width; x += 1) coordinates.push([x, ray.index]);
  if (ray.edge === 'right') for (let x = width - 1; x >= 0; x -= 1) coordinates.push([x, ray.index]);
  for (const [x, y] of coordinates) {
    const color = board[y]?.[x] ?? null;
    if (color) return { x, y, color };
  }
  return null;
}
```

- [ ] **Step 5: Verify and commit targeting**

Run:

```bash
npm test -- src/core/targeting.test.ts
npm run lint
npm run typecheck
git add src/core/board.ts src/core/route.ts src/core/targeting.ts src/core/targeting.test.ts
git commit -m "feat: add blocking pixel targeting"
```

Expected: all commands PASS.

---

### Task 4: Add Simulation State and Launch Commands

**Files:**
- Modify: `src/core/model.ts`
- Create: `src/core/simulation.ts`
- Test: `src/core/simulation-commands.test.ts`

**Interfaces:**
- Consumes: `LevelDefinition`, `assertValidLevel`, `createBoard`, `buildRoute`
- Produces: `GameCommand`, `DomainEvent`, `GameSnapshot`, `GameSimulation.dispatch(command): void`, `GameSimulation.advance(elapsedMs): readonly DomainEvent[]`, `GameSimulation.getSnapshot(): GameSnapshot`

- [ ] **Step 1: Write failing ready/start/launch tests**

Create `src/core/simulation-commands.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import type { LevelDefinition } from './model';
import { FIXED_STEP_MS, GameSimulation } from './simulation';

const level: LevelDefinition = {
  id: 'commands',
  board: { width: 1, height: 1, cells: [{ x: 0, y: 0, color: 'blue' }] },
  stacks: [[{ color: 'pink', ammo: 2 }, { color: 'blue', ammo: 1 }], [], [], []],
  speedTrackUnitsPerSecond: 1,
};

describe('GameSimulation commands', () => {
  it('starts ready and processes commands on the next fixed step', () => {
    const game = new GameSimulation(level);
    expect(game.getSnapshot().phase).toBe('ready');
    game.dispatch({ type: 'start' });
    game.dispatch({ type: 'launch', source: { kind: 'stack', index: 0 } });
    const events = game.advance(FIXED_STEP_MS);
    expect(events.map((event) => event.type)).toEqual(['gameStarted', 'containerLaunched']);
    expect(game.getSnapshot().stacks[0][0]).toEqual({ color: 'blue', ammo: 1 });
    expect(game.getSnapshot().active[0]).toMatchObject({ launchId: 1, color: 'pink', ammo: 2, distance: 0 });
  });

  it('ignores stale launches from an empty source', () => {
    const game = new GameSimulation({ ...level, stacks: [[], [], [], []] });
    game.dispatch({ type: 'start' });
    game.dispatch({ type: 'launch', source: { kind: 'stack', index: 0 } });
    expect(game.advance(FIXED_STEP_MS).map((event) => event.type)).toEqual(['gameStarted']);
  });
});
```

- [ ] **Step 2: Run tests and verify failure**

Run: `npm test -- src/core/simulation-commands.test.ts`

Expected: FAIL because `simulation.ts` does not exist.

- [ ] **Step 3: Add command, state, snapshot, and event types**

Append to `src/core/model.ts`:

```ts
export type GamePhase = 'ready' | 'running' | 'paused' | 'won' | 'lost' | 'error';
export type LaunchSource = { readonly kind: 'stack' | 'buffer'; readonly index: number };
export type GameCommand =
  | { readonly type: 'start' | 'pause' | 'resume' }
  | { readonly type: 'launch'; readonly source: LaunchSource };
export interface ActiveContainer { launchId: number; color: ColorId; ammo: number; distance: number }
export interface GameSnapshot {
  readonly phase: GamePhase;
  readonly board: ReadonlyArray<ReadonlyArray<ColorId | null>>;
  readonly stacks: ReadonlyArray<ReadonlyArray<ContainerSeed>>;
  readonly buffer: ReadonlyArray<ContainerSeed | null>;
  readonly active: ReadonlyArray<Readonly<ActiveContainer>>;
  readonly danger: boolean;
}
export type DomainEvent =
  | { readonly type: 'gameStarted' | 'gamePaused' | 'gameResumed' | 'dangerEntered' | 'dangerExited' | 'gameWon' | 'gameLost' }
  | { readonly type: 'containerLaunched'; readonly launchId: number; readonly source: LaunchSource; readonly color: ColorId; readonly ammo: number }
  | { readonly type: 'pixelDestroyed'; readonly launchId: number; readonly x: number; readonly y: number; readonly color: ColorId }
  | { readonly type: 'containerDepleted'; readonly launchId: number }
  | { readonly type: 'containerBuffered'; readonly launchId: number; readonly slot: number; readonly color: ColorId; readonly ammo: number };
```

- [ ] **Step 4: Implement initial state, queued commands, and defensive snapshots**

Create `src/core/simulation.ts` with this complete command-only first increment; Task 6 will add movement inside `tick`:

```ts
import { cloneBoard, createBoard } from './board';
import type { Board } from './board';
import { assertValidLevel } from './level-validator';
import type {
  ActiveContainer, ContainerSeed, DomainEvent, GameCommand, GamePhase,
  GameSnapshot, LaunchSource, LevelDefinition,
} from './model';

export const FIXED_STEP_MS = 1000 / 60;

export class GameSimulation {
  private phase: GamePhase = 'ready';
  private board: Board;
  private stacks: ContainerSeed[][];
  private buffer: Array<ContainerSeed | null> = Array.from({ length: 5 }, () => null);
  private active: ActiveContainer[] = [];
  private danger = false;
  private nextLaunchId = 1;
  private accumulatorMs = 0;
  private readonly commands: GameCommand[] = [];

  constructor(level: LevelDefinition) {
    assertValidLevel(level);
    this.board = createBoard(level.board);
    this.stacks = level.stacks.map((stack) => stack.map((seed) => ({ ...seed })));
  }

  dispatch(command: GameCommand): void { this.commands.push(command); }

  advance(elapsedMs: number): readonly DomainEvent[] {
    if (!Number.isFinite(elapsedMs) || elapsedMs < 0) throw new RangeError('elapsedMs must be finite and non-negative');
    this.accumulatorMs += elapsedMs;
    const emitted: DomainEvent[] = [];
    while (this.accumulatorMs + Number.EPSILON >= FIXED_STEP_MS) {
      this.tick(emitted);
      this.accumulatorMs -= FIXED_STEP_MS;
    }
    return emitted;
  }

  getSnapshot(): GameSnapshot {
    return {
      phase: this.phase,
      board: cloneBoard(this.board),
      stacks: this.stacks.map((stack) => stack.map((seed) => ({ ...seed }))),
      buffer: this.buffer.map((seed) => seed ? { ...seed } : null),
      active: this.active.map((container) => ({ ...container })),
      danger: this.danger,
    };
  }

  private tick(events: DomainEvent[]): void {
    const pending = this.commands.splice(0);
    for (const command of pending) {
      if (command.type === 'start' && this.phase === 'ready') {
        this.phase = 'running';
        events.push({ type: 'gameStarted' });
      } else if (command.type === 'pause' && this.phase === 'running') {
        this.phase = 'paused';
        events.push({ type: 'gamePaused' });
      } else if (command.type === 'resume' && this.phase === 'paused') {
        this.phase = 'running';
        events.push({ type: 'gameResumed' });
      } else if (command.type === 'launch') {
        this.processLaunch(command.source, events);
      }
    }
  }

  private processLaunch(source: LaunchSource, events: DomainEvent[]): void {
    if (this.phase !== 'running') return;
    const seed = source.kind === 'stack'
      ? this.stacks[source.index]?.shift()
      : this.takeBuffer(source.index, events);
    if (!seed) return;
    const container = { launchId: this.nextLaunchId++, color: seed.color, ammo: seed.ammo, distance: 0 };
    this.active.push(container);
    events.push({ type: 'containerLaunched', launchId: container.launchId, source, color: container.color, ammo: container.ammo });
  }

  private takeBuffer(index: number, events: DomainEvent[]): ContainerSeed | undefined {
    const seed = this.buffer[index] ?? undefined;
    if (!seed) return undefined;
    this.buffer[index] = null;
    if (this.danger) {
      this.danger = false;
      events.push({ type: 'dangerExited' });
    }
    return seed;
  }

}
```

- [ ] **Step 5: Verify launch behavior and commit**

Run:

```bash
npm test -- src/core/simulation-commands.test.ts
npm run lint
npm run typecheck
git add src/core/model.ts src/core/simulation.ts src/core/simulation-commands.test.ts
git commit -m "feat: add queued container launches"
```

Expected: tests/lint/typecheck PASS.

---

### Task 5: Schedule Deterministic Track Events

**Files:**
- Create: `src/core/track-events.ts`
- Test: `src/core/track-events.test.ts`

**Interfaces:**
- Consumes: `ActiveContainer`, `Route`
- Produces: `TrackEvent`, `collectTrackEvents(active, travelDistance, route): readonly TrackEvent[]`

- [ ] **Step 1: Write crossing, lap, and tie-order tests**

Create `src/core/track-events.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { buildRoute } from './route';
import { collectTrackEvents } from './track-events';

describe('collectTrackEvents', () => {
  const route = buildRoute(1, 1);

  it('reports every crossed control point and lap in chronological order', () => {
    const events = collectTrackEvents(
      [{ launchId: 2, color: 'blue', ammo: 2, distance: 3.25 }],
      1,
      route,
    );
    expect(events.map((event) => [event.type, event.offset])).toEqual([
      ['control', 0.25],
      ['lap', 0.75],
    ]);
  });

  it('uses launch ID to break same-offset ties', () => {
    const events = collectTrackEvents([
      { launchId: 9, color: 'pink', ammo: 1, distance: 0 },
      { launchId: 3, color: 'blue', ammo: 1, distance: 0 },
    ], 0.5, route);
    expect(events.map((event) => event.launchId)).toEqual([3, 9]);
  });
});
```

- [ ] **Step 2: Run tests and verify failure**

Run: `npm test -- src/core/track-events.test.ts`

Expected: FAIL because `track-events.ts` does not exist.

- [ ] **Step 3: Implement globally sorted scheduled events**

Create `src/core/track-events.ts`:

```ts
import type { ActiveContainer } from './model';
import type { ControlPoint, Route } from './route';

export type TrackEvent =
  | { readonly type: 'control'; readonly launchId: number; readonly offset: number; readonly controlPoint: ControlPoint }
  | { readonly type: 'lap'; readonly launchId: number; readonly offset: number };

export function collectTrackEvents(
  active: readonly ActiveContainer[],
  travelDistance: number,
  route: Route,
): readonly TrackEvent[] {
  const events: TrackEvent[] = [];
  for (const container of active) {
    const start = container.distance;
    const end = start + travelDistance;
    const firstLap = Math.floor(start / route.length);
    const lastLap = Math.floor(end / route.length);
    for (let lap = firstLap; lap <= lastLap; lap += 1) {
      for (const controlPoint of route.controlPoints) {
        const absolute = lap * route.length + controlPoint.distance;
        if (absolute > start && absolute <= end) {
          events.push({ type: 'control', launchId: container.launchId, offset: absolute - start, controlPoint });
        }
      }
      const lapEnd = (lap + 1) * route.length;
      if (lapEnd > start && lapEnd <= end) events.push({ type: 'lap', launchId: container.launchId, offset: lapEnd - start });
    }
  }
  return events.sort((a, b) => a.offset - b.offset || a.launchId - b.launchId ||
    (a.type === 'control' ? -1 : 1));
}
```

- [ ] **Step 4: Verify track scheduling and commit**

Run:

```bash
npm test -- src/core/track-events.test.ts
npm run lint
npm run typecheck
git add src/core/track-events.ts src/core/track-events.test.ts
git commit -m "feat: schedule deterministic track events"
```

Expected: all commands PASS.

---

### Task 6: Resolve Shots, Ammunition, Buffer, Win, and Loss

**Files:**
- Modify: `src/core/simulation.ts`
- Test: `src/core/simulation-rules.test.ts`

**Interfaces:**
- Consumes: `collectTrackEvents`, `traceFirstOccupied`, `removePixel`, `countPixels`
- Produces: complete fixed-step `GameSimulation` rules and the domain events defined in Task 4

- [ ] **Step 1: Write failing targeting and depletion tests**

Create `src/core/simulation-rules.test.ts` with a helper that starts a game and advances exact fixed steps:

```ts
import { describe, expect, it } from 'vitest';
import type { LevelDefinition } from './model';
import { FIXED_STEP_MS, GameSimulation } from './simulation';

function running(level: LevelDefinition): GameSimulation {
  const game = new GameSimulation(level);
  game.dispatch({ type: 'start' });
  game.advance(FIXED_STEP_MS);
  return game;
}

describe('GameSimulation rules', () => {
  it('does not shoot through a mismatched blocker', () => {
    const game = running({
      id: 'blocked',
      board: { width: 1, height: 2, cells: [
        { x: 0, y: 0, color: 'pink' }, { x: 0, y: 1, color: 'blue' },
      ] },
      stacks: [[{ color: 'blue', ammo: 1 }], [], [], []],
      speedTrackUnitsPerSecond: 60,
    });
    game.dispatch({ type: 'launch', source: { kind: 'stack', index: 0 } });
    game.advance(FIXED_STEP_MS);
    expect(game.getSnapshot().board[0][0]).toBe('pink');
    expect(game.getSnapshot().active[0].ammo).toBe(1);
  });

  it('destroys one matching pixel and removes a depleted container', () => {
    const game = running({
      id: 'hit',
      board: { width: 1, height: 2, cells: [
        { x: 0, y: 0, color: 'blue' }, { x: 0, y: 1, color: 'blue' },
      ] },
      stacks: [[{ color: 'blue', ammo: 1 }], [], [], []],
      speedTrackUnitsPerSecond: 60,
    });
    game.dispatch({ type: 'launch', source: { kind: 'stack', index: 0 } });
    const events = game.advance(FIXED_STEP_MS);
    expect(events.map((event) => event.type)).toEqual(expect.arrayContaining(['pixelDestroyed', 'containerDepleted']));
    expect(game.getSnapshot().active).toHaveLength(0);
    expect(game.getSnapshot().board.flat().filter(Boolean)).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Add failing danger, overflow, and win tests**

Append tests that use a one-pixel board, pink containers unable to hit blue, and speed `240` on a `1 × 1` route:

```ts
it('enters danger on five returns and loses on the sixth', () => {
  const stacks = Array.from({ length: 4 }, () => [
    { color: 'pink' as const, ammo: 1 }, { color: 'pink' as const, ammo: 1 },
  ]);
  const game = running({
    id: 'overflow', board: { width: 1, height: 1, cells: [{ x: 0, y: 0, color: 'blue' }] },
    stacks, speedTrackUnitsPerSecond: 240,
  });
  for (let index = 0; index < 4; index += 1) game.dispatch({ type: 'launch', source: { kind: 'stack', index } });
  game.dispatch({ type: 'launch', source: { kind: 'stack', index: 0 } });
  game.advance(FIXED_STEP_MS * 2);
  expect(game.getSnapshot()).toMatchObject({ danger: true, phase: 'running' });
  game.dispatch({ type: 'launch', source: { kind: 'stack', index: 1 } });
  game.advance(FIXED_STEP_MS * 2);
  expect(game.getSnapshot().phase).toBe('lost');
});

it('wins immediately after the last pixel', () => {
  const game = running({
    id: 'win', board: { width: 1, height: 1, cells: [{ x: 0, y: 0, color: 'blue' }] },
    stacks: [[{ color: 'blue', ammo: 2 }], [], [], []], speedTrackUnitsPerSecond: 60,
  });
  game.dispatch({ type: 'launch', source: { kind: 'stack', index: 0 } });
  expect(game.advance(FIXED_STEP_MS).at(-1)?.type).toBe('gameWon');
  expect(game.getSnapshot().phase).toBe('won');
});

it('can relaunch any occupied buffer slot and exits danger first', () => {
  const stacks = Array.from({ length: 4 }, () => [
    { color: 'pink' as const, ammo: 1 }, { color: 'pink' as const, ammo: 1 },
  ]);
  const game = running({
    id: 'relaunch', board: { width: 1, height: 1, cells: [{ x: 0, y: 0, color: 'blue' }] },
    stacks, speedTrackUnitsPerSecond: 240,
  });
  for (let index = 0; index < 4; index += 1) game.dispatch({ type: 'launch', source: { kind: 'stack', index } });
  game.dispatch({ type: 'launch', source: { kind: 'stack', index: 0 } });
  game.advance(FIXED_STEP_MS * 2);
  game.dispatch({ type: 'launch', source: { kind: 'buffer', index: 3 } });
  const events = game.advance(FIXED_STEP_MS);
  expect(events.some((event) => event.type === 'dangerExited')).toBe(true);
  expect(events.some((event) => event.type === 'containerLaunched' && event.source.kind === 'buffer' && event.source.index === 3)).toBe(true);
});
```

- [ ] **Step 3: Run rule tests and verify failure**

Run: `npm test -- src/core/simulation-rules.test.ts`

Expected: FAIL because movement, targeting, returns, and outcomes are not resolved.

- [ ] **Step 4: Resolve scheduled events in simulation ticks**

Promote the simulation constructor parameter to `constructor(private readonly level: LevelDefinition)`, add `private readonly route: Route`, and assign `this.route = buildRoute(level.board.width, level.board.height)` after validation. Import `Route`, `ControlPoint`, `buildRoute`, `collectTrackEvents`, `traceFirstOccupied`, `removePixel`, and `countPixels` from their defining modules. After Task 4's command loop, resolve movement in each fixed tick:

```ts
if (this.phase !== 'running') return;
const travelDistance = this.level.speedTrackUnitsPerSecond * (FIXED_STEP_MS / 1000);
const scheduled = collectTrackEvents(this.active, travelDistance, this.route);
for (const event of scheduled) {
  const container = this.active.find((item) => item.launchId === event.launchId);
  if (!container || this.phase !== 'running') continue;
  if (event.type === 'control') this.resolveControlPoint(container, event.controlPoint, events);
  else this.resolveLap(container, events);
}
this.active.forEach((container) => { container.distance += travelDistance; });
```

Implement control-point resolution exactly once per event:

```ts
private resolveControlPoint(container: ActiveContainer, point: ControlPoint, events: DomainEvent[]): void {
  const target = traceFirstOccupied(this.board, point.ray);
  if (!target || target.color !== container.color) return;
  removePixel(this.board, target.x, target.y);
  container.ammo -= 1;
  events.push({ type: 'pixelDestroyed', launchId: container.launchId, ...target });
  if (container.ammo === 0) {
    this.active = this.active.filter((item) => item.launchId !== container.launchId);
    events.push({ type: 'containerDepleted', launchId: container.launchId });
  }
  if (countPixels(this.board) === 0) {
    this.phase = 'won';
    events.push({ type: 'gameWon' });
  }
}
```

Implement lap resolution with the first null slot, five-slot danger, and overflow loss:

```ts
private resolveLap(container: ActiveContainer, events: DomainEvent[]): void {
  if (container.ammo === 0) return;
  const slot = this.buffer.findIndex((item) => item === null);
  if (slot === -1) {
    this.phase = 'lost';
    events.push({ type: 'gameLost' });
    return;
  }
  this.buffer[slot] = { color: container.color, ammo: container.ammo };
  this.active = this.active.filter((item) => item.launchId !== container.launchId);
  events.push({ type: 'containerBuffered', launchId: container.launchId, slot, color: container.color, ammo: container.ammo });
  if (this.buffer.every(Boolean) && !this.danger) {
    this.danger = true;
    events.push({ type: 'dangerEntered' });
  }
}
```

Stop resolving further scheduled events as soon as phase becomes `won` or `lost`. Do not move containers removed by depletion or buffering.

- [ ] **Step 5: Add fixed-step frame-independence coverage**

Append this exact test:

```ts
it('produces the same snapshot for different render-frame timing', () => {
  const level: LevelDefinition = {
    id: 'frames',
    board: { width: 1, height: 2, cells: [
      { x: 0, y: 0, color: 'pink' }, { x: 0, y: 1, color: 'blue' },
    ] },
    stacks: [[{ color: 'blue', ammo: 1 }], [], [], []],
    speedTrackUnitsPerSecond: 1,
  };
  const run = (deltas: readonly number[]) => {
    const game = running(level);
    game.dispatch({ type: 'launch', source: { kind: 'stack', index: 0 } });
    deltas.forEach((delta) => game.advance(delta));
    return game.getSnapshot();
  };
  expect(run(Array.from({ length: 120 }, () => 1000 / 60)))
    .toEqual(run(Array.from({ length: 20 }, () => 100)));
});

it('does not move containers while paused', () => {
  const game = running({
    id: 'pause', board: { width: 1, height: 1, cells: [{ x: 0, y: 0, color: 'blue' }] },
    stacks: [[{ color: 'pink', ammo: 1 }], [], [], []], speedTrackUnitsPerSecond: 1,
  });
  game.dispatch({ type: 'launch', source: { kind: 'stack', index: 0 } });
  game.advance(FIXED_STEP_MS);
  game.dispatch({ type: 'pause' });
  game.advance(FIXED_STEP_MS);
  const pausedDistance = game.getSnapshot().active[0].distance;
  game.advance(1000);
  expect(game.getSnapshot().active[0].distance).toBe(pausedDistance);
});
```

- [ ] **Step 6: Verify all core rules and commit**

Run:

```bash
npm test -- src/core
npm run lint
npm run typecheck
git add src/core/simulation.ts src/core/simulation-rules.test.ts
git commit -m "feat: resolve Pixel Flow game rules"
```

Expected: all core tests PASS, including frame-independence.

---

### Task 7: Add a Solvable Handcrafted Level

**Files:**
- Create: `src/levels/level-one.ts`
- Test: `src/levels/level-one.test.ts`

**Interfaces:**
- Consumes: `LevelDefinition`, `GameSimulation`, `assertValidLevel`
- Produces: `LEVEL_ONE: LevelDefinition`

- [ ] **Step 1: Write the level validation and solution test**

Create `src/levels/level-one.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { FIXED_STEP_MS, GameSimulation } from '../core/simulation';
import { assertValidLevel } from '../core/level-validator';
import { LEVEL_ONE } from './level-one';

describe('LEVEL_ONE', () => {
  it('is valid and has four visible stacks', () => {
    expect(() => assertValidLevel(LEVEL_ONE)).not.toThrow();
    expect(LEVEL_ONE.stacks).toHaveLength(4);
  });

  it('is solvable through the intended buffer loop', () => {
    const game = new GameSimulation(LEVEL_ONE);
    game.dispatch({ type: 'start' });
    game.advance(FIXED_STEP_MS);
    game.dispatch({ type: 'launch', source: { kind: 'stack', index: 0 } });
    game.dispatch({ type: 'launch', source: { kind: 'stack', index: 0 } });
    game.advance(2100);
    expect(game.getSnapshot().buffer[0]).toEqual({ color: 'pink', ammo: 1 });
    expect(game.getSnapshot().board.flat().filter(Boolean)).toEqual(['pink']);
    game.dispatch({ type: 'launch', source: { kind: 'buffer', index: 0 } });
    game.advance(2100);
    expect(game.getSnapshot().phase).toBe('won');
  });
});
```

- [ ] **Step 2: Run the level test and verify failure**

Run: `npm test -- src/levels/level-one.test.ts`

Expected: FAIL because `level-one.ts` does not exist.

- [ ] **Step 3: Define the explicit tutorial board and stacks**

Create `src/levels/level-one.ts`:

```ts
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
    [{ color: 'orange', ammo: 1 }],
    [{ color: 'green', ammo: 1 }],
    [{ color: 'orange', ammo: 1 }],
  ],
  speedTrackUnitsPerSecond: 6,
};
```

The pink top container is blocked at each inward ray on its first lap. The single blue container follows it and removes one nearer ring pixel only after pink has already passed that ray; blue spends all eight rounds, pink returns to the buffer, and its second lap clears the exposed center. The other three visible stacks are optional unsafe choices that teach the cost of launching a color absent from the board.

- [ ] **Step 4: Verify the deterministic solution and commit**

Run:

```bash
npm test -- src/levels/level-one.test.ts
npm run lint
npm run typecheck
git add src/levels/level-one.ts src/levels/level-one.test.ts
git commit -m "feat: add solvable prototype level"
```

Expected: solution test reaches `won` with no timing-dependent assertions.

---

### Task 8: Define Portrait Layout and Track Geometry

**Files:**
- Create: `src/game/layout.ts`
- Create: `src/game/track-geometry.ts`
- Test: `src/game/layout.test.ts`

**Interfaces:**
- Consumes: `Route.length`
- Produces: `GAME_WIDTH = 390`, `GAME_HEIGHT = 780`, `LAYOUT`, `trackPoint(distance, routeLength): {x, y, angle}`

- [ ] **Step 1: Write failing touch-target and route geometry tests**

Create `src/game/layout.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { GAME_HEIGHT, GAME_WIDTH, LAYOUT } from './layout';
import { trackPoint } from './track-geometry';

describe('portrait layout', () => {
  it('fits the virtual canvas and keeps every source target at least 48px', () => {
    expect(GAME_WIDTH).toBe(390);
    expect(GAME_HEIGHT).toBe(780);
    for (const target of [...LAYOUT.bufferSlots, ...LAYOUT.stackTargets]) {
      expect(target.width).toBeGreaterThanOrEqual(48);
      expect(target.height).toBeGreaterThanOrEqual(48);
      expect(target.x).toBeGreaterThanOrEqual(0);
      expect(target.x + target.width).toBeLessThanOrEqual(GAME_WIDTH);
    }
    for (const group of [LAYOUT.bufferSlots, LAYOUT.stackTargets]) {
      for (let index = 1; index < group.length; index += 1) {
        expect(group[index - 1].x + group[index - 1].width).toBeLessThanOrEqual(group[index].x);
      }
    }
  });

  it('maps track distance clockwise around the route rectangle', () => {
    expect(trackPoint(0, 12)).toMatchObject({ x: LAYOUT.route.x, y: LAYOUT.route.y });
    expect(trackPoint(3, 12).x).toBe(LAYOUT.route.x + LAYOUT.route.width);
    expect(trackPoint(6, 12).y).toBe(LAYOUT.route.y + LAYOUT.route.height);
  });
});
```

- [ ] **Step 2: Run tests and verify failure**

Run: `npm test -- src/game/layout.test.ts`

Expected: FAIL because layout modules do not exist.

- [ ] **Step 3: Define one fixed virtual layout**

Create `src/game/layout.ts`:

```ts
export const GAME_WIDTH = 390;
export const GAME_HEIGHT = 780;
export interface Rect { readonly x: number; readonly y: number; readonly width: number; readonly height: number }

export const LAYOUT = {
  header: { x: 20, y: 16, width: 350, height: 44 },
  route: { x: 28, y: 72, width: 334, height: 430 },
  board: { x: 78, y: 148, width: 234, height: 234 },
  bufferSlots: Array.from({ length: 5 }, (_, index): Rect => ({ x: 25 + index * 70, y: 526, width: 60, height: 56 })),
  stackTargets: Array.from({ length: 4 }, (_, index): Rect => ({ x: 25 + index * 92, y: 610, width: 64, height: 154 })),
} as const;
```

Create `src/game/track-geometry.ts`:

```ts
import { LAYOUT } from './layout';

export interface TrackPoint { readonly x: number; readonly y: number; readonly angle: number }

export function trackPoint(distance: number, routeLength: number): TrackPoint {
  if (routeLength <= 0) throw new RangeError('routeLength must be positive');
  const normalized = (((distance % routeLength) + routeLength) % routeLength) / routeLength;
  const { x, y, width, height } = LAYOUT.route;
  if (normalized <= 0.25) {
    return { x: x + width * (normalized / 0.25), y, angle: 0 };
  }
  if (normalized <= 0.5) {
    return { x: x + width, y: y + height * ((normalized - 0.25) / 0.25), angle: Math.PI / 2 };
  }
  if (normalized <= 0.75) {
    return { x: x + width * (1 - (normalized - 0.5) / 0.25), y: y + height, angle: Math.PI };
  }
  return { x, y: y + height * (1 - (normalized - 0.75) / 0.25), angle: -Math.PI / 2 };
}
```

- [ ] **Step 4: Verify layout invariants and commit**

Run:

```bash
npm test -- src/game/layout.test.ts
npm run lint
npm run typecheck
git add src/game/layout.ts src/game/track-geometry.ts src/game/layout.test.ts
git commit -m "feat: define mobile game layout"
```

Expected: layout tests PASS and no hit targets overlap adjacent columns.

---

### Task 9: Render the Board, Conveyor, Sources, and Active Containers

**Files:**
- Create: `src/game/views/BoardView.ts`
- Create: `src/game/views/RouteView.ts`
- Create: `src/game/views/SourcesView.ts`
- Create: `src/game/GameScene.ts`
- Create: `src/game/create-game.ts`
- Modify: `src/main.ts`
- Test: `src/game/view-contracts.test.ts`

**Interfaces:**
- Consumes: `LEVEL_ONE`, `GameSimulation`, `GameSnapshot`, `DomainEvent`, `LAYOUT`, `trackPoint`
- Produces: `BoardView.render(snapshot)`, `RouteView.render(snapshot)`, `SourcesView.render(snapshot)`, `GameScene`, `createGame(parent): Phaser.Game`

- [ ] **Step 1: Write failing view-contract tests**

Create `src/game/view-contracts.test.ts` to import each view class and assert the public method names exist on its prototype:

```ts
import { describe, expect, it } from 'vitest';
import { BoardView } from './views/BoardView';
import { RouteView } from './views/RouteView';
import { SourcesView } from './views/SourcesView';

describe('view contracts', () => {
  it('exposes snapshot render methods', () => {
    expect(typeof BoardView.prototype.render).toBe('function');
    expect(typeof RouteView.prototype.render).toBe('function');
    expect(typeof SourcesView.prototype.render).toBe('function');
  });
});
```

- [ ] **Step 2: Run the contract test and verify failure**

Run: `npm test -- src/game/view-contracts.test.ts`

Expected: FAIL because the view modules do not exist.

- [ ] **Step 3: Implement procedural board and conveyor views**

Create `BoardView` around one `Phaser.GameObjects.Graphics`; `render(snapshot)` redraws only the current immutable board. Use this exact implementation:

```ts
import Phaser from 'phaser';
import type { GameSnapshot } from '../../core/model';
import { LAYOUT } from '../layout';

export const COLOR_HEX = { blue: 0x3b82f6, green: 0x22c55e, orange: 0xf59e0b, pink: 0xec4899 } as const;

export class BoardView {
  private readonly graphics: Phaser.GameObjects.Graphics;
  constructor(scene: Phaser.Scene) { this.graphics = scene.add.graphics(); }

  render(snapshot: GameSnapshot): void {
    this.graphics.clear();
    const rows = snapshot.board.length;
    const columns = snapshot.board[0]?.length ?? 0;
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
```

`RouteView` draws a rounded rectangle at `LAYOUT.route`, then keeps a map keyed by launch ID. Each active visual contains a colored rectangle and ammunition text:

```ts
type ActiveVisual = { node: Phaser.GameObjects.Container; label: Phaser.GameObjects.Text };

export class RouteView {
  private readonly visuals = new Map<number, ActiveVisual>();
  constructor(private readonly scene: Phaser.Scene, private readonly routeLength: number) {
    scene.add.graphics().lineStyle(14, 0x64748b).strokeRoundedRect(
      LAYOUT.route.x, LAYOUT.route.y, LAYOUT.route.width, LAYOUT.route.height, 30,
    );
  }

  render(snapshot: GameSnapshot): void {
    const live = new Set(snapshot.active.map(({ launchId }) => launchId));
    for (const [launchId, visual] of this.visuals) {
      if (!live.has(launchId)) { visual.node.destroy(true); this.visuals.delete(launchId); }
    }
    for (const container of snapshot.active) {
      let visual = this.visuals.get(container.launchId);
      if (!visual) {
        const body = this.scene.add.rectangle(0, 0, 38, 28, COLOR_HEX[container.color]).setStrokeStyle(2, 0x0f172a);
        const label = this.scene.add.text(0, 0, String(container.ammo), { fontFamily: 'system-ui', fontSize: '15px', color: '#ffffff' }).setOrigin(0.5);
        visual = { node: this.scene.add.container(0, 0, [body, label]), label };
        this.visuals.set(container.launchId, visual);
      }
      visual.label.setText(String(container.ammo));
      const point = trackPoint(container.distance % this.routeLength, this.routeLength);
      visual.node.setPosition(point.x, point.y).setRotation(point.angle);
    }
  }
}
```

- [ ] **Step 4: Implement large source hit areas**

`SourcesView` receives `onLaunch(source: LaunchSource): void`. Keep the nine zones stable and redraw only their contents:

```ts
export class SourcesView {
  private readonly graphics: Phaser.GameObjects.Graphics;
  private readonly labels: Phaser.GameObjects.Text[] = [];

  constructor(private readonly scene: Phaser.Scene, onLaunch: (source: LaunchSource) => void) {
    this.graphics = scene.add.graphics();
    const addZone = (rect: Rect, source: LaunchSource) => {
      const zone = scene.add.zone(rect.x, rect.y, rect.width, rect.height).setOrigin(0).setInteractive();
      zone.on('pointerdown', () => zone.setScale(0.96));
      zone.on('pointerout', () => zone.setScale(1));
      zone.on('pointerup', () => { zone.setScale(1); onLaunch(source); });
    };
    LAYOUT.bufferSlots.forEach((rect, index) => addZone(rect, { kind: 'buffer', index }));
    LAYOUT.stackTargets.forEach((rect, index) => addZone(rect, { kind: 'stack', index }));
  }

  render(snapshot: GameSnapshot): void {
    this.graphics.clear();
    this.labels.splice(0).forEach((label) => label.destroy());
    const drawSeed = (seed: ContainerSeed, rect: Rect) => {
      this.graphics.fillStyle(COLOR_HEX[seed.color]).fillRoundedRect(rect.x, rect.y, rect.width, rect.height, 12);
      this.labels.push(this.scene.add.text(rect.x + rect.width / 2, rect.y + rect.height / 2, String(seed.ammo),
        { fontFamily: 'system-ui', fontSize: '18px', color: '#ffffff' }).setOrigin(0.5));
    };
    LAYOUT.bufferSlots.forEach((rect, index) => {
      this.graphics.lineStyle(snapshot.danger ? 4 : 2, snapshot.danger ? 0xef4444 : 0x64748b)
        .strokeRoundedRect(rect.x, rect.y, rect.width, rect.height, 10);
      const seed = snapshot.buffer[index];
      if (seed) drawSeed(seed, rect);
    });
    LAYOUT.stackTargets.forEach((target, stackIndex) => {
      const stack = snapshot.stacks[stackIndex];
      stack.forEach((seed, itemIndex) => drawSeed(seed, {
        x: target.x, y: target.y + itemIndex * 54, width: target.width, height: 48,
      }));
    });
  }
}
```

Import `Rect`, `GameSnapshot`, `ContainerSeed`, `LaunchSource`, and `COLOR_HEX` from their defining modules. Only the full stack column zone launches its current top; lower drawings never get separate interactive zones.

- [ ] **Step 5: Orchestrate simulation and rendering in one scene**

Create `GameScene` with these fields and lifecycle:

```ts
private simulation = new GameSimulation(LEVEL_ONE);
private boardView!: BoardView;
private routeView!: RouteView;
private sourcesView!: SourcesView;

create(): void {
  this.boardView = new BoardView(this);
  this.routeView = new RouteView(this, buildRoute(LEVEL_ONE.board.width, LEVEL_ONE.board.height).length);
  this.sourcesView = new SourcesView(this, (source) => this.simulation.dispatch({ type: 'launch', source }));
  this.simulation.dispatch({ type: 'start' });
  this.simulation.advance(FIXED_STEP_MS);
  this.renderSnapshot();
}

update(_time: number, delta: number): void {
  const events = this.simulation.advance(delta);
  this.playEvents(events);
  this.renderSnapshot();
}
```

Import `FIXED_STEP_MS` with `GameSimulation`. This temporary auto-start makes the rendering slice independently playable; Task 10 removes both auto-start lines when it adds the explicit Start overlay.

`playEvents` draws a short line from the current container position to the destroyed pixel and a 120ms alpha/scale destruction tween for `pixelDestroyed`. Other events update views from the next snapshot; they do not mutate simulation state.

- [ ] **Step 6: Create Phaser boot configuration and replace the bootstrap screen**

Create `src/game/create-game.ts`:

```ts
import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from './layout';
import { GameScene } from './GameScene';

export function createGame(parent: HTMLElement): Phaser.Game {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    backgroundColor: '#111827',
    scene: [GameScene],
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    render: { antialias: true, pixelArt: false },
  });
}
```

Replace `src/main.ts` body with root lookup plus `createGame(root)`. Keep the stylesheet import.

- [ ] **Step 7: Verify rendering contracts and build**

Run:

```bash
npm test -- src/game/view-contracts.test.ts src/game/layout.test.ts
npm run lint
npm run typecheck
npm run build
```

Expected: all commands PASS; local `npm run dev` shows the board, route, five slots, and four stacks.

- [ ] **Step 8: Commit the playable rendering slice**

```bash
git add src/game src/main.ts
git commit -m "feat: render interactive Pixel Flow board"
```

---

### Task 10: Add Session Lifecycle, Overlays, Danger Feedback, and Safe Failure

**Files:**
- Create: `src/game/visibility-controller.ts`
- Create: `src/game/views/OverlayView.ts`
- Modify: `src/game/GameScene.ts`
- Modify: `src/game/create-game.ts`
- Test: `src/game/visibility-controller.test.ts`
- Test: `src/core/simulation-restart.test.ts`

**Interfaces:**
- Consumes: `GameSimulation.dispatch`, `GameSnapshot.phase`, domain events
- Produces: `bindVisibility(document, pause): () => void`, Start/Continue/Restart/fatal overlays, `data-phase` and `data-active-containers` observability attributes

- [ ] **Step 1: Write the failing visibility lifecycle test**

Create `src/game/visibility-controller.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { handleVisibility } from './visibility-controller';

describe('handleVisibility', () => {
  it('pauses when hidden and never resumes automatically', () => {
    const commands: string[] = [];
    handleVisibility(true, () => commands.push('pause'));
    handleVisibility(false, () => commands.push('pause'));
    expect(commands).toEqual(['pause']);
  });
});
```

- [ ] **Step 2: Run the lifecycle test and verify failure**

Run: `npm test -- src/game/visibility-controller.test.ts`

Expected: FAIL because the controller does not exist.

- [ ] **Step 3: Implement visibility binding**

Create `src/game/visibility-controller.ts`:

```ts
export function handleVisibility(hidden: boolean, pause: () => void): void {
  if (hidden) pause();
}

export function bindVisibility(doc: Document, pause: () => void): () => void {
  const listener = () => handleVisibility(doc.hidden, pause);
  doc.addEventListener('visibilitychange', listener);
  return () => doc.removeEventListener('visibilitychange', listener);
}
```

Bind it in `GameScene.create()` and unbind on scene shutdown. Pause dispatches `{ type: 'pause' }`; returning leaves phase `paused` until the player presses Continue and dispatches `{ type: 'resume' }`.

- [ ] **Step 4: Implement overlay states and restart**

Remove Task 9's temporary auto-start. `OverlayView` owns one full-screen translucent rectangle, title, and a `160 × 56` button centered at virtual coordinate `(195, 390)`. Render mappings:

```ts
const COPY = {
  ready: { title: 'Pixel Flow', action: 'Start' },
  paused: { title: 'Paused', action: 'Continue' },
  won: { title: 'Level complete', action: 'Restart' },
  lost: { title: 'Buffer overflow', action: 'Restart' },
  error: { title: 'Something went wrong', action: 'Restart' },
} as const;
```

The constructor already retains the immutable definition from Task 6. Start dispatches `start`, Continue dispatches `resume`, and Restart calls this new public method:

```ts
restart(): void {
  this.phase = 'ready';
  this.board = createBoard(this.level.board);
  this.stacks = this.level.stacks.map((stack) => stack.map((seed) => ({ ...seed })));
  this.buffer = Array.from({ length: 5 }, () => null);
  this.active = [];
  this.danger = false;
  this.nextLaunchId = 1;
  this.accumulatorMs = 0;
  this.commands.length = 0;
}
```

It reconstructs state from the immutable level and emits no stale animation events. The overlay is hidden only during `running`.

Create `src/core/simulation-restart.test.ts`:

```ts
import { expect, it } from 'vitest';
import { LEVEL_ONE } from '../levels/level-one';
import { FIXED_STEP_MS, GameSimulation } from './simulation';

it('restarts from the exact immutable level state', () => {
  const game = new GameSimulation(LEVEL_ONE);
  const initial = game.getSnapshot();
  game.dispatch({ type: 'start' });
  game.dispatch({ type: 'launch', source: { kind: 'stack', index: 0 } });
  game.advance(FIXED_STEP_MS);
  game.restart();
  expect(game.getSnapshot()).toEqual(initial);
});
```

- [ ] **Step 5: Add danger and fatal guards**

When `snapshot.danger` is true, `SourcesView` draws a red `0xef4444` border and translucent fill around the complete buffer strip. Remove it immediately on `dangerExited`.

Wrap `GameScene.update()` in `try/catch`; on an unknown error, stop advancing, log the error once, set the root `data-phase="error"`, and show the error overlay. Restart constructs a fresh simulation and clears all view maps.

- [ ] **Step 6: Add browser observability without exposing mutable state**

After every render, update only string attributes on `#game-root`:

```ts
const root = this.game.canvas.parentElement;
if (!(root instanceof HTMLElement)) throw new Error('Game canvas has no HTMLElement parent');
root.dataset.phase = snapshot.phase;
root.dataset.activeContainers = String(snapshot.active.length);
root.dataset.bufferedContainers = String(snapshot.buffer.filter(Boolean).length);
root.dataset.remainingPixels = String(snapshot.board.flat().filter(Boolean).length);
```

These attributes support accessibility diagnostics and Playwright; never attach `GameSimulation` to `window`.

- [ ] **Step 7: Verify lifecycle and commit**

Run:

```bash
npm test -- src/game/visibility-controller.test.ts src/core/simulation-restart.test.ts src/core
npm run lint
npm run typecheck
npm run build
git add src/core/simulation.ts src/core/simulation-restart.test.ts src/game
git commit -m "feat: add game session lifecycle"
```

Expected: tests/lint/typecheck/build PASS.

---

### Task 11: Add Mobile Browser Smoke Tests and GitHub Pages Deployment

**Files:**
- Modify: `package.json`
- Modify: `tsconfig.node.json`
- Create: `playwright.config.ts`
- Create: `e2e/game.spec.ts`
- Create: `.github/workflows/deploy.yml`
- Create: `README.md`

**Interfaces:**
- Consumes: root `data-*` attributes, Vite `PAGES_BASE`, production build
- Produces: `test:e2e` script and verified Pages deployment workflow

- [ ] **Step 1: Install Playwright and register scripts**

Run:

```bash
npm install --save-dev @playwright/test
npm pkg set scripts.test:e2e="playwright test"
npx playwright install chromium
```

Set `tsconfig.node.json` `include` to:

```json
["vite.config.ts", "vitest.config.ts", "playwright.config.ts", "e2e/**/*.ts"]
```

- [ ] **Step 2: Write the mobile smoke test**

Create `playwright.config.ts`:

```ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  use: { baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:4173', trace: 'on-first-retry' },
  webServer: {
    command: 'npm run preview -- --host 127.0.0.1 --port 4173',
    port: 4173,
    reuseExistingServer: !process.env.CI,
  },
  projects: [{ name: 'mobile-chromium', use: { ...devices['Pixel 7'] } }],
});
```

Create `e2e/game.spec.ts`:

```ts
import { expect, test } from '@playwright/test';

test('fits the mobile viewport and launches the intended stack', async ({ page }) => {
  await page.goto(process.env.PAGES_BASE ?? '/');
  const root = page.locator('#game-root');
  const canvas = page.locator('canvas');
  await expect(canvas).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight)).toBe(true);

  const box = await canvas.boundingBox();
  if (!box) throw new Error('Canvas has no bounding box');
  const point = (x: number, y: number) => ({ x: x * box.width / 390, y: y * box.height / 780 });
  await canvas.click({ position: point(195, 390) });
  await expect(root).toHaveAttribute('data-phase', 'running');
  await canvas.click({ position: point(57, 630) });
  await expect(root).toHaveAttribute('data-active-containers', '1');
});
```

- [ ] **Step 3: Run the browser smoke test**

Run:

```bash
npm run build
npm run test:e2e
```

Expected: PASS. If phase or hit-area assertions fail, fix scene coordinates or hit regions and keep the assertions unchanged.

- [ ] **Step 4: Add the exact GitHub Pages workflow**

Create `.github/workflows/deploy.yml`:

```yaml
name: Verify and deploy
on:
  push:
    branches: [main]
  workflow_dispatch:
permissions:
  contents: read
  pages: write
  id-token: write
concurrency:
  group: pages
  cancel-in-progress: true
jobs:
  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
      - run: npm test
      - run: PAGES_BASE=/pixel-flow/ npm run build
      - run: npx playwright install --with-deps chromium
      - run: npm run test:e2e
        env:
          PAGES_BASE: /pixel-flow/
          PLAYWRIGHT_BASE_URL: http://127.0.0.1:4173
      - uses: actions/configure-pages@v5
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist
      - name: Deploy
        id: deployment
        uses: actions/deploy-pages@v4
```

The repository name is `pixel-flow`, so the production base is exactly `/pixel-flow/`. If the repository is renamed before deployment, change both `PAGES_BASE` values in this workflow in the same commit.

- [ ] **Step 5: Document development and physical-device QA**

Create `README.md` with these exact sections and commands:

````markdown
# Pixel Flow

One-level mobile-first real-time color puzzle prototype.

## Develop

```bash
npm ci
npm run dev
```

## Verify

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e
```

## Device QA

- Safari on a current iPhone: no page scroll, pull-to-refresh, accidental zoom, clipped safe areas, or background-time jumps.
- Chrome on a current Android phone: same checks plus accurate taps on all four stacks and five buffer slots.
- On both devices: complete the scripted level, force five buffered containers to see danger styling, and verify a sixth return loses.

## Deploy

Enable GitHub Pages with **GitHub Actions** as the source. Push `main`; the workflow verifies and publishes `dist/` under `/pixel-flow/`.
````

- [ ] **Step 6: Run the complete verification gate**

Run:

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e
git diff --check
git status --short
```

Expected: every command exits 0; only Task 11 files are uncommitted; no `.env` or secret file appears.

- [ ] **Step 7: Commit deployment and QA coverage**

```bash
git add package.json package-lock.json tsconfig.node.json playwright.config.ts e2e/game.spec.ts .github/workflows/deploy.yml README.md
git diff --cached --check
git commit -m "chore: verify and deploy Pixel Flow"
```

---

## Final Acceptance Gate

- [ ] Run `npm run lint`.
- [ ] Run `npm run typecheck`.
- [ ] Run `npm test` and confirm deterministic core, level solution, layout, and lifecycle tests pass.
- [ ] Run `npm run build` with `PAGES_BASE=/pixel-flow/`.
- [ ] Run `npm run test:e2e` against the production preview.
- [ ] Play the complete level with mouse and touch emulation.
- [ ] Verify fifth-slot danger, sixth-return loss, last-pixel win, pause/Continue, and Restart.
- [ ] Verify `git status --short` contains no `.env`, secrets, generated reports, or unintended files.
- [ ] Confirm the GitHub Pages workflow succeeds on `main` and open the deployed URL on one iPhone and one Android device.
