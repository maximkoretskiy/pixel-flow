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

  it('exposes active visual positions for event effects', () => {
    expect(typeof RouteView.prototype.getPosition).toBe('function');
  });
});
