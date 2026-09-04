import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateCatalog, serializeCatalog } from '../../src/level-tools/pipeline';
import { RECIPES } from './recipes';

const recipeFlagIndex = process.argv.indexOf('--recipe');
const requestedRecipeId = recipeFlagIndex === -1 ? undefined : process.argv[recipeFlagIndex + 1];
if (recipeFlagIndex !== -1 && !requestedRecipeId) throw new Error('--recipe requires an ID');
if (requestedRecipeId && !RECIPES.some((recipe) => recipe.id === requestedRecipeId)) {
  throw new Error(`Unknown recipe: ${requestedRecipeId}`);
}

const outputUrl = new URL('../../src/levels/generated/catalog.generated.ts', import.meta.url);
const outputPath = fileURLToPath(outputUrl);
const catalog = generateCatalog(RECIPES);
await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, serializeCatalog(catalog), 'utf8');
console.log(`Generated ${catalog.length} level(s)${requestedRecipeId ? ` for ${requestedRecipeId}` : ''}.`);
