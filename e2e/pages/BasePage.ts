import { Page, expect } from '@playwright/test';

export class BasePage {
  readonly page: Page;
  constructor(page: Page) { this.page = page; }

  async waitForPageLoad() { await this.page.waitForLoadState('networkidle'); }

  nav = {
    submit: () => this.page.getByRole('link', { name: /Submit/i }),
    community: () => this.page.getByRole('link', { name: /Community/i }),
    leaderboard: () => this.page.getByRole('link', { name: /Leaderboard/i }),
    gates: () => this.page.getByRole('link', { name: /Gates/i }),
    tracker: () => this.page.getByRole('link', { name: /Tracker/i }),
    referral: () => this.page.getByRole('link', { name: /Refer/i }),
    perks: () => this.page.getByRole('link', { name: /Perks/i }),
    walletButton: () => this.page.locator('.wallet-btn'),
  };

  async expectNoOverflow() {
    const overflow = await this.page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(overflow).toBe(false);
  }
}
