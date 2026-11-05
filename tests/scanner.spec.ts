import { expect, test, type Page } from '@playwright/test';
import { toBuffer } from 'bwip-js/node';

async function openScanner(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Add a card', exact: true }).click();
  await page.getByRole('button', { name: 'Scan barcode or QR code' }).click();
  await expect(page.getByRole('heading', { name: 'Scan a code' })).toBeVisible();
}

async function png(format: string, number: string) {
  return toBuffer({ bcid: format, text: number, scale: 4, padding: 12, backgroundcolor: 'FFFFFF' });
}

for (const [format, number] of [['code128', '001234567890'], ['qrcode', 'wallet:demo/001234'], ['ean8', '96385074']]) {
  test(`scan a ${format} photo and save its original code`, async ({ page }) => {
    await openScanner(page);
    await page.getByLabel('Photo with a barcode or QR code').setInputFiles({
      name: 'code.png', mimeType: 'image/png', buffer: await png(format, number),
    });
    await expect(page.getByLabel('Code format')).toHaveValue(format);
    await expect(page.getByLabel('Card number or code')).toHaveValue(number);
    await expect(page.getByRole('status').filter({ hasText: /scanned/ })).toBeVisible();
    await page.getByLabel('Store name').fill('Photo test');
    await page.getByRole('button', { name: 'Add to my wallet' }).click();
    await page.reload();
    await page.getByRole('button', { name: /^Open Photo test/ }).click();
    await expect(page.getByRole('img', { name: new RegExp(`Card number ${number}`) })).toBeVisible();
  });
}

test('an unreadable image leaves manual entry available', async ({ page }) => {
  await openScanner(page);
  await page.getByLabel('Photo with a barcode or QR code').setInputFiles({
    name: 'broken.png', mimeType: 'image/png', buffer: Buffer.from('not an image'),
  });
  await expect(page.getByRole('alert')).toContainText('This image could not be read');
  await page.getByRole('button', { name: 'Back to manual entry' }).click();
  await expect(page.getByLabel('Card number or code')).toHaveValue('');
});

test('camera frame fills the form and releases the stream', async ({ page }) => {
  const sample = await png('qrcode', 'camera-demo-00123');
  await page.addInitScript(({ data }) => {
    Object.defineProperty(navigator.mediaDevices, 'getUserMedia', {
      configurable: true,
      value: async () => {
        const img = new Image();
        img.src = `data:image/png;base64,${data}`;
        await img.decode();
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d')!;
        const stream = canvas.captureStream(10);
        const track = stream.getVideoTracks()[0];
        const timer = window.setInterval(() => {
          if (track.readyState === 'ended') {
            clearInterval(timer);
            document.documentElement.dataset.cameraStopped = 'true';
          } else ctx.drawImage(img, 0, 0);
        }, 80);
        return stream;
      },
    });
  }, { data: sample.toString('base64') });
  await openScanner(page);
  await page.getByRole('button', { name: 'Use camera' }).click();
  await expect(page.getByLabel('Card number or code')).toHaveValue('camera-demo-00123');
  await expect(page.locator('html')).toHaveAttribute('data-camera-stopped', 'true');
});
