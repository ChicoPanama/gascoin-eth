import { defineConfig, devices } from '@playwright/test';

const webServerCommand = process.env.CI
  ? './node_modules/.bin/next start --hostname 127.0.0.1'
  : 'npm run build && ./node_modules/.bin/next start --hostname 127.0.0.1';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : 1,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['json', { outputFile: 'test-results/results.json' }],
  ],
  use: {
    baseURL: 'http://127.0.0.1:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 15000,
    navigationTimeout: 30000,
  },
  projects: [
    { name: 'setup', testMatch: /.*\.setup\.ts/ },
    { name: 'chromium', use: { ...devices['Desktop Chrome'] }, dependencies: ['setup'] },
    { name: 'mobile-chrome', use: { ...devices['Pixel 5'] }, dependencies: ['setup'] },
    { name: 'mobile-safari', use: { ...devices['iPhone 13'] }, dependencies: ['setup'] },
  ],
  webServer: {
    command: webServerCommand,
    url: 'http://127.0.0.1:3000',
    reuseExistingServer: !process.env.CI,
    timeout: process.env.CI ? 60000 : 300000,
  },
});
