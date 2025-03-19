import { defineConfig, devices } from "@playwright/test";

/**
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({

  testDir: "tests",

  /* Run tests in files in parallel */
  fullyParallel: false,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  //retries: process.env.CI ? 2 : 0,

  retries: 0,
  timeout: 8 * 1000, //Timeout for each test, includes test, hooks and fixtures:
  expect: { timeout: 8000 }, // this timeout is for assertions ex: expect(locator).toBeVisible({ timeout: 10000 })
  /* Opt out of parallel tests on CI. */
  //workers: process.env.CI ? 1 : undefined,
  workers: 1,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  //reporter: [["html"]],
  reporter: [
    ['list'],  // Console reporter for immediate feedback
    ['html', {
      outputFolder: 'playwright-report',
      open: 'never'
    }],
    ['@skillsoft-security-chapter/percipiosecretloader', {
      channels: ['your-slack-channel'],
      notifyOnSuccess: true,
      notifyOnFailure: true
    }]
  ],
  
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    // baseURL: BASEURL,

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: "on-first-retry",
    screenshot : "only-on-failure",
    // Add video recording on failure
    video: "retain-on-failure"
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: "Chromium",
      use: {
        ...devices["Desktop Chrome"],
      },
    },
   
  ],
 
});