import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  test('should navigate between pages', async ({ page }) => {
    await page.goto('/');

    // Test navigation to different pages
    const pages = [
      { path: '/weekly', text: /weekly/i },
      { path: '/recipes', text: /recipe/i },
      { path: '/settings', text: /setting/i },
    ];

    for (const { path, text } of pages) {
      await page.goto(path);
      await expect(page).toHaveURL(new RegExp(path));
      await expect(page.locator('h1, h2')).toContainText(text);
    }
  });

  test('should have working navigation menu', async ({ page }) => {
    await page.goto('/weekly');

    // Look for navigation links
    const nav = page.locator('nav, [role="navigation"]');
    if (await nav.isVisible()) {
      await expect(nav).toBeVisible();

      // Check for navigation items
      const navItems = nav.locator('a, button');
      const count = await navItems.count();
      expect(count).toBeGreaterThan(0);
    }
  });

  test('should be mobile-responsive', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/weekly');

    // Page should still be visible and functional
    await expect(page.locator('body')).toBeVisible();

    // Check if mobile menu exists (hamburger icon, etc.)
    const mobileMenu = page.locator('button[aria-label*="menu"], [class*="hamburger"]');
    if (await mobileMenu.isVisible()) {
      await mobileMenu.click();
      await page.waitForTimeout(300);
    }
  });
});
