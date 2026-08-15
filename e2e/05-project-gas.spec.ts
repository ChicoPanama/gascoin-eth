import { test, expect, type Locator, type Page } from '@playwright/test';

const MOBILE = { width: 390, height: 844 };

async function expectPrimaryAboveNavAtScrollTop(page: Page, primary: Locator) {
  await expect(primary).toBeAttached();
  await page.evaluate(() => window.scrollTo(0, 0));
  expect(await page.evaluate(() => window.scrollY)).toBe(0);

  const nav = page.getByRole('navigation', { name: 'GAS primary navigation' });
  const [primaryBox, navBox] = await Promise.all([primary.boundingBox(), nav.boundingBox()]);

  expect(primaryBox, 'primary action must have layout geometry').not.toBeNull();
  expect(navBox, 'bottom nav must have layout geometry').not.toBeNull();
  expect(primaryBox!.y).toBeGreaterThanOrEqual(0);
  expect(primaryBox!.y + primaryBox!.height).toBeLessThanOrEqual(navBox!.y - 2);
}

test.describe('Project GAS mobile shell', () => {
  test.use({ viewport: MOBILE });

  test('GAS01 — all five primary destinations resolve', async ({ page }) => {
    for (const path of ['/', '/play', '/trade', '/crews', '/account']) {
      const response = await page.goto(path);
      expect(response?.ok()).toBe(true);
      await expect(page.getByRole('navigation', { name: 'GAS primary navigation' })).toBeVisible();
    }
  });

  test('GAS02 — Reserve remains one action from Home without occupying bottom nav', async ({ page }) => {
    await page.goto('/');
    const nav = page.getByRole('navigation', { name: 'GAS primary navigation' });
    await expect(nav.getByRole('link')).toHaveCount(5);
    await expect(nav.getByRole('link', { name: /Reserve/i })).toHaveCount(0);
    await page.getByRole('link', { name: /MONETARY STATE/i }).click();
    await expect(page).toHaveURL(/\/reserve$/);
    await expect(page.getByRole('heading', { name: 'RESERVE' })).toBeVisible();
  });
});

test.describe('GAS Original prototype loop', () => {
  test.use({ viewport: MOBILE });

  test('GAS10 — primary controls render without horizontal overflow', async ({ page }) => {
    await page.goto('/play/gas');
    await expect(page.getByRole('heading', { name: 'GAS ORIGINAL' })).toBeVisible();
    await expect(page.getByRole('button', { name: /CRUISE/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /BOOST/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /REDLINE/i })).toBeVisible();
    await expect(page.getByRole('button', { name: 'IGNITION', exact: true })).toBeVisible();

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 2);
    expect(overflow).toBe(false);
  });

  test('GAS11 — risk mode changes in one action and retains wager amount', async ({ page }) => {
    await page.goto('/play/gas');
    const amount = page.locator('#gas-wager-amount');
    await amount.fill('50');
    await page.getByRole('button', { name: /REDLINE/i }).click();
    await expect(page.getByRole('button', { name: /REDLINE/i })).toHaveAttribute('aria-pressed', 'true');
    await expect(amount).toHaveValue('50');
  });

  test('GAS12 — settled result replays with one IGNITION AGAIN action', async ({ page }) => {
    await page.goto('/play/gas');
    await page.getByRole('button', { name: 'IGNITION', exact: true }).click();
    const replay = page.getByRole('button', { name: 'IGNITION AGAIN', exact: true });
    await expect(replay).toBeVisible({ timeout: 4000 });

    await replay.click();
    await expect(replay).toBeVisible({ timeout: 4000 });
  });

  test('GAS13 — Instant mode keeps explicit state but reaches result quickly', async ({ page }) => {
    await page.goto('/play/gas');
    await page.getByRole('button', { name: 'Instant', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Instant', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await page.getByRole('button', { name: 'IGNITION', exact: true }).click();
    await expect(page.getByRole('button', { name: 'IGNITION AGAIN', exact: true })).toBeVisible({ timeout: 1500 });
  });

  test('GAS14 — result can reach canonical round verification in one secondary action', async ({ page }) => {
    await page.goto('/play/gas');
    await page.getByRole('button', { name: 'Instant', exact: true }).click();
    await page.getByRole('button', { name: 'IGNITION', exact: true }).click();
    const verify = page.getByRole('link', { name: /Verify round/i });
    await expect(verify).toBeVisible({ timeout: 1500 });
    await verify.click();
    await expect(page).toHaveURL(/\/round\/prototype-round-1$/);
    await expect(page.getByText(/Prototype round/i)).toBeVisible();
  });

  test('GAS15 — prototype explicitly states no funds and no live RNG', async ({ page }) => {
    await page.goto('/play/gas');
    await expect(page.getByText(/no funds move · no live RNG/i)).toBeVisible();
    await expect(page.getByText(/payout curves, RNG and bankroll settlement are not represented/i)).toBeVisible();
  });

  test('GAS16 — IGNITION and settled replay stay above fixed nav without scrolling at 390x844', async ({ page }) => {
    await page.goto('/play/gas');
    const ignition = page.getByRole('button', { name: 'IGNITION', exact: true });
    await expectPrimaryAboveNavAtScrollTop(page, ignition);

    await page.getByRole('button', { name: 'Instant', exact: true }).click();
    await ignition.click();
    const replay = page.getByRole('button', { name: 'IGNITION AGAIN', exact: true });
    await expect(replay).toBeVisible({ timeout: 1500 });
    await expectPrimaryAboveNavAtScrollTop(page, replay);
  });
});
