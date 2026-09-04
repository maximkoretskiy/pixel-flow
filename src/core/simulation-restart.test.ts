import { expect, it } from 'vitest';
import { LEVEL_CATALOG } from '../levels/catalog';
import { FIXED_STEP_MS, GameSimulation } from './simulation';

it('restarts from the exact immutable level state', () => {
  const game = new GameSimulation(LEVEL_CATALOG[0].level);
  const initial = game.getSnapshot();
  game.dispatch({ type: 'start' });
  game.dispatch({ type: 'launch', source: { kind: 'stack', index: 0 } });
  game.advance(FIXED_STEP_MS);
  game.restart();
  expect(game.getSnapshot()).toEqual(initial);
});
