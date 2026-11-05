import { expect, test } from '@playwright/test';

test('theme and promos survive reload alongside existing cards', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.emulateMedia({ colorScheme: 'light' });
  await page.addInitScript(() => {
    if (localStorage.getItem('pockette.cards.v1')) return;
    localStorage.setItem('pockette.cards.v1', JSON.stringify([
      { id: 'existing', store: 'Old card', label: 'Rewards', number: '000012340987', format: 'code128', color: '#581f32' },
    ]));
  });
  await page.goto('/');
  const card = page.getByRole('button', { name: 'Open Old card, Rewards' });
  await expect(card).toBeVisible();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('group', { name: 'Appearance' }).getByRole('button', { name: 'Dark' }).click();
  await page.getByRole('button', { name: 'Coupons', exact: true }).click();
  await page.getByRole('button', { name: 'Add a coupon', exact: true }).click();
  await page.getByLabel('Store name').fill('Studio');
  await page.getByLabel('Promo code', { exact: true }).fill('IVORY15');
  await page.getByLabel('Offer').fill('15% off');
  await page.getByLabel('Expiry').fill('2020-11-19');
  await page.getByRole('button', { name: 'Save promo' }).click();
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.getByRole('button', { name: 'Cards', exact: true }).click();
  await expect(card).toBeVisible();
  await page.getByRole('button', { name: 'Coupons', exact: true }).click();
  await expect(page.getByText('IVORY15', { exact: true })).toBeVisible();
  await expect(page.getByText(/Expired/)).toBeVisible();
  await page.getByRole('button', { name: 'Copy promo code for Studio' }).click();
  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toBe('IVORY15');
  await page.getByRole('button', { name: 'Edit promo for Studio' }).click();
  await page.getByLabel('Promo code', { exact: true }).fill('IVORY20');
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByText('IVORY20', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Edit promo for Studio' }).click();
  await page.getByRole('button', { name: 'Delete', exact: true }).click();
  await page.getByRole('button', { name: 'Remove promo' }).click();
  await expect(page.getByText('No coupons yet')).toBeVisible();
});
