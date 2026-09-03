import { expect, test } from '@playwright/test';

test('fits the mobile viewport and launches the intended stack', async ({ page }) => {
  await page.goto(process.env.PAGES_BASE ?? '/');
  const root = page.locator('#game-root');
  const canvas = page.locator('canvas');
  await expect(canvas).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight)).toBe(true);

  const box = await canvas.boundingBox();
  if (!box) throw new Error('Canvas has no bounding box');
  const point = (x: number, y: number) => ({ x: x * box.width / 390, y: y * box.height / 780 });
  await canvas.click({ position: point(195, 390) });
  await expect(root).toHaveAttribute('data-phase', 'running');
  await canvas.click({ position: point(57, 630) });
  await expect(root).toHaveAttribute('data-active-containers', '1');
});
