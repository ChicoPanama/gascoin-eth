import { test, expect } from '@playwright/test';

test.describe('Project GAS Home', () => {
  test('HP01 — page loads without crash', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('body')).toBeVisible();
  });

  test('HP02 — GAS product hierarchy renders', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'GAS', exact: true })).toBeVisible();
    await expect(page.getByText(/Elastic money · live game · social network/i)).toBeVisible();
    await expect(page.getByText(/Play · hold · trade · Crew/i)).toBeVisible();
  });

  test('HP03 — primary actions expose Play and Trade', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('link', { name: /IGNITION/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /BUY GAS/i })).toBeVisible();
  });

  test('HP04 — mobile shell has exactly five primary destinations', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    const nav = page.getByRole('navigation', { name: 'GAS primary navigation' });
    await expect(nav.getByRole('link')).toHaveCount(5);
    await expect(nav.getByRole('link', { name: /Home/i })).toHaveAttribute('aria-current', 'page');
  });

  test('HP05 — no horizontal overflow at primary mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 2);
    expect(overflow).toBe(false);
  });

  test('HP06 — unavailable monetary and social authority never becomes fabricated live state', async ({ page }) => {
    await page.goto('/');

    const account = page.getByRole('region', { name: 'GAS account summary' });
    await expect(account).toHaveAttribute('data-account-authority', 'unavailable');
    await expect(account).toHaveAttribute('data-gas-status', 'unavailable');

    const activity = page.getByRole('region', { name: 'GAS canonical activity' });
    await expect(activity).toHaveAttribute('data-activity-authority', 'unavailable');
    await expect(activity.getByText('NO LIVE ACTIVITY', { exact: true })).toBeVisible();
    await expect(activity.getByText(/No synthetic players, wins, trades or Crew events/i)).toBeVisible();

    await expect(page.getByText(/Unconfigured state remains unavailable rather than estimated/i)).toBeVisible();
  });
});
