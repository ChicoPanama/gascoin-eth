import { test, expect } from '@playwright/test';
import { gotoReady } from './helpers/navigation';

const PAGES = ['/', '/submit', '/leaderboard', '/gates', '/wallet', '/standing', '/dashboard', '/referral'];

test.describe('Responsive — legacy compatibility at 375px', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  for (const path of PAGES) {
    test(`${path} has no horizontal document overflow`, async ({ page }) => {
      await gotoReady(page, path);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth + 2,
      );
      expect(overflow).toBe(false);
    });
  }
});
