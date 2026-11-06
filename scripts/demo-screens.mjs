// Captures the demo screen set into docs/screenshots/demo/.
// Run after `npm run build`: `npm run screens`.
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';
import { preview } from 'vite';

const OUT = 'docs/screenshots/demo';
const day = (n) => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10);

const cards = [
  { id: 'demo-1', store: 'IKEA', label: 'IKEA Family', number: '6275981234567890', format: 'code128', color: '#2B3A67', demo: true },
  { id: 'demo-2', store: 'Starbucks', label: 'Starbucks Rewards', number: '6048123456789012', format: 'code128', color: '#1F5F5B', demo: true },
  { id: 'demo-3', store: 'SEPHORA', label: 'Beauty Insider', number: '2891045678901', format: 'code128', color: '#762D46', demo: true },
  { id: 'demo-4', store: 'Tesco', label: 'Clubcard', number: '6340041234567890', format: 'code128', color: '#3A2A25', demo: true },
  { id: 'demo-5', store: 'Decathlon', label: 'Member card', number: 'DKT-2093-5571-04', format: 'qrcode', color: '#2F4858', demo: true },
];
const promos = [
  { id: 'p1', store: 'SEPHORA', code: 'GLOW20', offer: '20% off skincare', expires: day(3) },
  { id: 'p2', store: 'Zara', code: 'AUTUMN15', offer: '15% off new season', expires: day(21) },
  { id: 'p3', store: 'Uber Eats', code: 'WELCOME10', offer: '€10 off your first order', expires: '' },
];

const server = await preview({ preview: { port: 4174, host: '127.0.0.1' }, logLevel: 'silent' });
const base = 'http://127.0.0.1:4174/';
// Set CHROMIUM_PATH to use a browser other than the one Playwright downloaded.
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
await mkdir(OUT, { recursive: true });

async function open({ theme = 'light', lang = 'en', layout = 'stack', splash = false } = {}) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, colorScheme: theme,
    reducedMotion: 'reduce', serviceWorkers: 'block',
  });
  await context.addInitScript(([data, theme, lang, layout, splash]) => {
    localStorage.setItem('pockette.cards.v1', JSON.stringify(data));
    localStorage.setItem('pockette.appearance', theme);
    localStorage.setItem('pockette.lang', lang);
    localStorage.setItem('pockette.layout', layout);
    localStorage.setItem('pockette.hint.grid', 'seen');
    if (!splash) sessionStorage.setItem('pockette.splash', 'shown');
  }, [{ cards, promos }, theme, lang, layout, splash]);
  const page = await context.newPage();
  await page.goto(base);
  await page.evaluate(() => document.fonts.ready);
  return page;
}
const shot = async (page, name) => {
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/${name}.png` });
  console.log('✓', name);
};
const tab = (page, name) => page.getByRole('navigation').getByRole('button', { name, exact: true }).click();

for (const theme of ['light', 'dark']) {
  const p = (n) => `${n}-${theme}`;

  // Launch splash: captured mid-animation, before it fades.
  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, colorScheme: theme, serviceWorkers: 'block' });
    const page = await ctx.newPage();
    await page.goto(base);
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${OUT}/${p('01-splash')}.png` });
    console.log('✓', p('01-splash'));
    await ctx.close();
  }

  let page = await open({ theme });
  await shot(page, p('02-wallet-stack'));

  await page.getByRole('button', { name: /^Open IKEA,/ }).click({ position: { x: 40, y: 24 } });
  await shot(page, p('04-card-barcode'));
  await page.keyboard.press('Escape');

  await page.getByRole('searchbox', { name: 'Search cards' }).fill('se');
  await shot(page, p('05-search'));
  await page.getByRole('button', { name: 'Clear search' }).click();

  await page.getByRole('button', { name: 'Add a card', exact: true }).click();
  await shot(page, p('06-add-card'));
  await page.getByRole('button', { name: 'Enter manually' }).click();
  await page.getByLabel('Store name').fill('Boots');
  await page.getByLabel('Card name').fill('Advantage Card');
  await page.getByLabel('Card number or code').fill('6338001234567');
  await page.locator('input').last().blur();
  await shot(page, p('07-add-card-manual'));
  await page.keyboard.press('Escape');

  await tab(page, 'Coupons');
  await shot(page, p('08-coupons'));
  await tab(page, 'Settings');
  await shot(page, p('09-settings'));
  await page.context().close();

  page = await open({ theme, layout: 'tile' });
  await shot(page, p('03-wallet-tiles'));
  await page.getByRole('button', { name: /^Open Decathlon,/ }).click();
  await shot(page, p('04b-card-qr'));
  await page.context().close();

  page = await open({ theme, lang: 'uk' });
  await shot(page, p('10-wallet-uk'));
  await page.context().close();
}

await browser.close();
await new Promise((r) => server.httpServer.close(r));
