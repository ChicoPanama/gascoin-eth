import { test, expect } from '@playwright/test';

const MOBILE = { width: 390, height: 844 };
const DESKTOP = { width: 1440, height: 900 };

test.describe('Phase 9 read-only authority models', () => {
  test('GAS21 — reserve API returns explicit unavailable state when no approved source is configured', async ({ request }) => {
    const response = await request.get('/api/project-gas/reserve');
    expect(response.ok()).toBe(true);

    const body = await response.json();
    expect(body).toMatchObject({
      version: 1,
      status: 'unavailable',
      authority: 'unavailable',
      rebase: { status: 'unavailable' },
    });
    expect(body.message).toMatch(/No approved Project GAS reserve read source is configured/i);
    expect(body.exclusions.map((item: { id: string }) => item.id)).toEqual([
      'gas',
      'wgas',
      'self-pol',
      'game-bankroll',
      'bracket-collateral',
    ]);
  });

  test('GAS22 — Reserve page renders unavailable instead of fabricating coverage', async ({ page }) => {
    await page.setViewportSize(MOBILE);
    await page.goto('/reserve');

    const summary = page.getByRole('region', { name: 'GAS reserve summary' });
    await expect(summary).toBeVisible();
    await expect(summary).toHaveAttribute('data-reserve-authority', 'unavailable');
    await expect(summary).toHaveAttribute('data-reserve-status', 'unavailable');
    await expect(summary.getByText(/No approved Project GAS reserve read source is configured/i)).toBeVisible();
    await expect(page.getByText('GAS ≠ RESERVE', { exact: true })).toBeVisible();
    await expect(page.getByText(/GameBankroll/).first()).toBeVisible();
  });

  test('GAS23 — Reserve truth model preserves the responsive desktop shell', async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await page.goto('/reserve');

    await expect(page.getByRole('complementary', { name: 'GAS desktop navigation' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'RESERVE' })).toBeVisible();
    await expect(page.getByRole('region', { name: 'GAS reserve summary' })).toBeVisible();

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 2);
    expect(overflow).toBe(false);
  });

  test('GAS24 — activity API returns explicit unavailable state when no approved source is configured', async ({ request }) => {
    const response = await request.get('/api/project-gas/activity');
    expect(response.ok()).toBe(true);

    const body = await response.json();
    expect(body).toMatchObject({
      version: 1,
      status: 'unavailable',
      authority: 'unavailable',
      health: 'offline',
      events: [],
    });
    expect(body.message).toMatch(/No approved Project GAS activity read source is configured/i);
  });

  test('GAS25 — Home uses the canonical activity projection and never inserts synthetic activity', async ({ page }) => {
    await page.setViewportSize(MOBILE);
    await page.goto('/');

    const activity = page.getByRole('region', { name: 'GAS canonical activity' });
    await expect(activity).toBeVisible();
    await expect(activity).toHaveAttribute('data-activity-authority', 'unavailable');
    await expect(activity).toHaveAttribute('data-activity-status', 'unavailable');
    await expect(activity.getByText('NO LIVE ACTIVITY', { exact: true })).toBeVisible();
    await expect(activity.getByText(/No synthetic players, wins, trades or Crew events/i)).toBeVisible();
  });

  test('GAS26 — canonical activity deep link preserves honest unavailable state', async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await page.goto('/activity/evt-does-not-exist');

    await expect(page.getByRole('heading', { name: 'ACTIVITY' })).toBeVisible();
    await expect(page.getByText('UNAVAILABLE', { exact: true })).toBeVisible();
    await expect(page.getByText(/No approved Project GAS activity read source is configured/i)).toBeVisible();
    await expect(page.getByRole('complementary', { name: 'GAS desktop navigation' })).toBeVisible();
  });
});
