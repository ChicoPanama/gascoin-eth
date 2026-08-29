import { test, expect } from '@playwright/test';
import { collectPageErrors, gotoReady } from './helpers/navigation';

const PUBLIC_ROUTES = [
  '/',
  '/submit',
  '/leaderboard',
  '/gates',
  '/wallet',
  '/referral',
  '/standing',
  '/dashboard',
];

test.describe('Navigation — route smoke', () => {
  for (const path of PUBLIC_ROUTES) {
    test(`${path} loads without a server or browser error`, async ({ page }) => {
      const errors = collectPageErrors(page);
      await gotoReady(page, path);
      expect(errors, `uncaught browser errors on ${path}`).toHaveLength(0);
    });
  }

  test('/admin redirects to /admin/login', async ({ page }) => {
    await gotoReady(page, '/admin');
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  test('unknown route returns 404', async ({ page }) => {
    const response = await page.goto('/nonexistent-page-xyz', { waitUntil: 'domcontentloaded' });
    expect(response?.status()).toBe(404);
  });
});
