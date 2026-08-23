import { test, expect, type Locator, type Page } from '@playwright/test';

const MOBILE = { width: 390, height: 844 };
const TABLET = { width: 768, height: 1024 };
const DESKTOP = { width: 1440, height: 900 };
const WIDE_DESKTOP = { width: 1920, height: 1080 };

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

async function expectMinTouchTarget(locator: Locator, minimum = 44) {
  const box = await locator.boundingBox();
  expect(box, 'interactive target must have layout geometry').not.toBeNull();
  expect(box!.height).toBeGreaterThanOrEqual(minimum);
  expect(box!.width).toBeGreaterThanOrEqual(minimum);
}

async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 2);
  expect(overflow).toBe(false);
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

  test('GAS01B — the approved GAS identity anchors the mobile shell and metadata', async ({ page }) => {
    await page.goto('/');
    const homeLink = page.getByRole('link', { name: 'GAS home' });
    await expect(homeLink.locator('[data-gas-brand="compact"]')).toBeVisible();
    await expect(homeLink.locator('img')).toHaveAttribute('src', /gascoin-g/);
    await expect(page.locator('link[rel="icon"]')).toHaveAttribute('href', /gascoin-g/);
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

  test('GAS03 — Account preserves both easy entry and self-custody wallet choice', async ({ page }) => {
    await page.goto('/account');
    await expect(page.getByText('YOUR ACCOUNT, YOUR CHOICE', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Use my wallet', exact: true })).toBeVisible();
    await expect(page.getByText(/Embedded optional|\d+ embedded/)).toBeVisible();
    await expect(page.getByText(/External optional|\d+ external connected/)).toBeVisible();
    await expect(page.getByText(/Wallet connection never merges assets with GAS reserves/i)).toBeVisible();
  });
});

test.describe('Project GAS responsive shell', () => {
  test('GAS04 — tablet keeps the consumer bottom navigation and expands content intentionally', async ({ page }) => {
    await page.setViewportSize(TABLET);
    await page.goto('/play');

    await expect(page.getByRole('navigation', { name: 'GAS primary navigation' })).toBeVisible();
    await expect(page.getByRole('complementary', { name: 'GAS desktop navigation' })).toBeHidden();
    await expect(page.getByRole('heading', { name: 'PLAY' })).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test('GAS05 — desktop exposes canonical primary destinations plus utility account', async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await page.goto('/play/gas');

    const rail = page.getByRole('complementary', { name: 'GAS desktop navigation' });
    await expect(rail).toBeVisible();

    const nav = rail.getByRole('navigation', { name: 'GAS primary navigation' });
    await expect(nav.getByRole('link')).toHaveCount(5);
    await expect(nav.getByRole('link', { name: 'Home', exact: true })).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Play', exact: true })).toHaveAttribute('aria-current', 'page');
    await expect(nav.getByRole('link', { name: 'Trade', exact: true })).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Crews', exact: true })).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Reserve', exact: true })).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Account', exact: true })).toHaveCount(0);

    await expect(page.getByRole('link', { name: 'Search GAS' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Notifications' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Account', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'IGNITION', exact: true })).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test('GAS06 — wide desktop preserves one product shell without overflow', async ({ page }) => {
    await page.setViewportSize(WIDE_DESKTOP);
    await page.goto('/reserve');

    await expect(page.getByRole('complementary', { name: 'GAS desktop navigation' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'RESERVE' })).toBeVisible();
    await expect(page.getByText(/Live reserve values appear only when a verified source is available/i)).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test('GAS07 — desktop primary routes preserve the same product destinations', async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    const routes = [
      { path: '/', heading: 'GAS' },
      { path: '/play', heading: 'PLAY' },
      { path: '/trade', heading: 'TRADE' },
      { path: '/crews', heading: 'CREWS' },
      { path: '/reserve', heading: 'RESERVE' },
      { path: '/account', heading: 'ACCOUNT' },
    ];

    for (const route of routes) {
      const response = await page.goto(route.path);
      expect(response?.ok()).toBe(true);
      await expect(page.getByRole('heading', { name: route.heading, exact: true })).toBeVisible();
      await expect(page.getByRole('complementary', { name: 'GAS desktop navigation' })).toBeVisible();
      await expectNoHorizontalOverflow(page);
    }
  });

  test('GAS08 — desktop Play adds truthful side context without displacing IGNITION', async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await page.goto('/play/gas');

    await expect(page.getByRole('complementary', { name: 'Round trust context' })).toBeVisible();
    await expect(page.getByRole('complementary', { name: 'Session context' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'VERIFY WHAT MATTERS' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'VERIFIED ACTIVITY ONLY' })).toBeVisible();
    await expect(page.getByText('Not connected', { exact: true }).first()).toBeVisible();

    const ignition = page.getByRole('button', { name: 'IGNITION', exact: true });
    await expect(ignition).toBeVisible();
    await page.getByRole('button', { name: /REDLINE/i }).click();
    await expect(page.getByRole('button', { name: /REDLINE/i })).toHaveAttribute('aria-pressed', 'true');
    await ignition.click();
    await expect(page.getByRole('button', { name: 'IGNITION AGAIN', exact: true })).toBeVisible({ timeout: 4000 });
  });

  test('GAS09 — desktop shell keeps Search, Notifications and Account as utilities', async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await page.goto('/');

    const rail = page.getByRole('complementary', { name: 'GAS desktop navigation' });
    const nav = rail.getByRole('navigation', { name: 'GAS primary navigation' });
    await expect(nav.getByRole('link', { name: 'Account', exact: true })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Search GAS' })).toHaveAttribute('href', '/search');
    await expect(page.getByRole('link', { name: 'Notifications' })).toHaveAttribute('href', '/notifications');
    await expect(page.getByLabel('Account', { exact: true })).toHaveAttribute('href', '/account');
  });
});

test.describe('Phase 9 account authority boundary', () => {
  test.use({ viewport: MOBILE });

  test('GAS18 — unconfigured Project GAS assets render unavailable, never demo money', async ({ page }) => {
    await page.goto('/account');

    const summary = page.getByRole('region', { name: 'GAS account summary' });
    await expect(summary).toBeVisible();
    await expect(summary.getByText('— GAS', { exact: false })).toBeVisible();
    await expect(summary.getByText(/GAS contract is not configured/i)).toBeVisible();
    await expect(summary.getByText(/legacy GASCOIN addresses are not used/i)).toBeVisible();
    await expect(page.getByText(/1,240\.00 GAS/i)).toHaveCount(0);
  });

  test('GAS19 — Home and Account share the same canonical spendable authority model', async ({ page }) => {
    await page.goto('/');
    const homeSummary = page.getByRole('region', { name: 'GAS account summary' });
    await expect(homeSummary).toHaveAttribute('data-account-authority', 'unavailable');
    await expect(homeSummary).toHaveAttribute('data-gas-status', 'unavailable');

    await page.goto('/account');
    const accountSummary = page.getByRole('region', { name: 'GAS account summary' });
    await expect(accountSummary).toHaveAttribute('data-account-authority', 'unavailable');
    await expect(accountSummary).toHaveAttribute('data-gas-status', 'unavailable');
  });

  test('GAS20 — GAS Original reads the USDC entry balance and never invents demo money', async ({ page }) => {
    await page.goto('/play/gas');
    const account = page.getByRole('region', { name: 'GAS account state' });
    await expect(account).toHaveAttribute('data-account-authority', 'unavailable');
    await expect(account).toHaveAttribute('data-entry-asset', 'USDC');
    await expect(account).toHaveAttribute('data-usdc-status', 'unavailable');
    await expect(account.getByText('— USDC', { exact: false })).toBeVisible();
    await expect(page.getByText(/1,240\.00 GAS/i)).toHaveCount(0);
    await expect(page.getByText(/Prototype available/i)).toHaveCount(0);
    await expect(page.getByText(/no live RNG/i)).toBeVisible();
    await expect(page.getByText(/preview data only/i)).toBeVisible();
  });

  test('GAS21 — Base rails expose runtime truth without claiming unavailable services', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });

    await page.goto('/account');
    const rails = page.getByRole('region', { name: 'GAS ON BASE' });

    await expect(rails).toBeVisible();
    await expect(rails.getByText('BASE', { exact: true })).toBeVisible();
    await expect(rails.getByText('STANDARD SIGNING', { exact: true })).toBeVisible();
    await expect(rails.getByText('NORMAL BASE FEE', { exact: true })).toBeVisible();
    await expect(rails.getByText('FUNDING UNAVAILABLE', { exact: true })).toBeVisible();
    await expect(rails.getByText('NOT CONFIGURED', { exact: true })).toBeVisible();
    await expect(rails.getByText(/does not promise a free transaction/i)).toBeVisible();
    await expectNoHorizontalOverflow(page);
    expect(consoleErrors).toEqual([]);
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

    await expectNoHorizontalOverflow(page);
  });

  test('GAS34 — player entry is fixed to USDC while the round and payout remain GAS-native', async ({ page }) => {
    await page.goto('/play/gas');
    const game = page.getByRole('region', { name: 'GAS ORIGINAL' });

    await expect(game.getByLabel('USDC entry amount')).toHaveValue('25');
    await expect(game.getByLabel('Player entry asset USDC')).toHaveText('USDC');
    await expect(game.getByText(/USDC in · GAS sourced automatically/i)).toBeVisible();
    await expect(game.getByText(/Payout in GAS/i)).toBeVisible();
    await expect(game.getByRole('button', { name: /Wager asset|Switch to/i })).toHaveCount(0);

    await game.getByRole('button', { name: 'Instant', exact: true }).click();
    await game.getByRole('button', { name: 'IGNITION', exact: true }).click();
    await expect(game.getByText('GAS-NATIVE ROUND', { exact: true })).toBeVisible({ timeout: 1500 });
    await expect(game.getByText('35.00 GAS', { exact: true })).toBeVisible();
  });

  test('GAS11 — risk mode changes in one action and retains wager amount', async ({ page }) => {
    await page.goto('/play/gas');
    const amount = page.locator('#gas-wager-amount');
    await amount.fill('50');
    await page.getByRole('button', { name: /REDLINE/i }).click();
    await expect(page.getByRole('button', { name: /REDLINE/i })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('[data-phase="ready"][data-mode="redline"]')).toBeVisible();
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
    await expect(page.getByText(/Preview round/i)).toBeVisible();
  });

  test('GAS15 — prototype explicitly states no funds and no live RNG', async ({ page }) => {
    await page.goto('/play/gas');
    await expect(page.getByText(/no live RNG/i)).toBeVisible();
    await expect(page.getByText(/No live sourcing quote, RNG or bankroll settlement is represented/i)).toBeVisible();
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

  test('GAS17 — primary mobile controls preserve a 44px minimum touch target', async ({ page }) => {
    await page.goto('/play/gas');
    await expectMinTouchTarget(page.getByRole('button', { name: /CRUISE/i }));
    await expectMinTouchTarget(page.getByRole('button', { name: /BOOST/i }));
    await expectMinTouchTarget(page.getByRole('button', { name: /REDLINE/i }));
    await expectMinTouchTarget(page.getByRole('button', { name: '10', exact: true }));
    await expectMinTouchTarget(page.getByRole('button', { name: 'Instant', exact: true }));
    await expectMinTouchTarget(page.getByRole('button', { name: 'IGNITION', exact: true }));
  });
});
