# Testing Patterns

**Analysis Date:** 2026-02-01

## Test Framework

**Runner:**
- Not configured (no Jest, Vitest, or pytest setup found)
- No test files detected in codebase

**Assertion Library:**
- Not applicable - no testing framework installed

**Run Commands:**
```bash
# No test commands available
# ESLint linting available
npm run lint              # Run ESLint (client only)
```

## Test File Organization

**Location:**
- No test files found in `/home/claude/grocery-app/client/`
- No test files found in `/home/claude/grocery-app/api/`
- No `__tests__/` or `.test.js` / `.spec.js` files

**Naming:**
- Not applicable - tests not implemented

**Structure:**
- Not applicable - tests not implemented

## Test Structure

**Suite Organization:**
- No tests implemented
- Recommendation: Use Jest (already in React ecosystem) or Vitest (Vite-native)
- Recommended pattern would follow component/service organization

**Patterns:**
- No test patterns established

## Mocking

**Framework:**
- Not configured
- If implemented: Would likely use Jest mocks or Vitest mocking

**Common patterns to establish:**

For API mocking in tests:
```javascript
// Recommended pattern based on api.js structure
jest.mock('../services/api', () => ({
  weeklyApi: {
    getCurrent: jest.fn(),
    toggleItem: jest.fn(),
    acceptRecipe: jest.fn(),
  },
  // ... other API namespaces
}));
```

For Supabase mocking:
```javascript
// Recommended pattern based on useAuth.js
jest.mock('../services/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
      onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: jest.fn() } } })),
      signOut: jest.fn(),
    },
  },
  isEmailAllowed: jest.fn(),
}));
```

For Offline storage mocking:
```javascript
// Recommended pattern based on offlineStorage.js
jest.mock('../services/offlineStorage', () => ({
  initOfflineDB: jest.fn(),
  cacheWeeklyList: jest.fn(),
  getCachedWeeklyList: jest.fn(),
  saveItemState: jest.fn(),
  syncPendingChanges: jest.fn(),
}));
```

## Fixtures and Factories

**Test Data:**
- No fixtures defined
- Database seeding configured in `supabase/schema.sql` but only for development

**Recommended Factory Pattern for React:**
```javascript
// Would be placed in tests/factories/ or tests/fixtures/
export const createMockWeeklyList = (overrides = {}) => ({
  id: 'test-week-1',
  week_start: '2026-01-26',
  status: 'draft',
  items: [
    {
      id: '1',
      name: 'Apples',
      quantity: '2 lbs',
      source: 'staple',
      checked: false,
      category: 'Produce',
    },
  ],
  recipes: [
    {
      id: 'recipe-1',
      name: 'Pasta Carbonara',
      status: 'suggested',
      notion_page_id: 'notion-123',
    },
  ],
  ...overrides,
});

export const createMockGroceryItem = (overrides = {}) => ({
  id: 'item-1',
  name: 'Bread',
  quantity: '1 loaf',
  source: 'recipe',
  checked: false,
  category: 'Bakery',
  ...overrides,
});
```

**Location:**
- Recommended: `client/tests/factories/` or `client/tests/fixtures/`
- Not yet implemented

## Coverage

**Requirements:**
- None enforced
- No coverage configuration found (`coverage` scripts absent from `package.json`)

**View Coverage:**
- Command not available (would be `npm run test:coverage` if testing framework was set up)

## Test Types

**Unit Tests:**
- Not implemented
- Should test:
  - API client functions in `src/services/api.js`
  - Offline storage functions in `src/services/offlineStorage.js`
  - Utility functions like `isEmailAllowed()` in `src/services/supabase.js`
  - Python utilities in `api/_utils/db.py` and `api/_utils/notion.py`

**Integration Tests:**
- Not implemented
- Should test:
  - Auth flow: `AuthProvider` and `useAuth()` hook integration
  - Weekly list flow: fetching → accepting/rejecting recipes → checking items
  - Offline sync: pending changes queue → sync when online
  - API error handling edge cases

**E2E Tests:**
- Not implemented
- Recommendation: Use Playwright (mentioned in CLAUDE.md as "Pending")
- Should test:
  - Full user journey: login → view weekly list → accept recipe → check items → offline behavior
  - Mobile responsiveness on different device sizes
  - Cross-browser compatibility

## Common Patterns

**Async Testing:**
No async tests implemented, but codebase heavily uses async/await. Recommended pattern:

```javascript
describe('GroceryItem', () => {
  it('should toggle item and call onToggle with new state', async () => {
    const mockToggle = jest.fn().mockResolvedValue(undefined);
    const { getByRole } = render(
      <GroceryItem
        item={{ id: '1', name: 'Apples', checked: false, source: 'staple' }}
        onToggle={mockToggle}
      />
    );

    const checkbox = getByRole('checkbox');
    await userEvent.click(checkbox);

    await waitFor(() => {
      expect(mockToggle).toHaveBeenCalledWith('1', true);
    });
  });
});
```

**Error Testing:**
No error tests implemented. Components use try-catch with console.error. Recommended pattern:

```javascript
describe('GroceryItem error handling', () => {
  it('should handle toggle failure gracefully', async () => {
    const mockToggle = jest.fn().mockRejectedValue(new Error('Network error'));
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    const { getByRole } = render(
      <GroceryItem
        item={{ id: '1', name: 'Apples', checked: false, source: 'staple' }}
        onToggle={mockToggle}
      />
    );

    const checkbox = getByRole('checkbox');
    await userEvent.click(checkbox);

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to toggle item:',
        expect.any(Error)
      );
    });

    consoleSpy.mockRestore();
  });
});
```

**Python Endpoint Testing:**
No tests for Python API handlers. Recommended pattern using pytest:

```python
# tests/api/test_recipes.py
import json
from unittest.mock import Mock, patch
from api.recipes import handler

def test_recipes_get_returns_cached_recipes():
    # Create mock request
    mock_request = Mock()
    mock_request.path = '/api/recipes'

    # Mock cache
    with patch('api.recipes.cache_get') as mock_cache:
        mock_cache.return_value = json.dumps([
            {'id': '1', 'name': 'Pasta', 'ingredients': ['pasta', 'water']}
        ])

        h = handler(mock_request, ('127.0.0.1', 5000), None)
        # Assert response contains cached data

def test_recipes_post_marks_favorite():
    # Create mock request with JSON body
    # Assert database upsert called correctly
```

## Current Testing Status

**What's tested:**
- ESLint validation (client code style)
- Not implemented: Unit tests, integration tests, E2E tests

**What's NOT tested:**
- React components (`GroceryItem`, `RecipeCard`, pages, hooks)
- API services (`api.js`, `offlineStorage.js`)
- Python endpoints (all `api/*.py` files)
- Authentication flow
- Offline functionality
- Error scenarios

## Recommended Testing Setup

**Phase 1: Setup & Unit Tests**
1. Install Jest and React Testing Library:
   ```bash
   npm install --save-dev jest @testing-library/react @testing-library/jest-dom vitest
   ```

2. Create `jest.config.js` at `/home/claude/grocery-app/client/`

3. Add test scripts to `package.json`:
   ```json
   {
     "test": "jest --watch",
     "test:ci": "jest --ci --coverage",
     "test:coverage": "jest --coverage"
   }
   ```

4. Create initial test files for high-value areas:
   - `src/services/__tests__/api.test.js` - API client
   - `src/hooks/__tests__/useAuth.test.js` - Auth hook
   - `src/components/__tests__/GroceryItem.test.jsx` - Components

**Phase 2: Integration Tests**
1. Test full flows (auth → list → recipe acceptance)
2. Test offline behavior

**Phase 3: E2E Tests**
1. Install Playwright:
   ```bash
   npm install --save-dev @playwright/test
   ```

2. Create `playwright.config.js` and test scenarios

---

*Testing analysis: 2026-02-01*
