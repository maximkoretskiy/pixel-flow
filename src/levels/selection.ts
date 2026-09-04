import { LEVEL_CATALOG, getLevelById } from './catalog';
import type { LevelArtifact } from '../level-tools/types';

export type LevelSelectionMode = 'push' | 'replace';

export function resolveLevelSelection(search: string): LevelArtifact {
  const id = new URLSearchParams(search).get('level');
  return (id ? getLevelById(id) : undefined) ?? LEVEL_CATALOG[0];
}

export function getNextLevel(id: string): LevelArtifact | undefined {
  const index = LEVEL_CATALOG.findIndex((entry) => entry.id === id);
  return index < 0 ? undefined : LEVEL_CATALOG[index + 1];
}

export function writeLevelSelection(id: string, mode: LevelSelectionMode): void {
  const url = new URL(window.location.href);
  url.searchParams.set('level', id);
  if (mode === 'push') window.history.pushState(null, '', url);
  else window.history.replaceState(null, '', url);
}
