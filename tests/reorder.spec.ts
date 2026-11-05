import { test, expect, type Page } from '@playwright/test';

const names = (page: Page) => page.locator('[data-drag-id] .card-name').allTextContents();

test('dragging a tile onto another moves it there and keeps the order', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Tile view' }).click();
  expect(await names(page)).toEqual(['IKEA', 'Starbucks', 'SEPHORA', 'Tesco']);
  const tesco = await page.getByRole('button', { name: /^Open Tesco,/ }).boundingBox();
  const ikea = await page.getByRole('button', { name: /^Open IKEA,/ }).boundingBox();
  await page.mouse.move(tesco!.x + 40, tesco!.y + 40);
  await page.mouse.down();
  await page.mouse.move(tesco!.x + 30, tesco!.y + 20, { steps: 3 });
  await page.mouse.move(ikea!.x + 40, ikea!.y + 40, { steps: 12 });
  await page.mouse.up();
  expect(await names(page)).toEqual(['Tesco', 'IKEA', 'Starbucks', 'SEPHORA']);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.reload();
  expect(await names(page)).toEqual(['Tesco', 'IKEA', 'Starbucks', 'SEPHORA']);
});

test('cards move without dragging: Alt+arrow and the card sheet', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /^Open SEPHORA,/ }).focus();
  await page.keyboard.press('Alt+ArrowUp');
  expect(await names(page)).toEqual(['IKEA', 'SEPHORA', 'Starbucks', 'Tesco']);
  await expect(page.getByRole('button', { name: /^Open SEPHORA,/ })).toBeFocused();
  await page.getByRole('button', { name: /^Open IKEA,/ }).click({ position: { x: 40, y: 24 } });
  await expect(page.getByRole('button', { name: 'Move IKEA up' })).toBeDisabled();
  await page.getByRole('button', { name: 'Move IKEA down' }).click();
  await page.getByRole('button', { name: 'Close dialog' }).click();
  expect(await names(page)).toEqual(['SEPHORA', 'IKEA', 'Starbucks', 'Tesco']);
});
