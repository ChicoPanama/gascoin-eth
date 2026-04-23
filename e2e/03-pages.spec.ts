import { test, expect } from '@playwright/test';

test.describe('Leaderboard', () => {
  test('LB01 — renders title', async ({ page }) => {
    await page.goto('/leaderboard');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText(/LEADERBOARD/)).toBeVisible();
  });

  test('LB02 — stats strip renders', async ({ page }) => {
    await page.goto('/leaderboard');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('.gc-stat')).toHaveCount(4);
  });
});

test.describe('Community Feed', () => {
  test('CF01 — renders title', async ({ page }) => {
    await page.goto('/community');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText(/COMMUNITY/i)).toBeVisible();
  });

  test('CF02 — filter tabs render', async ({ page }) => {
    await page.goto('/community');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('.cf-filter-tab')).toHaveCount(3);
  });
});

test.describe('Gates Page', () => {
  test('GT01 — renders with gate cards', async ({ page }) => {
    await page.goto('/gates');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('.gt-card')).toHaveCount(10);
  });

  test('GT02 — checklist starts at 0', async ({ page }) => {
    // Clear localStorage first
    await page.goto('/gates');
    await page.evaluate(() => localStorage.removeItem('gascoin_preflight'));
    await page.reload();
    await page.waitForLoadState('networkidle');
    await expect(page.getByText(/0 \/ 10/)).toBeVisible();
  });

  test('GT03 — category filter TWEET shows 4', async ({ page }) => {
    await page.goto('/gates');
    await page.waitForLoadState('networkidle');
    const tweetBtn = page.locator('.cf-filter-tab', { hasText: /TWEET/i });
    await tweetBtn.click();
    await expect(page.locator('.gt-card')).toHaveCount(4);
  });
});

test.describe('Wallet Tracker', () => {
  test('WT01 — idle state without wallet', async ({ page }) => {
    await page.goto('/wallet');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('.wt-idle')).toBeVisible();
  });

  test('WT02 — URL param triggers lookup', async ({ page }) => {
    await page.goto('/wallet?address=GAsxK92TestWalletAddress1234567890abcdef12345');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('.wt-connected-bar')).toBeVisible();
  });
});

test.describe('Referral Page', () => {
  test('RE01 — wallet gate when not connected', async ({ page }) => {
    await page.goto('/referral');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('.ref-gate')).toBeVisible();
  });
});

test.describe('Standing Page', () => {
  test('TG01 — renders tier grid', async ({ page }) => {
    await page.goto('/standing');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText(/Standard/i)).toBeVisible();
    await expect(page.getByText(/Commuter/i)).toBeVisible();
    await expect(page.getByText(/Road Warrior/i)).toBeVisible();
    await expect(page.getByText(/Fleet/i)).toBeVisible();
  });

  test('TG02 — /perks legacy URL 308-redirects to /standing', async ({ page }) => {
    const response = await page.goto('/perks');
    // Next.js handles the redirect server-side; final URL should be /standing
    await page.waitForLoadState('networkidle');
    expect(page.url()).toContain('/standing');
  });
});

test.describe('Dashboard', () => {
  test('DB01 — renders title', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText(/TREASURY/i)).toBeVisible();
  });
});

test.describe('Admin', () => {
  test('AD01 — redirects to login without session', async ({ page }) => {
    await page.goto('/admin/submissions');
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  test('AD02 — login page renders', async ({ page }) => {
    await page.goto('/admin/login');
    await expect(page.getByText(/ADMIN ACCESS/i)).toBeVisible();
  });
});
