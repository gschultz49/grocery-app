import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('should show login page when not authenticated', async ({ page }) => {
    await page.goto('/');

    // Should redirect to login or show login UI
    await expect(page).toHaveURL(/.*login.*/i);

    // Check for Google OAuth button
    await expect(page.getByRole('button', { name: /sign in with google/i })).toBeVisible();
  });

  test('should show email whitelist message', async ({ page }) => {
    await page.goto('/');

    // Look for information about authorized emails
    const content = await page.textContent('body');
    expect(content).toContain('email' || 'authorized' || 'access');
  });
});
