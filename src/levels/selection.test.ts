import { afterEach, describe, expect, it, vi } from 'vitest';
import { LEVEL_CATALOG } from './catalog';
import { getNextLevel, resolveLevelSelection, writeLevelSelection } from './selection';

afterEach(() => vi.unstubAllGlobals());

describe('level selection', () => {
  it('selects a known query ID and falls back for an unknown ID', () => {
    expect(resolveLevelSelection('?level=sunflower').id).toBe('sunflower');
    expect(resolveLevelSelection('?level=missing').id).toBe(LEVEL_CATALOG[0].id);
  });

  it('uses the first catalog level when the query is absent', () => {
    expect(resolveLevelSelection('').id).toBe(LEVEL_CATALOG[0].id);
  });

  it('returns the following entry and stops after the final level', () => {
    expect(getNextLevel(LEVEL_CATALOG[0].id)).toBe(LEVEL_CATALOG[1]);
    expect(getNextLevel(LEVEL_CATALOG.at(-1)!.id)).toBeUndefined();
  });

  it('preserves unrelated parameters when writing canonical selection', () => {
    const replaceState = vi.fn();
    vi.stubGlobal('window', {
      location: { href: 'https://example.test/game?campaign=spring' },
      history: { pushState: vi.fn(), replaceState },
    });

    writeLevelSelection('sunflower', 'replace');

    const url = replaceState.mock.calls[0][2] as URL;
    expect(url.searchParams.get('campaign')).toBe('spring');
    expect(url.searchParams.get('level')).toBe('sunflower');
  });
});
