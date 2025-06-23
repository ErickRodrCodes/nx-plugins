import { expect, test } from '@playwright/test';

test.describe('nx-electron-vite E2E Tests', () => {
  test('should load the React app in browser', async ({ page }) => {
    await page.goto('/');

    // Wait for the app to load
    await page.waitForLoadState('networkidle');

    // Verify the app is loaded (basic check)
    await expect(page).toHaveTitle(/React App/);

    // Check if the main content is visible
    const mainContent = page.locator('main, #root, .app');
    await expect(mainContent).toBeVisible();
  });

  test('should have proper app structure', async ({ page }) => {
    await page.goto('/');

    // Check for common React app elements
    const rootElement = page.locator('#root');
    await expect(rootElement).toBeVisible();

    // Verify the app has some content
    const content = await page.textContent('#root');
    expect(content).toBeTruthy();
  });

  test('should handle basic navigation', async ({ page }) => {
    await page.goto('/');

    // Test that the page is responsive
    await page.setViewportSize({ width: 1280, height: 720 });
    await expect(page).toHaveScreenshot('desktop-view.png');

    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page).toHaveScreenshot('mobile-view.png');
  });
});
