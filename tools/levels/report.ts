import { generateCatalog } from '../../src/level-tools/pipeline';
import { RECIPES } from './recipes';

const catalog = generateCatalog(RECIPES);
console.table(catalog.map((entry) => ({
  number: entry.ordinal,
  id: entry.id,
  score: entry.difficulty,
  bufferPeak: entry.metrics.bufferPressure * 5,
  fullBufferRequired: entry.requiresFullBuffer,
})));
