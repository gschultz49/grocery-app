import { test, expect } from '@playwright/test';
import { interceptSupabase, mockAuth, mockApi } from './helpers.js';

test.describe('Navigation – unauthenticated redirects', () => {
  test.beforeEach(async ({ page }) => {
    await interceptSupabase(page);
  });

  test('protected routes redirect to the login page', async ({ page }) => {
    for (const path of ['/', '/recipes', '/settings']) {
      await page.goto(path);
      // Each protected route ends up showing the login page content
      await expect(page.locator('h1')).toHaveText('Grocery List');
      await expect(
        page.getByRole('button', { name: /sign in with google/i })
      ).toBeVisible();
    }
  });
});

test.describe('Navigation – authenticated', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuth(page);
    await mockApi(page);
  });

  test('bottom nav bar renders List / Recipes / Settings links', async ({ page }) => {
    await page.goto('/');

    const nav = page.locator('nav');
    await expect(nav).toBeVisible();

    await expect(nav.getByText('List')).toBeVisible();
    await expect(nav.getByText('Recipes')).toBeVisible();
    await expect(nav.getByText('Settings')).toBeVisible();
  });

  test('tapping nav links transitions between pages', async ({ page }) => {
    await page.goto('/');

    // Start on weekly (List)
    await expect(page.locator('h1')).toHaveText(/this week|no list/i);

    // → Recipes
    await page.locator('nav').getByText('Recipes').click();
    await expect(page.locator('h1')).toHaveText('My Recipes');

    // → Settings
    await page.locator('nav').getByText('Settings').click();
    await expect(page.locator('h1')).toHaveText('Settings');

    // → back to List
    await page.locator('nav').getByText('List').click();
    await expect(page.locator('h1')).toHaveText(/this week|no list/i);
  });

  test('layout is usable at mobile viewport size', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    // Page and nav should still be visible
    await expect(page.locator('nav')).toBeVisible();
    await expect(page.locator('h1')).toBeVisible();
  });
});
