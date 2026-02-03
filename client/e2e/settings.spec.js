import { test, expect } from '@playwright/test';
import { mockAuth, mockApi, MOCK_STAPLES, MOCK_PANTRY } from './helpers.js';

test.describe('Settings Page', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuth(page);
    await mockApi(page);
    await page.goto('/settings');
  });

  test('should display the Settings heading', async ({ page }) => {
    await expect(page.locator('h1')).toHaveText('Settings');
  });

  test('should show Staples / Pantry / Schedule tab buttons', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Staples' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Pantry' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Schedule' })).toBeVisible();
  });

  test('should show the signed-in user email and Sign Out button', async ({ page }) => {
    await expect(page.getByText('gschultz49@gmail.com')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign Out' })).toBeVisible();
  });

  // ----- Staples tab (default) -----
  test('should list staple items', async ({ page }) => {
    for (const item of MOCK_STAPLES) {
      await expect(page.getByText(item.name)).toBeVisible();
    }
  });

  test('should show Active / Paused badges on staples', async ({ page }) => {
    await expect(page.getByText('Active')).toHaveCount(2);
    await expect(page.getByText('Paused')).toHaveCount(1);
  });

  test('should open the add-staple form when + Add is clicked', async ({ page }) => {
    await page.getByRole('button', { name: '+ Add' }).click();

    await expect(page.getByPlaceholder('Item name')).toBeVisible();
    await expect(page.getByPlaceholder('Category (optional)')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Add Staple' })).toBeVisible();
  });

  // ----- Pantry tab -----
  test('should list pantry items on the Pantry tab', async ({ page }) => {
    await page.getByText('Pantry').click();

    for (const item of MOCK_PANTRY) {
      await expect(page.getByText(item.name)).toBeVisible();
    }
  });

  test('should show In Stock / Need to Buy badges', async ({ page }) => {
    await page.getByText('Pantry').click();

    await expect(page.getByText('In Stock')).toBeVisible();
    await expect(page.getByText('Need to Buy')).toBeVisible();
  });

  // ----- Schedule tab -----
  test('should show schedule configuration on the Schedule tab', async ({ page }) => {
    await page.getByText('Schedule').click();

    await expect(page.getByText('Weekly Suggestion Schedule')).toBeVisible();
    await expect(page.getByText('Day of Week')).toBeVisible();
    await expect(page.getByText('Time')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Save Schedule' })).toBeVisible();
  });

  test('should display the next suggestion summary', async ({ page }) => {
    await page.getByText('Schedule').click();

    // mockApi returns day=0 (Sunday), hour=9, minute=0
    // Settings.jsx renders: "Next suggestion: Sunday at 9:00 AM"
    await expect(page.getByText(/next suggestion/i)).toBeVisible();
    await expect(page.getByText('Sunday at 9:00 AM')).toBeVisible();
  });
});
