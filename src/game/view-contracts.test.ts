import { describe, expect, it } from 'vitest';
import { BoardView } from './views/BoardView';
import { getStatusLabel, HeaderView } from './views/HeaderView';
import { RouteView } from './views/RouteView';
import { SourcesView } from './views/SourcesView';

describe('view contracts', () => {
  it('exposes snapshot render methods', () => {
    expect(typeof BoardView.prototype.render).toBe('function');
    expect(typeof HeaderView.prototype.render).toBe('function');
    expect(typeof RouteView.prototype.render).toBe('function');
    expect(typeof SourcesView.prototype.render).toBe('function');
  });

  it('exposes active visual positions for event effects', () => {
    expect(typeof RouteView.prototype.getPosition).toBe('function');
  });

  it('derives the compact header status from phase and danger', () => {
    expect(getStatusLabel('ready', false)).toBe('Ready');
    expect(getStatusLabel('running', false)).toBe('In progress');
    expect(getStatusLabel('running', true)).toBe('Danger');
    expect(getStatusLabel('paused', false)).toBe('Paused');
    expect(getStatusLabel('won', false)).toBe('Complete');
    expect(getStatusLabel('lost', true)).toBe('Lost');
    expect(getStatusLabel('error', false)).toBe('Error');
  });
});
