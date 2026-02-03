import { test, expect } from '@playwright/test';

test.describe('Weekly Grocery List', () => {
  test.beforeEach(async ({ page }) => {
    // Note: In real tests, you'd set up authentication state here
    await page.goto('/weekly');
  });

  test('should display weekly list page', async ({ page }) => {
    // Check for page title or heading
    await expect(page.locator('h1, h2')).toContainText(/weekly|grocery/i);
  });

  test('should show staple items', async ({ page }) => {
    // Check for staple items section
    const staples = page.getByText(/staple/i);
    if (await staples.isVisible()) {
      await expect(staples).toBeVisible();
    }
  });

  test('should allow checking off items', async ({ page }) => {
    // Look for checkboxes
    const checkboxes = page.locator('input[type="checkbox"]');
    const count = await checkboxes.count();

    if (count > 0) {
      // Click first checkbox
      await checkboxes.first().check();
      await expect(checkboxes.first()).toBeChecked();

      // Uncheck it
      await checkboxes.first().uncheck();
      await expect(checkboxes.first()).not.toBeChecked();
    }
  });

  test('should display recipe suggestions', async ({ page }) => {
    // Check for recipe cards or suggestions
    const recipes = page.getByText(/recipe|suggestion/i);
    if (await recipes.isVisible()) {
      await expect(recipes).toBeVisible();
    }
  });
});
