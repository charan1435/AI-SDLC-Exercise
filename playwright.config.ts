import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright configuration for Reading List Vote e2e tests.
 * Only Chromium — keeps install time and CI minutes manageable.
 *
 * Tickets: AIEX-808, AIEX-814, AIEX-818, AIEX-822, AIEX-826, AIEX-830, AIEX-834, AIEX-836
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false, // sequential — shared DB state
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [['html', { open: 'never' }], ['list']],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
})
