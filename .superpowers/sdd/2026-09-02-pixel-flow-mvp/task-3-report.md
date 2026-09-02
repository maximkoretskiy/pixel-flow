# Task 3 Report: Build Board, Route, and Blocking Targeting

## Status

Implemented and verified.

## Changes

- Added `Board` creation, pixel removal, counting, and cloning in `src/core/board.ts`.
- Added clockwise perimeter route construction and control-point distances in `src/core/route.ts`.
- Added first-occupied-pixel ray tracing with edge-aware traversal in `src/core/targeting.ts`.
- Added blocking and route-order tests in `src/core/targeting.test.ts`.

## Verification

- `npm test -- src/core/targeting.test.ts` — 3 passed.
- `npm test` — 3 files, 6 tests passed.
- `npm run lint` — passed.
- `npm run typecheck` — passed.
- `git diff --check` — passed.

## Known concern

Every shell command prints the recurring external warning `(eval):5 parse error near 'end'`; it does not affect command exit status or project code and was left unchanged.
