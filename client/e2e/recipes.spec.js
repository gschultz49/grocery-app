import { test, expect } from '@playwright/test';
import { mockAuth, mockApi, MOCK_RECIPES } from './helpers.js';

test.describe('Recipes Page', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuth(page);
    await mockApi(page);
    await page.goto('/recipes');
  });

  test('should display the My Recipes heading and count', async ({ page }) => {
    // Recipes.jsx: <h1>My Recipes</h1>  <p>{n} recipes from Notion</p>
    await expect(page.locator('h1')).toHaveText('My Recipes');
    await expect(page.getByText(`${MOCK_RECIPES.length} recipes from Notion`)).toBeVisible();
  });

  test('should list all recipes from the API', async ({ page }) => {
    for (const recipe of MOCK_RECIPES) {
      await expect(page.getByText(recipe.name)).toBeVisible();
    }
  });

  test('should filter recipes by search term', async ({ page }) => {
    const search = page.getByPlaceholder('Search recipes...');
    await search.fill('Oats');

    await expect(page.getByText('Overnight Oats')).toBeVisible();
    await expect(page.getByText('Grilled Chicken')).not.toBeVisible();
    await expect(page.getByText('Pasta Primavera')).not.toBeVisible();
  });

  test('should toggle favorite on a recipe', async ({ page }) => {
    // "Overnight Oats" starts as not-favorite; its heart button has
    // aria-label "Add to favorites"
    const addFav = page.getByRole('button', { name: 'Add to favorites' }).first();
    await addFav.click();

    // After click the mock POST returns success and the local state flips,
    // so the same position should now show "Remove from favorites"
    await expect(
      page.getByRole('button', { name: 'Remove from favorites' })
    ).toHaveCount(MOCK_RECIPES.filter((r) => r.is_favorite).length + 1);
  });

  test('should show category badges on recipes', async ({ page }) => {
    // All mock recipes have a category; at least one "Dinner" badge should appear
    await expect(page.getByText('Dinner').first()).toBeVisible();
  });
});
