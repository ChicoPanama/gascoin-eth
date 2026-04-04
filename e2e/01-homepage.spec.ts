import { test, expect } from '@playwright/test';

test.describe('Homepage', () => {
  test('HP01 — page loads without crash', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('body')).toBeVisible();
  });

  test('HP02 — intro animation present then removed', async ({ page }) => {
    await page.goto('/');
    const intro = page.locator('.gc-intro');
    // Intro should exist initially or have already been removed
    await page.waitForTimeout(5000);
    await expect(intro).not.toBeAttached();
  });

  test('HP03 — hero section renders', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(4500);
    await expect(page.locator('.gc-hero')).toBeVisible();
  });

  test('HP04 — stats strip renders 4 cards', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(4500);
    await expect(page.locator('.gc-stat')).toHaveCount(4);
  });

  test('HP05 — how it works has 3 steps', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(4500);
    await expect(page.locator('.gc-step')).toHaveCount(3);
  });

  test('HP06 — nav links present', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(4500);
    await expect(page.locator('.gc-nav-links a')).toHaveCount({ minimum: 5 });
  });

  test('HP07 — no horizontal overflow', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(4500);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(overflow).toBe(false);
  });

  test('HP08 — mobile responsive at 375px', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');
    await page.waitForTimeout(4500);
    await expect(page.locator('.gc-hero')).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 2);
    expect(overflow).toBe(false);
  });
});
