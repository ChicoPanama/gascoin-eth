import { test, expect } from '@playwright/test';

const PAGES = ['/', '/submit', '/leaderboard', '/gates', '/wallet', '/standing', '/dashboard', '/referral'];

test.describe('Responsive — Mobile 375px', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  for (const path of PAGES) {
    test(`${path} no horizontal overflow`, async ({ page }) => {
      await page.goto(path);
      await page.waitForLoadState('networkidle');
      if (path === '/') await page.waitForTimeout(4500); // intro
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 2);
      expect(overflow).toBe(false);
    });
  }
});
