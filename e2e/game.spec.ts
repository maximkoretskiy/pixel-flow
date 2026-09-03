import { expect, test } from '@playwright/test';
import { GAME_HEIGHT, GAME_WIDTH, LAYOUT } from '../src/game/layout';

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

test('loses when a sixth unsafe container returns to a full buffer', async ({ page }) => {
  await page.goto(process.env.PAGES_BASE ?? '/');
  const root = page.locator('#game-root');
  const canvas = page.locator('canvas');
  const box = await canvas.boundingBox();
  if (!box) throw new Error('Canvas has no bounding box');
  const clickVirtual = async (x: number, y: number) => {
    await canvas.click({ position: canvasPoint(box, x, y) });
  };
  await clickVirtual(195, 390);
  await expect(root).toHaveAttribute('data-phase', 'running');

  const launchStack = async (index: number) => {
    const target = LAYOUT.stackTargets[index];
    await clickVirtual(target.x + target.width / 2, target.y + target.height / 2);
  };
  await launchStack(1);
  await launchStack(1);
  await launchStack(2);
  await launchStack(2);
  await launchStack(3);
  await expect(root).toHaveAttribute('data-buffered-containers', '5', { timeout: 5_000 });
  await expect(root).toHaveAttribute('data-phase', 'running');

  await launchStack(3);

  await expect(root).toHaveAttribute('data-phase', 'lost', { timeout: 5_000 });
  await expect(root).toHaveAttribute('data-buffered-containers', '5');
});
