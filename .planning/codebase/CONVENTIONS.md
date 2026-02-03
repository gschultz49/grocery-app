# Coding Conventions

**Analysis Date:** 2026-02-01

## Naming Patterns

**Files:**
- React components: PascalCase (e.g., `GroceryItem.jsx`, `RecipeCard.jsx`, `Navigation.jsx`)
- Services: camelCase (e.g., `api.js`, `supabase.js`, `offlineStorage.js`)
- Hooks: camelCase starting with `use` (e.g., `useAuth.js`, `useOffline.js`)
- Python files: snake_case (e.g., `db.py`, `notion.py`, `recipes.py`)
- API handlers: lowercase (e.g., `handler` class in `recipes.py`)

**Functions:**
- JavaScript: camelCase (e.g., `handleToggle`, `fetchApi`, `cacheWeeklyList`)
- Python: snake_case (e.g., `get_supabase()`, `parse_recipe_page()`, `get_week_start()`)
- React event handlers: `handle*` prefix (e.g., `handleAccept`, `handleReject`, `handleToggle`)
- Utility functions: descriptive camelCase (e.g., `isEmailAllowed`, `initOfflineDB`)

**Variables:**
- Constants: UPPER_SNAKE_CASE (e.g., `DB_NAME`, `API_BASE`, `ALLOWED_EMAILS`)
- Regular variables: camelCase (e.g., `isLoading`, `isOnline`, `weekStart`)
- State variables from `useState`: camelCase (e.g., `user`, `loading`, `error`)
- Boolean variables: `is*` or `has*` prefix (e.g., `isChecked`, `isLoading`, `hasMore`)

**Types:**
- TypeScript not used in client code
- Python type hints used in utility functions (e.g., `def get_supabase() -> Client:`)

## Code Style

**Formatting:**
- ESLint config: `client/eslint.config.js` (flat config format)
- Tailwind CSS for styling (no separate CSS files except imports in `index.css`)
- Indentation: 2 spaces (implicit from code examples)
- No Prettier config detected, formatting done by ESLint

**Linting:**
- Tool: ESLint 9.39.1
- Config file: `client/eslint.config.js`
- Key rules:
  - `no-unused-vars`: Error with pattern `^[A-Z_]` (allows uppercase/underscore prefixed unused vars)
  - React hooks recommended rules enabled
  - React refresh plugin enabled
- Run: `npm run lint` in `/home/claude/grocery-app/client/`

**Python code style:**
- No linter/formatter configured (no flake8, black, or pylint config found)
- Uses docstrings for module-level documentation (e.g., `recipes.py` has module docstring)
- Inline comments for complex logic (e.g., in `notion.py` for property extraction)

## Import Organization

**JavaScript order:**
1. React and React-related imports (`react`, `react-dom`, `react-router-dom`)
2. External libraries (`@supabase/supabase-js`)
3. Internal services and utilities (`../services/`, `../hooks/`, `../components/`)
4. No blank lines within groups typically

Example from `App.jsx`:
```javascript
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import Login from './pages/Login';
import Weekly from './pages/Weekly';
import Recipes from './pages/Recipes';
import Settings from './pages/Settings';
import Navigation from './components/Navigation';
```

**Python order:**
1. Standard library (`os`, `json`, `sys`, `datetime`)
2. Third-party libraries (`supabase`, `notion_client`, `upstash_redis`)
3. Internal imports (relative imports with `sys.path` manipulation for Vercel functions)

Example from `weekly.py`:
```python
import json
from http.server import BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
from datetime import datetime, timedelta
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from api._utils.db import get_supabase
```

**Path Aliases:**
- No path aliases configured (no `jsconfig.json` or TypeScript paths)
- Relative imports used throughout (e.g., `../services/`, `../hooks/`)

## Error Handling

**Patterns in JavaScript:**
- Try-catch blocks in async functions (e.g., `handleToggle` in `GroceryItem.jsx`)
- Console.error for logging failures (e.g., `console.error('Failed to toggle item:', error)`)
- Silent failure with catch-and-continue pattern (e.g., `settingsApi.getSchedule()` returns default on error)
- User alerts for critical operations (e.g., "You need to be online to accept recipes")

Example from `GroceryItem.jsx`:
```javascript
const handleToggle = async () => {
  setIsLoading(true);
  try {
    await onToggle(item.id, !isChecked);
    setIsChecked(!isChecked);
  } catch (error) {
    console.error('Failed to toggle item:', error);
  } finally {
    setIsLoading(false);
  }
};
```

**Patterns in Python:**
- Generic exception handling with broad `except Exception:` blocks (common in serverless handlers)
- Private helper methods for error response (e.g., `_send_error(code, message)`)
- Error details returned in JSON response: `{"error": message}`
- No logging configured (errors caught but not logged anywhere)

Example from `recipes.py`:
```python
try:
    # operation
except Exception as e:
    self._send_error(500, str(e))
```

## Logging

**Framework:** No logging framework configured

**Patterns:**
- Browser console: `console.error()` for errors, `console.warn()` for warnings
- Python: No logging module used; errors are caught and returned in JSON responses
- Debug info not exposed in production (no debug flags)

Example from `supabase.js`:
```javascript
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Missing Supabase credentials. Auth will not work.');
}
```

## Comments

**When to Comment:**
- Module-level docstrings for Python files explaining purpose and endpoints
- Inline comments for complex business logic (e.g., pantry filtering, recipe parsing)
- Comments for non-obvious algorithm decisions (e.g., in `generate-weekly.py` for recipe selection)
- Minimal comments for straightforward code

**JSDoc/TSDoc:**
- Not used (no JSDoc comments found in React code)
- Python uses docstrings: `"""docstring"""` format at function level (e.g., `get_supabase()`)

Example from `_utils/db.py`:
```python
def get_supabase() -> Client:
    """Get Supabase client."""
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_KEY")
    if not url or not key:
        raise ValueError("Missing Supabase credentials")
    return create_client(url, key)
```

## Function Design

**Size:**
- React components: 50-200 lines typical (e.g., `Weekly.jsx` is 200 lines, `GroceryItem.jsx` is 55 lines)
- Utility functions: 10-40 lines typical
- No explicit size guidelines observed

**Parameters:**
- Components: Props object pattern (destructured in function signature)
- API functions: Named parameters (e.g., `fetchApi(endpoint, options = {})`)
- Utility functions: Single responsibility with minimal parameters

Example from `RecipeCard.jsx`:
```javascript
export default function RecipeCard({ recipe, onAccept, onReject, showActions = true })
```

**Return Values:**
- React components: JSX elements
- API calls: Promises (async/await pattern used)
- Utility functions: Typed in Python (e.g., `-> Client:`), implicit in JavaScript

## Module Design

**Exports:**
- JavaScript: Default exports for components (e.g., `export default function GroceryItem`)
- JavaScript: Named exports for utilities and services (e.g., `export const weeklyApi = {...}`)
- Python: Functions exported implicitly (imported with `from module import function`)

Example from `api.js`:
```javascript
export const weeklyApi = {
  getCurrent: () => fetchApi('/weekly'),
  getByWeek: (weekStart) => fetchApi(`/weekly?week=${weekStart}`),
  // ...
};

export const recipesApi = {
  getAll: () => fetchApi('/recipes'),
  // ...
};
```

**Barrel Files:**
- Not used in client code
- API utilities exported individually from `_utils/db.py` and `_utils/notion.py`

## Service Layer Pattern

**API Service (`api.js`):**
- Centralized fetch wrapper: `fetchApi(endpoint, options)`
- Organized into namespaced objects: `weeklyApi`, `recipesApi`, `staplesApi`, `pantryApi`, `notificationsApi`, `settingsApi`
- Each namespace groups related endpoints
- Consistent error handling with JSON error messages
- Uses `Content-Type: application/json` header

**Offline Service (`offlineStorage.js`):**
- IndexedDB wrapper functions for localStorage
- Consistent promise-based API for all operations
- Organized by concern: `weeklyList`, `itemStates`, `pendingChanges` stores
- Export sync function: `syncPendingChanges(weeklyApi)`

**Python API Handlers:**
- Handler class pattern extending `BaseHTTPRequestHandler`
- Lowercase class name: `class handler(BaseHTTPRequestHandler):`
- Methods: `do_GET()`, `do_POST()`, `do_PUT()`, `do_OPTIONS()`
- Private helper methods: `_send_json()`, `_send_error()` for response formatting
- CORS headers added to all responses

---

*Convention analysis: 2026-02-01*
