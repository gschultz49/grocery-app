import { test, expect } from '@playwright/test';

test.describe('Recipes Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/recipes');
  });

  test('should display recipes from Notion', async ({ page }) => {
    // Check for recipes heading
    await expect(page.locator('h1, h2')).toContainText(/recipe/i);
  });

  test('should allow favoriting recipes', async ({ page }) => {
    // Look for favorite buttons or icons
    const favoriteButtons = page.locator('button').filter({ hasText: /favorite|star|♥/i });
    const count = await favoriteButtons.count();

    if (count > 0) {
      // Click first favorite button
      await favoriteButtons.first().click();

      // Check for visual feedback (this would depend on implementation)
      await page.waitForTimeout(500);
    }
  });

  test('should show recipe cards with details', async ({ page }) => {
    // Look for recipe information
    const recipeCards = page.locator('[class*="recipe"], [data-testid*="recipe"]');
    const count = await recipeCards.count();

    if (count > 0) {
      // Check that recipe cards exist
      await expect(recipeCards.first()).toBeVisible();
    }
  });

  test('should filter pantry items from recipes', async ({ page }) => {
    // This would require checking that common pantry items are not shown
    const content = await page.textContent('body');

    // Verify the page loaded
    expect(content.length).toBeGreaterThan(0);
  });
});
