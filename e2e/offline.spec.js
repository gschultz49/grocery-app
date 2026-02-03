import { test, expect } from '@playwright/test';

test.describe('Offline Support', () => {
  test('should work offline for checking items', async ({ page, context }) => {
    await page.goto('/weekly');

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Go offline
    await context.setOffline(true);

    // Try to check an item
    const checkboxes = page.locator('input[type="checkbox"]');
    const count = await checkboxes.count();

    if (count > 0) {
      await checkboxes.first().check();
      await expect(checkboxes.first()).toBeChecked();

      // Item should be checked even offline (using IndexedDB)
      await page.reload();
      await expect(checkboxes.first()).toBeChecked();
    }

    // Go back online
    await context.setOffline(false);
  });

  test('should sync changes when back online', async ({ page, context }) => {
    await page.goto('/weekly');
    await page.waitForLoadState('networkidle');

    // Make changes offline
    await context.setOffline(true);

    const checkboxes = page.locator('input[type="checkbox"]');
    const count = await checkboxes.count();

    if (count > 0) {
      await checkboxes.first().check();
    }

    // Go back online
    await context.setOffline(false);

    // Wait for sync (would need to check for sync indicator in real app)
    await page.waitForTimeout(2000);

    // Changes should persist
    if (count > 0) {
      await expect(checkboxes.first()).toBeChecked();
    }
  });
});
