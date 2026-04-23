import { test, expect } from '@playwright/test';

const PUBLIC_ROUTES = [
  { path: '/', check: /GASCOIN/i },
  { path: '/submit', check: /Connect|Submit/i },
  { path: '/leaderboard', check: /LEADERBOARD/i },
  { path: '/gates', check: /VERIFICATION|GATES/i },
  { path: '/wallet', check: /WALLET|TRACKER/i },
  { path: '/referral', check: /REFERRAL/i },
  { path: '/standing', check: /STANDING|TOPOGRAPHY/i },
  { path: '/dashboard', check: /TREASURY/i },
];

test.describe('Navigation — All Routes Load', () => {
  for (const route of PUBLIC_ROUTES) {
    test(`${route.path} loads without error`, async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', (err) => errors.push(err.message));
      await page.goto(route.path);
      await page.waitForLoadState('networkidle');
      await expect(page.locator('body')).toBeVisible();
      expect(errors).toHaveLength(0);
    });
  }

  test('/admin redirects to /admin/login', async ({ page }) => {
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  test('unknown route returns 404', async ({ page }) => {
    const res = await page.goto('/nonexistent-page-xyz');
    expect(res?.status()).toBe(404);
  });
});
