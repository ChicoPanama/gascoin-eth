import { expect, type Page, type Response } from '@playwright/test';

export async function gotoReady(page: Page, path: string): Promise<Response | null> {
  const response = await page.goto(path, { waitUntil: 'domcontentloaded' });
  if (response) {
    expect(response.status()).toBeLessThan(500);
  }
  await expect(page.locator('body')).toBeVisible();
  await page.waitForTimeout(50);
  return response;
}

export function collectPageErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  return errors;
}
