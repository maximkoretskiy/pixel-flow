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

  it('supports intentional danger and loss through the six unsafe containers', () => {
    const game = new GameSimulation(LEVEL_ONE);
    game.dispatch({ type: 'start' });
    game.advance(FIXED_STEP_MS);
    game.dispatch({ type: 'launch', source: { kind: 'stack', index: 1 } });
    game.dispatch({ type: 'launch', source: { kind: 'stack', index: 1 } });
    game.dispatch({ type: 'launch', source: { kind: 'stack', index: 2 } });
    game.dispatch({ type: 'launch', source: { kind: 'stack', index: 2 } });
    game.dispatch({ type: 'launch', source: { kind: 'stack', index: 3 } });

    game.advance(2100);

    expect(game.getSnapshot()).toMatchObject({ phase: 'running', danger: true });
    expect(game.getSnapshot().buffer.filter(Boolean)).toHaveLength(5);

    game.dispatch({ type: 'launch', source: { kind: 'stack', index: 3 } });
    game.advance(2100);

    expect(game.getSnapshot().phase).toBe('lost');
    expect(game.getSnapshot().buffer.filter(Boolean)).toHaveLength(5);
  });
});
