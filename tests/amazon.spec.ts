import {test, expect} from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

test('Scrape first visible product in Amazon search', async ({page}) => {
    await page.goto('https://www.amazon.com/');

    await page.fill('#twotabsearchtextbox', 'lenovo thinkpad');
    await page.keyboard.press('Enter');

    const results = page.locator('div.s-main-slot div[data-component-type="s-search-result"]');
    await expect(results.first()).toBeVisible({ timeout: 15000 });

    const resultCount = await results.count();
    let firstVisibleProduct = results.first();
    for (let i = 0; i < resultCount; i++) {
      const card = results.nth(i);
      if (await card.isVisible()) {
        firstVisibleProduct = card;
        break;
      }
    }

    const productData = await firstVisibleProduct.evaluate((el) => {
      const text = (selector: string) => el.querySelector(selector)?.textContent?.trim() ?? '';
      const title = text('h2 span') || text('h2') || text('[role="heading"]');
      const wholePrice = text('span.a-price-whole');
      const fractionPrice = text('span.a-price-fraction');
      const price = wholePrice ? `$${wholePrice}${fractionPrice ? `.${fractionPrice}` : ''}` : 'Price not available';
      const rating = text('span.a-icon-alt') || 'Rating not available';
      const reviews = text('span.a-size-base.s-underline-text') || text('[aria-label*="ratings"]') || 'Reviews not available';
      const href =
        el.querySelector('h2 a')?.getAttribute('href') ||
        el.querySelector('a.a-link-normal[href]')?.getAttribute('href') ||
        '';
      const url = href ? new URL(href, 'https://www.amazon.com').toString() : 'URL not available';
      const asin = el.getAttribute('data-asin') || 'ASIN not available';

      return { title, price, rating, reviews, url, asin };
    });

    console.log('First visible Amazon product:', productData);

    const outputDir = path.join(process.cwd(), 'test-results');
    const outputFile = path.join(outputDir, 'first-visible-product.json');
    await mkdir(outputDir, { recursive: true });
    await writeFile(outputFile, `${JSON.stringify(productData, null, 2)}\n`, 'utf-8');

    await expect(productData.title.length).toBeGreaterThan(0);
});