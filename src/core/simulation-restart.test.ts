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
