import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { generateCatalog, serializeCatalog } from '../../src/level-tools/pipeline';
import { RECIPES } from './recipes';

const outputPath = fileURLToPath(new URL('../../src/levels/generated/catalog.generated.ts', import.meta.url));
const actual = await readFile(outputPath, 'utf8');
const expected = serializeCatalog(generateCatalog(RECIPES));
if (actual !== expected) {
  throw new Error('Generated level catalog is stale. Run npm run levels:generate.');
}
console.log(`Validated ${RECIPES.length} generated level(s).`);
