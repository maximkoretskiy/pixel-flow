# Level Generation Tooling Implementation Plan

**Status:** Completed 2026-09-04. The shipped full-buffer levels use the restricted structural timing certificate documented in the spec instead of exhaustive negative search.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build deterministic level authoring, generation, solving, difficulty scoring, twelve validated trial levels, and unlocked in-game navigation.

**Architecture:** TypeScript recipes compile into boards, a seeded candidate generator constructs stacks, and a finite solver searches the same clonable `GameSimulation` transitions used by Phaser. Accepted levels, robust witness replays, and versioned metrics are emitted into a checked-in static catalog consumed by the runtime selector.

**Tech Stack:** TypeScript 5.9, Node 22, `tsx`, Vitest, Phaser 3, Vite, Playwright.

**Spec:** `docs/superpowers/specs/2026-09-03-level-generation-tooling-design.md`

## Global Constraints

- The core must not import Phaser, DOM, or browser APIs.
- Existing rules remain: four supported colors, exactly four stacks, five buffer slots, and at most five active containers.
- Solver input time is quantized to 50 ms; consecutive inputs are at least 300 ms apart.
- Every accepted witness must pass the deterministic ±150 ms jitter suite.
- `requiresFullBuffer` means a robust win reaches buffer occupancy five and either capped search exhausts or a restricted structural timing certificate verifies necessity.
- Difficulty is an integer in `[0, 100]`, computed by versioned configuration and normalized for board and solution size.
- Runtime generation, progression locks, persistence, accounts, and new game mechanics remain out of scope.
- Run tasks serially. Each task uses red-green-refactor and ends in its own commit.
- Before every commit run `npm run lint`, `npm run typecheck`, and the affected tests; inspect staged names for `.env`, `.pem`, and `.key` files.
- Never add a co-authored-by trailer.

## File Map

### Core simulation and replay

- `src/core/model.ts`: serializable simulation-state and timed-replay contracts.
- `src/core/simulation.ts`: save/fork support and buffer occupancy policy used by constrained solving.
- `src/core/replay.ts`: deterministic execution of timestamped launch actions.
- `src/core/replay.test.ts`: fork equivalence and replay outcome tests.

### Level tooling

- `src/level-tools/types.ts`: recipe, budgets, solver outcomes, validation reports, and catalog artifact types.
- `src/level-tools/ascii-board.ts`: ASCII board compiler.
- `src/level-tools/ascii-board.test.ts`: parser contracts.
- `src/level-tools/random.ts`: seeded PRNG and stable shuffle.
- `src/level-tools/candidate-generator.ts`: ammo partition and four-stack generation.
- `src/level-tools/candidate-generator.test.ts`: determinism and conservation tests.
- `src/level-tools/solver.ts`: finite state search and state hashing.
- `src/level-tools/solver.test.ts`: solved, exhausted, and budget-exceeded fixtures.
- `src/level-tools/timing-validator.ts`: nominal and jitter replay suite.
- `src/level-tools/timing-validator.test.ts`: spacing and perturbation tests.
- `src/level-tools/constraints.ts`: full-buffer positive and capped-buffer negative validation.
- `src/level-tools/constraints.test.ts`: full-buffer proof fixtures.
- `src/level-tools/difficulty.ts`: versioned weighted score.
- `src/level-tools/difficulty.test.ts`: normalization and clamping tests.
- `src/level-tools/pipeline.ts`: candidate loop and accepted artifact construction.
- `src/level-tools/pipeline.test.ts`: deterministic acceptance and diagnostics.

### Recipes, generated content, and CLI

- `tools/levels/recipes.ts`: initially empty CLI registry, then twelve ASCII/programmed recipes.
- `tools/levels/generate.ts`: generate one/all and write stable artifacts.
- `tools/levels/validate.ts`: strict regeneration/no-diff catalog validation.
- `tools/levels/report.ts`: compact metrics table.
- `src/levels/generated/catalog.generated.ts`: checked-in runtime artifacts.
- `src/levels/catalog.ts`: typed lookup and ordering facade.
- `src/levels/catalog.test.ts`: catalog-wide contract and replay validation.
- `package.json`, `package-lock.json`: `tsx` and `levels:*` commands.
- `tsconfig.node.json`, `eslint.config.js`: Node tooling coverage.

### Runtime navigation

- `src/levels/selection.ts`: URL parsing, fallback, canonical URL, and next-level rules.
- `src/levels/selection.test.ts`: pure navigation tests.
- `src/game/GameScene.ts`: selected catalog entry lifecycle.
- `src/game/create-game.ts`: initial selection injection.
- `src/game/views/HeaderView.ts`: selected level label and list action.
- `src/game/views/LevelSelectorView.ts`: unlocked catalog grid.
- `src/game/views/OverlayView.ts`: replay, next, and list actions.
- `src/game/view-contracts.test.ts`: view interface contracts.
- `e2e/game.spec.ts`: direct URL and selector flows.

### Documentation and CI

- `README.md`: player navigation and author commands.
- `docs/level-authoring.md`: recipe syntax, scoring, reports, and timing limitations.
- `.github/workflows/deploy.yml`: strict generated-catalog validation.

---

### Task 1: Serializable Simulation State and Replay

**Files:**
- Modify: `src/core/model.ts`
- Modify: `src/core/simulation.ts`
- Create: `src/core/replay.ts`
- Create: `src/core/replay.test.ts`

**Interfaces:**
- Produces: `GameSimulationState`, `TimedLaunch`, `ReplayResult`.
- Produces: `GameSimulation.saveState(): GameSimulationState` and `GameSimulation.fork(options?: SimulationOptions): GameSimulation`.
- Produces: `replayLevel(level: LevelDefinition, launches: readonly TimedLaunch[], options?: SimulationOptions): ReplayResult`.

- [ ] **Step 1: Write failing replay and fork tests**

```ts
it('forks without sharing mutable state', () => {
  const original = new GameSimulation(onePixelLevel);
  original.dispatch({ type: 'start' });
  original.advance(FIXED_STEP_MS);
  const fork = original.fork();
  fork.dispatch({ type: 'launch', source: { kind: 'stack', index: 0 } });
  fork.advance(FIXED_STEP_MS);
  expect(original.getSnapshot().active).toHaveLength(0);
  expect(fork.getSnapshot().active).toHaveLength(1);
});

it('replays timestamped launches and records peaks', () => {
  const result = replayLevel(onePixelLevel, [
    { atMs: 0, source: { kind: 'stack', index: 0 } },
  ]);
  expect(result.phase).toBe('won');
  expect(result.peakActiveContainers).toBe(1);
  expect(result.elapsedMs).toBeGreaterThan(0);
});
```

- [ ] **Step 2: Run the focused test and verify red**

Run: `npm test -- src/core/replay.test.ts`

Expected: FAIL because `fork` and `replayLevel` do not exist.

- [ ] **Step 3: Add state, policy, and replay contracts**

```ts
export interface SimulationOptions {
  readonly maxBufferOccupancy?: number;
}

export interface GameSimulationState {
  readonly phase: GamePhase;
  readonly board: ReadonlyArray<ReadonlyArray<ColorId | null>>;
  readonly stacks: ReadonlyArray<ReadonlyArray<ContainerSeed>>;
  readonly buffer: ReadonlyArray<ContainerSeed | null>;
  readonly active: ReadonlyArray<ActiveContainer>;
  readonly danger: boolean;
  readonly nextLaunchId: number;
  readonly accumulatorMs: number;
  readonly pendingCommands: readonly GameCommand[];
}

export interface TimedLaunch {
  readonly atMs: number;
  readonly source: LaunchSource;
}
```

Implement deep-copying `saveState`, a private restore path used by `fork`, and `SimulationOptions.maxBufferOccupancy`. Treat a return that would exceed that occupancy as loss, without changing the default five-slot runtime rule.

- [ ] **Step 4: Implement deterministic replay**

`replayLevel` starts the simulation, advances exactly to each `atMs`, dispatches the launch, then advances in 50 ms increments until win/loss or `maxElapsedMs` (default 120,000 ms). Return phase, elapsed time, domain events, and peak active/buffer counts.

- [ ] **Step 5: Run core tests**

Run: `npm test -- src/core/replay.test.ts src/core/simulation-rules.test.ts src/core/simulation-commands.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/core/model.ts src/core/simulation.ts src/core/replay.ts src/core/replay.test.ts
git commit -m "feat: add deterministic simulation replay"
```

### Task 2: Recipe Contracts and Board Compilation

**Files:**
- Create: `src/level-tools/types.ts`
- Create: `src/level-tools/ascii-board.ts`
- Create: `src/level-tools/ascii-board.test.ts`

**Interfaces:**
- Consumes: `BoardDefinition`, `LevelDefinition`, `TimedLaunch` from `src/core/model.ts`.
- Produces: `LevelRecipe`, `GenerationBudget`, `LevelArtifact`, `compileRecipeBoard(recipe: LevelRecipe): BoardDefinition`.
- Produces: `compileAsciiBoard(rows, symbols): BoardDefinition`.

- [ ] **Step 1: Write parser tests**

```ts
it('compiles colors and empty cells', () => {
  expect(compileAsciiBoard(['B.', '.G'], { B: 'blue', G: 'green' })).toEqual({
    width: 2,
    height: 2,
    cells: [
      { x: 0, y: 0, color: 'blue' },
      { x: 1, y: 1, color: 'green' },
    ],
  });
});

it.each([
  { rows: [], message: 'at least one row' },
  { rows: ['BB', 'B'], message: 'equal width' },
  { rows: ['X'], message: "unsupported symbol 'X' at 0,0" },
])('rejects $message', ({ rows, message }) => {
  expect(() => compileAsciiBoard(rows, { B: 'blue' })).toThrow(message);
});
```

- [ ] **Step 2: Verify parser tests fail**

Run: `npm test -- src/level-tools/ascii-board.test.ts`

Expected: FAIL because the module does not exist.

- [ ] **Step 3: Define exact recipe types**

```ts
export interface GenerationBudget {
  readonly maxCandidates: number;
  readonly maxVisitedStates: number;
  readonly maxElapsedMs: number;
}

export type BoardRecipe =
  | { readonly kind: 'ascii'; readonly rows: readonly string[]; readonly symbols: Readonly<Record<string, ColorId>> }
  | { readonly kind: 'programmed'; readonly build: () => BoardDefinition };

export interface LevelRecipe {
  readonly id: string;
  readonly title: string;
  readonly board: BoardRecipe;
  readonly seed: number;
  readonly targetDifficulty: number;
  readonly difficultyTolerance: number;
  readonly requiresFullBuffer?: boolean;
  readonly generationBudget: GenerationBudget;
  readonly speedTrackUnitsPerSecond: number;
}
```

Define `LevelArtifact` with `id`, `level`, `title`, `ordinal`, `difficulty`, `difficultyVersion`, `metrics`, `recipeId`, `seed`, `requiresFullBuffer`, and `witness`. Require `id === level.id` in artifact validation.

- [ ] **Step 4: Implement both board recipe variants**

Programmed output must be passed through `assertValidBoardDefinition`, checking positive integer dimensions, coordinates, duplicates, and supported colors before candidate generation.

- [ ] **Step 5: Run parser tests and typecheck**

Run: `npm test -- src/level-tools/ascii-board.test.ts`

Run: `npm run typecheck`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/level-tools/types.ts src/level-tools/ascii-board.ts src/level-tools/ascii-board.test.ts
git commit -m "feat: add level recipe compiler"
```

### Task 3: Seeded Stack Candidate Generation

**Files:**
- Create: `src/level-tools/random.ts`
- Create: `src/level-tools/candidate-generator.ts`
- Create: `src/level-tools/candidate-generator.test.ts`

**Interfaces:**
- Consumes: compiled `BoardDefinition`, `LevelRecipe`.
- Produces: `mulberry32(seed: number): () => number`, `stableShuffle<T>(values, random): T[]`.
- Produces: `generateCandidates(recipe: LevelRecipe): Iterable<LevelDefinition>`.

- [ ] **Step 1: Write determinism and conservation tests**

```ts
it('generates stable candidates that conserve every color count', () => {
  const first = [...generateCandidates(recipe)].slice(0, 3);
  const second = [...generateCandidates(recipe)].slice(0, 3);
  expect(second).toEqual(first);
  for (const level of first) {
    expect(level.stacks).toHaveLength(4);
    expect(() => assertValidLevel(level)).not.toThrow();
  }
});

it('changes candidate ordering when the seed changes', () => {
  const a = [...generateCandidates(recipe)].slice(0, 3);
  const b = [...generateCandidates({ ...recipe, seed: recipe.seed + 1 })].slice(0, 3);
  expect(b).not.toEqual(a);
});
```

- [ ] **Step 2: Verify generator tests fail**

Run: `npm test -- src/level-tools/candidate-generator.test.ts`

Expected: FAIL because candidate generation is missing.

- [ ] **Step 3: Implement stable seeded generation**

For each color count, enumerate positive partitions with container sizes bounded by `1..route.controlPoints.length`. Combine partitions, distribute containers round-robin across four stacks, and apply seeded stable shuffles to color order, partition order, and stack assignment. Yield at most `generationBudget.maxCandidates`; run `assertValidLevel` before every yield.

- [ ] **Step 4: Run generator and level-validator tests**

Run: `npm test -- src/level-tools/candidate-generator.test.ts src/core/level-validator.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/level-tools/random.ts src/level-tools/candidate-generator.ts src/level-tools/candidate-generator.test.ts
git commit -m "feat: generate seeded stack candidates"
```

### Task 4: Finite Solver and Search Diagnostics

**Files:**
- Create: `src/level-tools/solver.ts`
- Create: `src/level-tools/solver.test.ts`

**Interfaces:**
- Consumes: `GameSimulation.fork`, `TimedLaunch`, and `GenerationBudget`.
- Produces: `solveLevel(level, options): SolverOutcome`.
- Produces: `SolverOutcome = SolvedOutcome | ExhaustedOutcome | BudgetExceededOutcome`.

- [ ] **Step 1: Write solved, exhausted, and bounded tests**

```ts
it('finds a winning replay for a one-pixel fixture', () => {
  const outcome = solveLevel(onePixelLevel, solverOptions);
  expect(outcome.kind).toBe('solved');
  if (outcome.kind === 'solved') expect(replayLevel(onePixelLevel, outcome.witness).phase).toBe('won');
});

it('exhausts a fixture whose only live return exceeds the buffer policy', () => {
  const outcome = solveLevel(returningContainerLevel, { ...solverOptions, maxBufferOccupancy: 0 });
  expect(outcome.kind).toBe('exhausted');
});

it('reports budget exhaustion distinctly', () => {
  const outcome = solveLevel(onePixelLevel, { ...solverOptions, maxVisitedStates: 1 });
  expect(outcome.kind).toBe('budget-exceeded');
});
```

- [ ] **Step 2: Verify solver tests fail**

Run: `npm test -- src/level-tools/solver.test.ts`

Expected: FAIL because `solveLevel` does not exist.

- [ ] **Step 3: Implement the search contracts**

```ts
export interface SolverOptions {
  readonly quantumMs: 50;
  readonly minimumInputSpacingMs: 300;
  readonly maxVisitedStates: number;
  readonly maxElapsedMs: number;
  readonly maxBufferOccupancy?: number;
  readonly requiredPeakBufferOccupancy?: number;
}

export type SolverOutcome =
  | { readonly kind: 'solved'; readonly witness: readonly TimedLaunch[]; readonly metrics: SearchMetrics }
  | { readonly kind: 'exhausted'; readonly metrics: SearchMetrics }
  | { readonly kind: 'budget-exceeded'; readonly metrics: SearchMetrics };
```

- [ ] **Step 4: Implement deterministic breadth-first search**

At each 50 ms node, branch into wait plus every currently non-empty stack/buffer launch when spacing and active-container limits allow. Advance through `GameSimulation`; discard lost states, accept won states satisfying required peak occupancy, and hash phase, board, stacks, buffer, active color/ammo/distance, danger, accumulator, last-input spacing bucket, and peak buffer. Visit sources in stack index then buffer index order.

Prune exact duplicate hashes only. Prune a path when it reaches the configured `maxElapsedMs` model horizon. Return `budget-exceeded` only when `maxVisitedStates` is reached; return `exhausted` when the complete queue within the time horizon is empty.

- [ ] **Step 5: Run solver tests**

Run: `npm test -- src/level-tools/solver.test.ts src/core/replay.test.ts`

Expected: PASS with stable visited-state counts on fixtures.

- [ ] **Step 6: Commit**

```bash
git add src/level-tools/solver.ts src/level-tools/solver.test.ts
git commit -m "feat: add finite level solver"
```

### Task 5: Human Timing and Required Full Buffer

**Files:**
- Create: `src/level-tools/timing-validator.ts`
- Create: `src/level-tools/timing-validator.test.ts`
- Create: `src/level-tools/constraints.ts`
- Create: `src/level-tools/constraints.test.ts`

**Interfaces:**
- Produces: `buildJitterSchedules(witness): readonly TimedLaunch[][]`.
- Produces: `validateHumanTiming(level, witness): TimingValidationResult`.
- Produces: `validateLevelConstraints(level, recipe, witness): ConstraintValidationResult`.

- [ ] **Step 1: Write timing-suite tests**

```ts
it('builds nominal, global, alternating, and per-action jitter schedules', () => {
  const schedules = buildJitterSchedules(twoActionWitness);
  expect(schedules).toHaveLength(1 + 3 + twoActionWitness.length * 2);
  expect(schedules.every(hasMinimum300MsSpacing)).toBe(true);
});

it('rejects a witness with inputs 250 ms apart', () => {
  const result = validateHumanTiming(level, [
    { atMs: 0, source: stack0 },
    { atMs: 250, source: stack1 },
  ]);
  expect(result).toMatchObject({ ok: false, reason: 'input-spacing' });
});
```

- [ ] **Step 2: Write full-buffer constraint tests**

```ts
it('accepts only when five-slot witness wins and four-slot search exhausts', () => {
  const result = validateLevelConstraints(fullBufferFixture, fullBufferRecipe, witness);
  expect(result.ok).toBe(true);
  expect(result.cappedSearch?.kind).toBe('exhausted');
});

it('rejects when a four-slot winning path exists', () => {
  const result = validateLevelConstraints(optionalBufferFixture, fullBufferRecipe, witness);
  expect(result).toMatchObject({ ok: false, reason: 'full-buffer-not-required' });
});
```

- [ ] **Step 3: Verify both test files fail**

Run: `npm test -- src/level-tools/timing-validator.test.ts src/level-tools/constraints.test.ts`

Expected: FAIL because validators are missing.

- [ ] **Step 4: Implement jitter generation and replay validation**

Build nominal, all-early, all-late, alternating, and each-action early/late schedules at 150 ms. Reject rather than compress a perturbation that violates 300 ms spacing; normalize only a negative first timestamp by shifting the whole schedule forward.

- [ ] **Step 5: Implement the two-search full-buffer check**

For normal recipes, require robust timing only. For `requiresFullBuffer`, verify the witness peaks at five, then call `solveLevel` with `maxBufferOccupancy: 4`; accept only `exhausted`, never `budget-exceeded`.

- [ ] **Step 6: Run validation tests**

Run: `npm test -- src/level-tools/timing-validator.test.ts src/level-tools/constraints.test.ts src/level-tools/solver.test.ts`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/level-tools/timing-validator.ts src/level-tools/timing-validator.test.ts src/level-tools/constraints.ts src/level-tools/constraints.test.ts
git commit -m "feat: validate human timing and buffer pressure"
```

### Task 6: Versioned Difficulty Scoring

**Files:**
- Create: `src/level-tools/difficulty.ts`
- Create: `src/level-tools/difficulty.test.ts`
- Modify: `src/level-tools/types.ts`
- Modify: `src/level-tools/solver.ts`

**Interfaces:**
- Produces: `DIFFICULTY_CONFIG`, `DifficultyMetrics`, `DifficultyResult`.
- Produces: `scoreDifficulty(metrics, config?): DifficultyResult`.
- Extends solver metrics with forced ratio, explored/losing branches, peak active/buffer, danger duration, action count, elapsed time, occupied cells, and container count.

- [ ] **Step 1: Write exact score tests**

```ts
it('applies versioned weights and rounds once', () => {
  const result = scoreDifficulty({
    orderDependency: 0.5,
    bufferPressure: 1,
    decisionBranching: 0.25,
    timingPressure: 0.5,
    normalizedLength: 0,
  });
  expect(result).toEqual({
    score: 53,
    version: '1',
    components: { orderDependency: 15, bufferPressure: 25, decisionBranching: 5, timingPressure: 7.5, normalizedLength: 0 },
  });
});

it('clamps raw component values and final output', () => {
  expect(scoreDifficulty(allMetrics(2)).score).toBe(100);
  expect(scoreDifficulty(allMetrics(-1)).score).toBe(0);
});
```

- [ ] **Step 2: Verify score tests fail**

Run: `npm test -- src/level-tools/difficulty.test.ts`

Expected: FAIL because scorer is absent.

- [ ] **Step 3: Implement the five-component scorer**

Use weights `0.30`, `0.25`, `0.20`, `0.15`, and `0.10`. Derive normalized inputs from search/replay metrics; normalize length by occupied cells and container count, buffer by five slots, timing by five active containers and measured jitter slack, and branching by explored alternatives. Clamp each raw input before weighting and round only the final sum.

- [ ] **Step 4: Run difficulty and solver tests**

Run: `npm test -- src/level-tools/difficulty.test.ts src/level-tools/solver.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/level-tools/types.ts src/level-tools/solver.ts src/level-tools/difficulty.ts src/level-tools/difficulty.test.ts
git commit -m "feat: score level difficulty"
```

### Task 7: Generation Pipeline and CLI

**Files:**
- Create: `src/level-tools/pipeline.ts`
- Create: `src/level-tools/pipeline.test.ts`
- Create: `tools/levels/generate.ts`
- Create: `tools/levels/validate.ts`
- Create: `tools/levels/report.ts`
- Create: `tools/levels/recipes.ts`
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `tsconfig.node.json`
- Modify: `eslint.config.js`

**Interfaces:**
- Produces: `generateLevelArtifact(recipe, ordinal): GenerationResult`.
- Produces: `generateCatalog(recipes): readonly LevelArtifact[]`.
- CLI consumes `RECIPES` from Task 8 and emits `src/levels/generated/catalog.generated.ts`.

- [ ] **Step 1: Install the Node TypeScript runner**

Run: `npm install --save-dev tsx`

Expected: `package.json` and lockfile add `tsx`; no runtime dependency changes.

- [ ] **Step 2: Write pipeline acceptance and diagnostics tests**

```ts
it('accepts the first deterministic candidate inside target tolerance', () => {
  const result = generateLevelArtifact(tinyRecipe, 1);
  expect(result.kind).toBe('accepted');
  if (result.kind === 'accepted') {
    expect(Math.abs(result.artifact.difficulty - tinyRecipe.targetDifficulty))
      .toBeLessThanOrEqual(tinyRecipe.difficultyTolerance);
  }
});

it('reports the closest candidate when the budget is exhausted', () => {
  const result = generateLevelArtifact(impossibleScoreRecipe, 1);
  expect(result).toMatchObject({ kind: 'rejected', recipeId: impossibleScoreRecipe.id });
  if (result.kind === 'rejected') expect(result.closestScore).toBeTypeOf('number');
});
```

- [ ] **Step 3: Verify pipeline tests fail**

Run: `npm test -- src/level-tools/pipeline.test.ts`

Expected: FAIL because orchestration is missing.

- [ ] **Step 4: Implement candidate orchestration**

For each candidate: solve, validate jitter, validate full-buffer constraint, compute score, and accept only when all hard constraints pass and score is within tolerance. Accumulate stable diagnostics with candidate count, closest score, rejection reasons, visited states, and budget usage.

- [ ] **Step 5: Implement stable artifact serialization and commands**

Serialize with sorted object fields, two-space indentation, trailing newline, no wall-clock fields, and a generated-file warning. `generate --recipe <id>` rewrites one entry while preserving catalog order; `validate` compares in-memory output and exits non-zero on mismatch; `report` prints ordinal, ID, score, buffer peak, visited states, and constraint result.

Create the compile-safe registry used by all three commands:

```ts
import type { LevelRecipe } from '../../src/level-tools/types';

export const RECIPES: readonly LevelRecipe[] = [];
```

Add scripts:

```json
{
  "levels:generate": "tsx tools/levels/generate.ts",
  "levels:validate": "tsx tools/levels/validate.ts",
  "levels:report": "tsx tools/levels/report.ts"
}
```

Include `tools/**/*.ts` and `src/level-tools/**/*.ts` in Node typechecking and lint Node globals for `tools/**/*.ts` only.

- [ ] **Step 6: Run pipeline, lint, and typecheck**

Run: `npm test -- src/level-tools/pipeline.test.ts`

Run: `npm run lint`

Run: `npm run typecheck`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json tsconfig.node.json eslint.config.js src/level-tools/pipeline.ts src/level-tools/pipeline.test.ts tools/levels/generate.ts tools/levels/validate.ts tools/levels/report.ts tools/levels/recipes.ts
git commit -m "feat: add level generation commands"
```

### Task 8: Twelve Generated Trial Levels and Catalog Contract

**Files:**
- Modify: `tools/levels/recipes.ts`
- Create: `src/levels/generated/catalog.generated.ts`
- Create: `src/levels/catalog.ts`
- Create: `src/levels/catalog.test.ts`
- Modify: `src/core/simulation-restart.test.ts`

**Interfaces:**
- Produces: `RECIPES: readonly LevelRecipe[]`.
- Produces: `LEVEL_CATALOG: readonly LevelArtifact[]`, `getLevelById(id): LevelArtifact | undefined`.
- Replaces `LEVEL_ONE` test imports with `LEVEL_CATALOG[0].level`.

- [ ] **Step 1: Write the catalog contract before generating content**

```ts
it('contains twelve ordered, validated, robust levels in required bands', () => {
  expect(LEVEL_CATALOG).toHaveLength(12);
  expect(countInRange(LEVEL_CATALOG, 15, 30)).toBe(4);
  expect(countInRange(LEVEL_CATALOG, 35, 60)).toBe(4);
  expect(countInRange(LEVEL_CATALOG, 65, 85)).toBe(4);
  expect(LEVEL_CATALOG.filter((entry) => entry.requiresFullBuffer)).toHaveLength(3);
  for (const entry of LEVEL_CATALOG) {
    expect(() => assertValidLevel(entry.level)).not.toThrow();
    expect(validateHumanTiming(entry.level, entry.witness).ok).toBe(true);
    expect(scoreDifficulty(entry.metrics).score).toBe(entry.difficulty);
  }
});
```

- [ ] **Step 2: Verify the catalog contract fails**

Run: `npm test -- src/levels/catalog.test.ts`

Expected: FAIL because the catalog is absent.

- [ ] **Step 3: Author twelve deterministic recipes**

Create four targets in each band: `18, 22, 27, 30`, `38, 45, 52, 58`, and `66, 72, 78, 84`. Include geometric ASCII boards, an ASCII sunflower near score 52, and at least two programmed symmetric boards. Set `requiresFullBuffer: true` on the targets 72, 78, and 84. Use explicit seeds and budgets in every recipe.

- [ ] **Step 4: Generate and calibrate the catalog**

Run: `npm run levels:generate`

Run: `npm run levels:report`

Adjust only recipe seeds, board patterns, targets/tolerances, and versioned global score coefficients. Do not add per-level score overrides. Repeat until the generator accepts exactly twelve entries satisfying the three bands and full-buffer requirements.

- [ ] **Step 5: Replace the legacy singleton and run catalog validation**

Change simulation restart tests to use `LEVEL_CATALOG[0].level`. Keep the legacy singleton until Task 9 removes its final runtime import, then run:

Run: `npm run levels:validate`

Run: `npm test -- src/levels/catalog.test.ts src/core/simulation-restart.test.ts`

Expected: PASS and strict regeneration reports no diff.

- [ ] **Step 6: Commit**

```bash
git add tools/levels/recipes.ts src/levels/generated/catalog.generated.ts src/levels/catalog.ts src/levels/catalog.test.ts src/core/simulation-restart.test.ts
git commit -m "feat: add validated trial level catalog"
```

### Task 9: URL Selection and Catalog-Driven Scene

**Files:**
- Create: `src/levels/selection.ts`
- Create: `src/levels/selection.test.ts`
- Modify: `src/main.ts`
- Modify: `src/game/create-game.ts`
- Modify: `src/game/GameScene.ts`
- Delete: `src/levels/level-one.ts`
- Delete: `src/levels/level-one.test.ts`

**Interfaces:**
- Produces: `resolveLevelSelection(search): LevelArtifact`, `writeLevelSelection(id, mode): void`, `getNextLevel(id): LevelArtifact | undefined`.
- Changes: `createGame(parent, initialLevelId): Phaser.Game`.
- Scene init data: `{ readonly levelId: string }`.

- [ ] **Step 1: Write pure selection tests**

```ts
it('selects a known query ID and falls back for an unknown ID', () => {
  expect(resolveLevelSelection('?level=sunflower').id).toBe('sunflower');
  expect(resolveLevelSelection('?level=missing').id).toBe(LEVEL_CATALOG[0].id);
});

it('returns no next level after the final catalog entry', () => {
  expect(getNextLevel(LEVEL_CATALOG.at(-1)!.id)).toBeUndefined();
});
```

- [ ] **Step 2: Verify selection tests fail**

Run: `npm test -- src/levels/selection.test.ts`

Expected: FAIL because selection helpers are absent.

- [ ] **Step 3: Implement query parsing and canonical replacement**

Use `URLSearchParams`, preserve unrelated query parameters, and use `history.replaceState` for initial fallback/direct selection. Use `history.pushState` for player-initiated level changes. Register `popstate` in `main.ts` to restart the scene at the URL-selected level.

- [ ] **Step 4: Remove all `LEVEL_ONE` assumptions from the scene**

Store `LevelArtifact` on `GameScene`; derive simulation, route length, cell dimensions, and labels from `entry.level`. Restart with `{ levelId }`, set `data-level-id`, and preserve the selected entry on ordinary restart.

After the scene no longer imports `LEVEL_ONE`, delete `level-one.ts` and its singleton-only test.

- [ ] **Step 5: Run focused tests and build**

Run: `npm test -- src/levels/selection.test.ts src/game/layout.test.ts src/game/view-contracts.test.ts`

Run: `npm run build`

Expected: PASS and no `LEVEL_ONE` references from `rg -n "LEVEL_ONE" src`.

- [ ] **Step 6: Commit**

```bash
git add src/levels/selection.ts src/levels/selection.test.ts src/main.ts src/game/create-game.ts src/game/GameScene.ts
git add -u src/levels/level-one.ts src/levels/level-one.test.ts
git commit -m "feat: drive game scene from level catalog"
```

### Task 10: Unlocked Selector and Outcome Navigation

**Files:**
- Create: `src/game/views/LevelSelectorView.ts`
- Modify: `src/game/views/HeaderView.ts`
- Modify: `src/game/views/OverlayView.ts`
- Modify: `src/game/GameScene.ts`
- Modify: `src/game/layout.ts`
- Modify: `src/game/layout.test.ts`
- Modify: `src/game/view-contracts.test.ts`
- Modify: `e2e/game.spec.ts`

**Interfaces:**
- Produces: `LevelSelectorView(scene, entries, onSelect)` with `show()`, `hide()`, and `isVisible()`.
- Produces: `LAYOUT.levelButton` and `LAYOUT.levelSelectorCells`, used by both Phaser and E2E coordinates.
- Changes: `HeaderView(scene, levelLabel, onOpenLevels)`.
- Changes: `OverlayAction = 'start' | 'continue' | 'replay' | 'next' | 'levels'` and `OverlayView(scene, onAction)`.

- [ ] **Step 1: Extend view-contract tests**

```ts
it('exposes selector visibility controls', () => {
  expect(typeof LevelSelectorView.prototype.show).toBe('function');
  expect(typeof LevelSelectorView.prototype.hide).toBe('function');
  expect(typeof LevelSelectorView.prototype.isVisible).toBe('function');
});

it('defines explicit outcome actions', () => {
  expect(getOverlayActions('won', true)).toEqual(['replay', 'next', 'levels']);
  expect(getOverlayActions('won', false)).toEqual(['replay', 'levels']);
  expect(getOverlayActions('lost', false)).toEqual(['replay', 'levels']);
});
```

- [ ] **Step 2: Add failing browser navigation test**

```ts
test('opens every level and preserves direct URL selection', async ({ page }) => {
  await page.goto('/?level=sunflower');
  const root = page.locator('#game-root');
  const canvas = page.locator('canvas');
  const box = await canvas.boundingBox();
  if (!box) throw new Error('Canvas has no bounding box');
  await expect(root).toHaveAttribute('data-level-id', 'sunflower');
  const button = LAYOUT.levelButton;
  await canvas.click({ position: canvasPoint(box, button.x + button.width / 2, button.y + button.height / 2) });
  await expect(root).toHaveAttribute('data-level-selector', 'open');
  const target = LAYOUT.levelSelectorCells[11];
  await canvas.click({ position: canvasPoint(box, target.x + target.width / 2, target.y + target.height / 2) });
  await expect(page.locator('#game-root')).toHaveAttribute('data-level-id', LEVEL_CATALOG[11].id);
  await expect(page).toHaveURL(new RegExp(`level=${LEVEL_CATALOG[11].id}`));
});
```

- [ ] **Step 3: Verify unit tests fail**

Run: `npm test -- src/game/view-contracts.test.ts`

Expected: FAIL because selector and overlay action contracts are absent.

- [ ] **Step 4: Implement the Phaser selector and header action**

Add `LAYOUT.levelButton = { x: 20, y: 16, width: 180, height: 44 }` and twelve `levelSelectorCells` in a three-column grid. Render a depth-200 scrim and interactive entries showing ordinal, title, and score. Every entry is enabled. While the selector is open, pause a running simulation and restore only after selection or close.

- [ ] **Step 5: Implement outcome actions**

On win expose replay, optional next, and list; on loss expose replay and list. `next` calls `getNextLevel`, updates URL with push state, and restarts the scene. The last level omits next rather than wrapping.

Expose `data-level-selector="open|closed"` and keep `data-level-id` current for deterministic E2E assertions.

- [ ] **Step 6: Run unit and E2E tests**

Run: `npm test -- src/game/view-contracts.test.ts src/levels/selection.test.ts`

Run: `npm run test:e2e`

Expected: PASS for existing source hit-target checks and new navigation checks.

- [ ] **Step 7: Commit**

```bash
git add src/game/views/LevelSelectorView.ts src/game/views/HeaderView.ts src/game/views/OverlayView.ts src/game/GameScene.ts src/game/layout.ts src/game/layout.test.ts src/game/view-contracts.test.ts e2e/game.spec.ts
git commit -m "feat: add unlocked level navigation"
```

### Task 11: Documentation, CI Gate, and Final Verification

**Files:**
- Modify: `README.md`
- Create: `docs/level-authoring.md`
- Modify: `.github/workflows/deploy.yml`

**Interfaces:**
- Consumes all authoring commands and artifact fields from Tasks 2–8.
- Adds no runtime interface.

- [ ] **Step 1: Add strict catalog validation to CI**

Insert `npm run levels:validate` after unit tests and before the production build. Keep Node 22 and the existing deployment flow unchanged.

- [ ] **Step 2: Document the author workflow with a complete example**

Include a compilable sunflower recipe showing ASCII symbols, seed, target score, tolerance, budget, speed, and `requiresFullBuffer`. Document all four commands, generated-file ownership, non-zero diagnostics, 50 ms solver scope, 300 ms spacing, ±150 ms suite, difficulty component weights, and coefficient versioning.

- [ ] **Step 3: Update player-facing README**

Replace “one-level prototype” and one-level QA language. Explain that all twelve levels are unlocked, selection is shareable by URL, and no progress is stored. Link `docs/level-authoring.md`.

- [ ] **Step 4: Run strict generation checks**

Run: `npm run levels:validate`

Run: `npm run levels:report`

Expected: validation exits zero; report lists twelve ordered levels in the required bands and marks exactly three as full-buffer-required.

- [ ] **Step 5: Run the full project gate**

Run: `npm run lint`

Run: `npm run typecheck`

Run: `npm test`

Run: `npm run build`

Run: `npm run test:e2e`

Expected: every command exits zero. Record the unit test count and Playwright test count in the implementation handoff.

- [ ] **Step 6: Inspect staged content for generated drift and secrets**

Run: `git status --short`

Run: `git diff --check`

Run: `git diff --name-only -- '*.env' '*.pem' '*.key'`

Expected: only intended source, generated catalog, tests, docs, configuration, and lockfile changes; no environment or key files; no whitespace errors.

- [ ] **Step 7: Commit**

```bash
git add README.md docs/level-authoring.md .github/workflows/deploy.yml
git commit -m "docs: explain level authoring workflow"
```

- [ ] **Step 8: Review commit sequence**

Run: `git log --oneline --decorate -12`

Expected: eleven focused feature/documentation commits after the design and plan commits, with no co-authored-by trailers.
