import {test,expect} from '@playwright/test';
test.beforeEach(({ page }) => page.addInitScript(() => sessionStorage.setItem('pockette.splash', 'shown')));
test('wallet CRUD, search, rendering, persistence and list keyboard access',async({page})=>{
 await page.goto('/');
 await expect(page.getByRole('button',{name:'Open IKEA, IKEA Family, demo card'})).toBeVisible();
 await page.getByRole('button',{name:'Add a card',exact:true}).click();
 // A new card opens on the choice: no fields until a scan or manual entry.
 await expect(page.getByLabel('Store name')).toHaveCount(0);
 await page.getByRole('button',{name:'Enter manually'}).click();
 await expect(page.getByLabel('Store name')).toBeFocused();
 await page.getByLabel('Store name').fill('My grocery');
 await page.getByLabel('Card name').fill('Weekly shopping');
 await page.getByLabel('Card number or code').fill('001234567890');
 await page.getByRole('button',{name:'Add to my wallet'}).click();
 await page.reload();
 await page.getByRole('searchbox',{name:'Search cards'}).fill('grocery');
 await expect(page.getByRole('button',{name:/Open My grocery/})).toBeVisible();
 await expect(page.getByRole('button',{name:/Open IKEA/})).toHaveCount(0);
 await page.getByRole('button',{name:/Open My grocery/}).click();
 await expect(page.getByRole('img',{name:/Barcode for My grocery/})).toBeVisible();
 await expect(page.getByRole('dialog').getByText('001234567890',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Edit card',exact:true}).click();
 await page.getByLabel('Code format').selectOption('qrcode');
 await page.getByRole('button',{name:'Save changes'}).click();
 await page.getByRole('button',{name:/Open My grocery/}).click();
 await expect(page.getByRole('img',{name:/QR code for My grocery/})).toBeVisible();
 await page.keyboard.press('Escape');
 await expect(page.getByRole('button',{name:/Open My grocery/})).toBeFocused();
 await page.getByRole('button',{name:'Clear search'}).click();
 await page.getByRole('button',{name:'Tile view'}).click();
 await page.getByRole('button',{name:/Open My grocery/}).focus();
 await page.keyboard.press('Enter');
 await page.getByRole('button',{name:'Delete',exact:true}).click();
 await page.getByRole('button',{name:'Remove card',exact:true}).click();
 await page.reload();
 await expect(page.getByRole('button',{name:/Open My grocery/})).toHaveCount(0);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
test('EAN check digits and offline app shell',async({page,context})=>{
 await page.goto('/');
 await page.evaluate(async()=>{await navigator.serviceWorker.ready;});
 await page.getByRole('button',{name:'Add a card',exact:true}).click();
 await page.getByRole('button',{name:'Enter manually'}).click();
 await page.getByLabel('Store name').fill('EAN test');
 await page.getByLabel('Code format').selectOption('ean13');
 await page.getByLabel('Card number or code').fill('4006381333932');
 await page.getByRole('button',{name:'Add to my wallet'}).click();
 await expect(page.getByRole('alert')).toContainText('check digit');
 await page.getByLabel('Card number or code').fill('4006381333931');
 await page.getByRole('button',{name:'Add to my wallet'}).click();
 await page.getByRole('button',{name:/Open EAN test/}).click();
 await expect(page.getByRole('img',{name:/Barcode for EAN test/})).toBeVisible();
 await page.keyboard.press('Escape');
 await page.reload();
 await context.setOffline(true);
 await page.reload();
 await expect(page.getByRole('heading',{name:'Your cards'})).toBeVisible();
 await expect(page.getByRole('button',{name:/Open EAN test/})).toBeVisible();
});
test('backup import merges without duplicating cards',async({page})=>{
 await page.goto('/');
 const card={id:'test',store:'Backup shop',label:'Rewards',number:'00123',format:'code128',color:'#581f32'};
 for(let i=0;i<2;i++) await page.locator('input[type=file]').setInputFiles({name:'backup.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify([card]))});
 await expect(page.getByRole('button',{name:/Open Backup shop/})).toHaveCount(1);
});

test('each exposed stack card opens its own code', async ({page}) => {
  await page.goto('/');
  for (const store of ['IKEA', 'Starbucks', 'SEPHORA', 'Tesco']) {
    // Only the top strip of a stacked card is exposed; tap there, as a person would.
    await page.getByRole('button', {name: new RegExp(`^Open ${store},`)}).click({position: {x: 40, y: 24}});
    await expect(page.getByRole('dialog').getByRole('heading', {name: store, exact: true})).toBeVisible();
    await page.getByRole('button', {name: 'Close dialog'}).click();
  }
});
