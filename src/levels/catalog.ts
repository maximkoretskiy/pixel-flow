import { GENERATED_LEVEL_CATALOG } from './generated/catalog.generated';

export const LEVEL_CATALOG = GENERATED_LEVEL_CATALOG;

export function getLevelById(id: string) {
  return LEVEL_CATALOG.find((entry) => entry.id === id);
}
