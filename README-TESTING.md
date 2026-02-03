# Testing Guide

## Playwright E2E Testing

This project uses [Playwright](https://playwright.dev/) for end-to-end testing.

### Running Tests

```bash
# Install dependencies
cd client && npm install

# Run all tests
npm run test:e2e

# Run tests in UI mode (interactive)
npm run test:e2e:ui

# Run tests in debug mode
npm run test:e2e:debug

# View last test report
npm run test:e2e:report
```

### Test Structure

Tests are located in the `e2e/` directory:

- `auth.spec.js` - Authentication and login tests
- `weekly-list.spec.js` - Weekly grocery list functionality
- `recipes.spec.js` - Recipe browsing and favoriting
- `settings.spec.js` - Settings management (staples, pantry, schedule)
- `navigation.spec.js` - Navigation and mobile responsiveness
- `offline.spec.js` - Offline functionality with IndexedDB

### Writing Tests

Playwright tests use a simple API:

```javascript
import { test, expect } from '@playwright/test';

test('should do something', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('h1')).toContainText('Hello');
});
```

### CI/CD

Tests run automatically on:
- Push to main branch
- Pull requests to main branch

GitHub Actions workflow: `.github/workflows/playwright.yml`

### Browser Coverage

Tests run on:
- Chromium (Desktop)
- Firefox (Desktop)
- WebKit/Safari (Desktop)
- Mobile Chrome (Pixel 5)
- Mobile Safari (iPhone 12)

### Authentication in Tests

For tests requiring authentication, you can:

1. Use Playwright's `storageState` to save/reuse auth sessions
2. Mock API responses for authentication
3. Set up test users with known credentials

Example:

```javascript
test.use({
  storageState: 'playwright/.auth/user.json',
});
```

### Configuration

Playwright config is in `playwright.config.js`. Key settings:

- **baseURL**: `http://localhost:5173` (Vite dev server)
- **webServer**: Automatically starts dev server before tests
- **retries**: 2 in CI, 0 locally
- **screenshots**: Captured on failure
- **traces**: Captured on first retry

### Debugging

```bash
# Open Playwright Inspector
npm run test:e2e:debug

# Generate trace viewer for failed test
npx playwright show-trace trace.zip
```

### Best Practices

1. Use `data-testid` attributes for stable selectors
2. Wait for network idle before assertions
3. Use `page.waitForLoadState()` when needed
4. Test critical user flows end-to-end
5. Keep tests independent and isolated
6. Use page object pattern for complex pages
