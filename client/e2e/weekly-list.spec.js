import { test, expect } from '@playwright/test';
import { mockAuth, mockApi } from './helpers.js';

test.describe('Weekly Grocery List', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuth(page);
    await mockApi(page);
    await page.goto('/');
  });

  test('should display the weekly list header', async ({ page }) => {
    // Weekly.jsx renders h1 "This Week's Groceries" when a list exists
    await expect(page.locator('h1')).toHaveText("This Week's Groceries");
  });

  test('should show the checked/total counter', async ({ page }) => {
    // One item is pre-checked in MOCK_WEEKLY (Rice), so 1/4
    await expect(page.locator('text=1/4')).toBeVisible();
  });

  test('should render grocery items grouped by category', async ({ page }) => {
    // Items from MOCK_WEEKLY
    await expect(page.getByText('Bananas')).toBeVisible();
    await expect(page.getByText('Bare Bell Bar')).toBeVisible();
    await expect(page.getByText('Chicken Breast')).toBeVisible();
  });

  test('should allow checking off an item', async ({ page }) => {
    await expect(page.getByText('Bananas')).toBeVisible();

    // GroceryItem renders a checkbox inside a <label> sibling to the text span;
    // navigate up to the item root and click the actual checkbox input
    await page.getByText('Bananas').locator('..').locator('..').locator('input[type="checkbox"]').click();

    // Counter should update to 2/4
    await expect(page.locator('text=2/4')).toBeVisible();
  });

  test('should show the Recipes tab with suggestions', async ({ page }) => {
    // Switch to Recipes tab; use button role to avoid the nav <a> link
    await page.getByRole('button', { name: /Recipes/ }).click();

    // MOCK_WEEKLY has one suggested recipe
    await expect(page.getByText('Pasta Primavera')).toBeVisible();
    await expect(page.getByText('Suggested for This Week')).toBeVisible();
  });

  test('should show accepted recipes under Making This Week', async ({ page }) => {
    await page.getByRole('button', { name: /Recipes/ }).click();

    // MOCK_WEEKLY has one accepted recipe
    await expect(page.getByText('Grilled Chicken')).toBeVisible();
    await expect(page.getByText('Making This Week')).toBeVisible();
  });
});
