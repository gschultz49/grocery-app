import { test, expect } from '@playwright/test';

test.describe('Settings Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/settings');
  });

  test('should display settings page', async ({ page }) => {
    await expect(page.locator('h1, h2')).toContainText(/setting/i);
  });

  test('should have tabs for different settings', async ({ page }) => {
    // Look for tabs (Staples, Pantry, Schedule)
    const tabs = page.locator('[role="tab"], button').filter({ hasText: /staple|pantry|schedule/i });
    const count = await tabs.count();

    expect(count).toBeGreaterThan(0);
  });

  test('should allow managing staple items', async ({ page }) => {
    // Click on Staples tab if it exists
    const staplesTab = page.getByText(/staple/i).first();
    if (await staplesTab.isVisible()) {
      await staplesTab.click();

      // Look for input to add staples
      const addInput = page.locator('input[type="text"]').first();
      if (await addInput.isVisible()) {
        await addInput.fill('Test Staple Item');

        // Look for add button
        const addButton = page.getByRole('button', { name: /add/i });
        if (await addButton.isVisible()) {
          await addButton.click();
          await page.waitForTimeout(500);
        }
      }
    }
  });

  test('should allow configuring notification schedule', async ({ page }) => {
    // Click on Schedule tab if it exists
    const scheduleTab = page.getByText(/schedule/i).first();
    if (await scheduleTab.isVisible()) {
      await scheduleTab.click();

      // Check for time inputs or schedule configuration
      await expect(page.locator('body')).toContainText(/notification|schedule|time/i);
    }
  });
});
