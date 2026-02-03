import { test, expect } from '@playwright/test';
import { interceptSupabase } from './helpers.js';

test.describe('Authentication', () => {
  test.beforeEach(async ({ page }) => {
    // Prevent Supabase requests from hanging so the null-session
    // resolves immediately and the app reaches the login page.
    await interceptSupabase(page);
  });

  test('should redirect to login when not authenticated', async ({ page }) => {
    await page.goto('/');

    // React's ProtectedRoute does a client-side redirect after getSession resolves.
    // Wait for the login page heading to appear rather than polling the URL.
    await expect(page.locator('h1')).toHaveText('Grocery List');
  });

  test('should show the Google sign-in button', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('h1')).toHaveText('Grocery List');

    await expect(
      page.getByRole('button', { name: /sign in with google/i })
    ).toBeVisible();
  });

  test('should show access-restricted message', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('h1')).toHaveText('Grocery List');

    // Login.jsx renders: "Access is restricted to authorized users only."
    await expect(page.getByText(/access is restricted/i)).toBeVisible();
  });
});
