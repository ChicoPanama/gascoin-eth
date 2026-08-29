import { test, expect } from '@playwright/test';
import { gotoReady } from './helpers/navigation';

test.describe('Legacy compatibility — page semantics', () => {
  test('LB01 — leaderboard renders its primary heading', async ({ page }) => {
    await gotoReady(page, '/leaderboard');
    await expect(page.getByRole('heading', { name: /LEADERBOARD/i }).first()).toBeVisible();
  });

  test('LB02 — leaderboard stats surface renders', async ({ page }) => {
    await gotoReady(page, '/leaderboard');
    const stats = page.locator('.gc-stat');
    await expect(stats.first()).toBeVisible();
    expect(await stats.count()).toBeGreaterThan(0);
  });

  test('CF01 — /community redirects to the recent leaderboard view', async ({ page }) => {
    await gotoReady(page, '/community');
    await expect(page).toHaveURL(/\/leaderboard\?view=recent/);
  });

  test('CF02 — recent leaderboard view exposes its filter tabs', async ({ page }) => {
    await gotoReady(page, '/leaderboard?view=recent');
    await expect(page.locator('.cf-filter-tab')).toHaveCount(3);
  });

  test('GT01 — gates page renders the current gate set', async ({ page }) => {
    await gotoReady(page, '/gates');
    const count = await page.locator('.gt-card').count();
    expect(count).toBeGreaterThan(0);
  });

  test('GT02 — checklist starts with zero completed gates', async ({ page }) => {
    await gotoReady(page, '/gates');
    await page.evaluate(() => localStorage.removeItem('gascoin_preflight'));
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.getByText(/0\s*\/\s*\d+/).first()).toBeVisible();
  });

  test('GT03 — TWEET filter narrows to a non-empty subset', async ({ page }) => {
    await gotoReady(page, '/gates');
    const cards = page.locator('.gt-card');
    const total = await cards.count();
    expect(total).toBeGreaterThan(0);

    await page.locator('.cf-filter-tab', { hasText: /TWEET/i }).click();
    await expect(cards.first()).toBeVisible();
    const filtered = await cards.count();
    expect(filtered).toBeGreaterThan(0);
    expect(filtered).toBeLessThanOrEqual(total);
  });

  test('WT01 — wallet tracker has an idle state without a wallet', async ({ page }) => {
    await gotoReady(page, '/wallet');
    await expect(page.locator('.wt-idle')).toBeVisible();
  });

  test('WT02 — wallet URL parameter opens the connected state', async ({ page }) => {
    await gotoReady(page, '/wallet?address=GAsxK92TestWalletAddress1234567890abcdef12345');
    await expect(page.locator('.wt-connected-bar')).toBeVisible();
  });

  test('RE01 — referral page exposes the unauthenticated wallet gate', async ({ page }) => {
    await gotoReady(page, '/referral');
    await expect(page.locator('.ref-gate')).toBeVisible();
  });

  test('TG01 — standing page renders all tier labels', async ({ page }) => {
    await gotoReady(page, '/standing');
    await expect(page.getByText('Standard', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Commuter', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Road Warrior', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Fleet', { exact: true }).first()).toBeVisible();
  });

  test('TG02 — /perks legacy URL redirects to /standing', async ({ page }) => {
    await gotoReady(page, '/perks');
    await expect(page).toHaveURL(/\/standing/);
  });

  test('DB01 — dashboard renders its Treasury heading', async ({ page }) => {
    await gotoReady(page, '/dashboard');
    await expect(page.getByRole('heading', { name: 'TREASURY' })).toBeVisible();
  });

  test('AD01 — protected admin route redirects to login', async ({ page }) => {
    await gotoReady(page, '/admin/submissions');
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  test('AD02 — admin login page renders', async ({ page }) => {
    await gotoReady(page, '/admin/login');
    await expect(page.getByText(/ADMIN ACCESS/i).first()).toBeVisible();
  });
});
