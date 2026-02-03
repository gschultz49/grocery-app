import { test, expect } from '@playwright/test';
import { mockAuth, mockApi } from './helpers.js';

test.describe('Offline Support', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuth(page);
    await mockApi(page);
  });

  test('should display an offline banner when the network is cut', async ({ page }) => {
    await page.goto('/');

    // Wait for the page to be fully loaded while online
    await expect(page.locator('h1')).toHaveText(/this week|no list/i);

    // Go offline – setOffline blocks network requests and sets navigator.onLine,
    // but does not fire the window event; dispatch it so the useOffline hook reacts
    await page.context().setOffline(true);
    await page.evaluate(() => window.dispatchEvent(new Event('offline')));

    await expect(page.getByText(/you're offline/i)).toBeVisible();

    await page.context().setOffline(false);
  });

  test('page content remains visible while offline', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toHaveText(/this week|no list/i);

    await page.context().setOffline(true);
    await page.evaluate(() => window.dispatchEvent(new Event('offline')));

    // Core layout should still be present
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('nav')).toBeVisible();

    await page.context().setOffline(false);
  });
});
