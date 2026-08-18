import { defineConfig } from '@playwright/test';

/**
 * Layer 2 — Playwright Electron (experimental `_electron`).
 * Does not start a browser webServer; launches the packaged host from Layer 1.
 */
export default defineConfig({
  testDir: './',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  timeout: 120_000,
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: '../tmp/playwright-report' }],
  ],
  use: {
    trace: 'on-first-retry',
  },
});
