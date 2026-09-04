import { expect, test } from '@playwright/test';
import { GAME_HEIGHT, GAME_WIDTH, LAYOUT } from '../src/game/layout';
import { LEVEL_CATALOG } from '../src/levels/catalog';

function canvasPoint(box: { readonly width: number; readonly height: number }, x: number, y: number) {
  return { x: x * box.width / GAME_WIDTH, y: y * box.height / GAME_HEIGHT };
}

test('keeps source hit regions usable at 320x568 and launches the intended stack', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto(process.env.PAGES_BASE ?? '/');
  const root = page.locator('#game-root');
  const canvas = page.locator('canvas');
  await expect(canvas).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight)).toBe(true);

  const box = await canvas.boundingBox();
  if (!box) throw new Error('Canvas has no bounding box');
  for (const target of [...LAYOUT.bufferSlots, ...LAYOUT.stackTargets]) {
    expect(target.width * box.width / GAME_WIDTH).toBeGreaterThanOrEqual(48);
    expect(target.height * box.height / GAME_HEIGHT).toBeGreaterThanOrEqual(48);
  }

  await canvas.click({ position: canvasPoint(box, 195, 390) });
  await expect(root).toHaveAttribute('data-phase', 'running');
  const firstStack = LAYOUT.stackTargets[0];
  await canvas.click({ position: canvasPoint(
    box,
    firstStack.x + firstStack.width / 2,
    firstStack.y + firstStack.height / 2,
  ) });
  await expect(root).toHaveAttribute('data-active-containers', '1');
});

test('caps concurrent route traffic at five containers', async ({ page }) => {
  await page.goto(`${process.env.PAGES_BASE ?? '/'}?level=blue-vault`);
  const root = page.locator('#game-root');
  const canvas = page.locator('canvas');
  const box = await canvas.boundingBox();
  if (!box) throw new Error('Canvas has no bounding box');
  const clickVirtual = async (x: number, y: number) => {
    await canvas.click({ position: canvasPoint(box, x, y) });
  };
  await clickVirtual(195, 390);
  await expect(root).toHaveAttribute('data-phase', 'running');

  const target = LAYOUT.stackTargets[0];
  const point = canvasPoint(box, target.x + target.width / 2, target.y + target.height / 2);
  for (let attempt = 0; attempt < 6; attempt += 1) {
    await page.mouse.click(box.x + point.x, box.y + point.y);
  }

  await expect(root).toHaveAttribute('data-active-containers', '5');
  await expect(root).toHaveAttribute('data-phase', 'running');
});

test('opens every unlocked level and preserves direct URL selection', async ({ page }) => {
  await page.goto(`${process.env.PAGES_BASE ?? '/'}?level=sunflower`);
  const root = page.locator('#game-root');
  const canvas = page.locator('canvas');
  await expect(root).toHaveAttribute('data-level-id', 'sunflower');
  const box = await canvas.boundingBox();
  if (!box) throw new Error('Canvas has no bounding box');

  const button = LAYOUT.levelButton;
  await canvas.click({ position: canvasPoint(
    box,
    button.x + button.width / 2,
    button.y + button.height / 2,
  ) });
  await expect(root).toHaveAttribute('data-level-selector', 'open');

  const target = LAYOUT.levelSelectorCells[11];
  await canvas.click({ position: canvasPoint(
    box,
    target.x + target.width / 2,
    target.y + target.height / 2,
  ) });
  await expect(root).toHaveAttribute('data-level-id', LEVEL_CATALOG[11].id);
  await expect(page).toHaveURL(new RegExp(`level=${LEVEL_CATALOG[11].id}`));
});
