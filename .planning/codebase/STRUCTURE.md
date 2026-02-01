# Codebase Structure

**Analysis Date:** 2026-02-01

## Directory Layout

```
grocery-app/
├── api/                        # Python serverless backend functions
│   ├── _utils/                 # Shared utilities and client initialization
│   │   ├── __init__.py
│   │   ├── db.py              # Supabase and Redis client factories
│   │   └── notion.py           # Notion API client and recipe parsing
│   ├── cron/                   # Scheduled jobs (Vercel cron)
│   │   ├── analyze-week.py     # Sunday 8 AM: analyze previous week
│   │   └── generate-weekly.py  # Sunday 9 AM: generate new list
│   ├── recipes.py             # GET/POST recipes from Notion
│   ├── weekly.py              # GET/POST/PUT weekly list management
│   ├── staples.py             # GET/POST/PUT/DELETE staple items
│   ├── pantry.py              # GET/POST/PUT/DELETE pantry items
│   ├── settings.py            # GET/POST user settings (schedule, etc)
│   └── notifications.py       # GET/POST push notification management
├── client/                     # React frontend (Vite)
│   ├── src/
│   │   ├── pages/             # Full-page components (routes)
│   │   │   ├── Login.jsx      # Google OAuth login
│   │   │   ├── Weekly.jsx     # Main grocery list + recipes tab
│   │   │   ├── Recipes.jsx    # Browse/favorite recipes from Notion
│   │   │   └── Settings.jsx   # User settings (schedule, staples, pantry)
│   │   ├── components/        # Reusable UI components
│   │   │   ├── GroceryItem.jsx    # Single item with checkbox
│   │   │   ├── RecipeCard.jsx     # Recipe display with accept/reject
│   │   │   └── Navigation.jsx     # Bottom nav bar
│   │   ├── hooks/             # Custom React hooks
│   │   │   ├── useAuth.js     # Auth state + email whitelist check
│   │   │   └── useOffline.js  # Online detection + sync coordination
│   │   ├── services/          # API clients and storage
│   │   │   ├── api.js         # Fetch wrappers for all endpoints
│   │   │   ├── supabase.js    # Supabase client + helpers
│   │   │   └── offlineStorage.js  # IndexedDB operations
│   │   ├── assets/            # Images, icons, etc
│   │   ├── App.jsx            # Router setup and protected routes
│   │   ├── App.css            # (possibly empty, Tailwind used)
│   │   ├── index.css          # Tailwind imports
│   │   └── main.jsx           # React root mount
│   ├── public/                # Static assets
│   ├── package.json           # Dependencies: React, React Router, Supabase
│   ├── vite.config.js         # Vite build config
│   ├── postcss.config.js      # PostCSS for Tailwind
│   ├── tailwind.config.js     # Tailwind CSS configuration
│   ├── eslint.config.js       # ESLint rules
│   └── package-lock.json
├── supabase/
│   └── schema.sql            # PostgreSQL schema with all tables
├── .env.example              # Environment variables template
├── vercel.json               # Vercel deployment config + cron schedules
├── requirements.txt          # Python dependencies
├── CLAUDE.md                 # Project documentation
└── .planning/
    └── codebase/            # Generated architecture docs
        ├── ARCHITECTURE.md
        └── STRUCTURE.md
```

## Directory Purposes

**api/**
- Purpose: Vercel serverless function handlers (HTTP endpoints and cron jobs)
- Contains: Python request handlers using BaseHTTPRequestHandler pattern
- Key files: Weekly list, recipes, staples, pantry, settings endpoints plus cron jobs

**api/_utils/**
- Purpose: Shared infrastructure and external API clients
- Contains: Factory functions for Supabase and Redis clients, Notion API wrapper
- Key files: `api/_utils/db.py` (database access), `api/_utils/notion.py` (recipe fetching)

**api/cron/**
- Purpose: Scheduled background jobs
- Contains: analyze-week.py (learning), generate-weekly.py (generation + notification)
- Triggered: Vercel scheduler on Sunday 8 AM and 9 AM UTC

**client/src/pages/**
- Purpose: Route-level page components
- Contains: Login.jsx, Weekly.jsx, Recipes.jsx, Settings.jsx
- Key pattern: Each page is a full-screen view, routes defined in App.jsx

**client/src/components/**
- Purpose: Reusable UI components
- Contains: GroceryItem (checkbox item), RecipeCard (recipe display), Navigation (bottom tab bar)
- Key pattern: Stateless or minimal local state, accept data and callbacks as props

**client/src/hooks/**
- Purpose: Custom React hooks for data fetching and state management
- Contains: useAuth (authentication context), useOffline (online detection + sync), useWeeklyList (data fetching)
- Key pattern: Encapsulate logic, expose clean API to components

**client/src/services/**
- Purpose: API clients and storage abstraction
- Contains: api.js (fetch wrappers), supabase.js (client init), offlineStorage.js (IndexedDB)
- Key pattern: Functional modules exporting client objects and utility functions

**client/src/assets/**
- Purpose: Static images, SVG icons, other media
- Contains: App images and icons (currently may be empty)

**supabase/**
- Purpose: Database schema and migrations
- Contains: schema.sql with complete table definitions and seed data
- Key tables: staples, pantry_items, favorite_recipes, weekly_lists, weekly_list_items, weekly_recipes, recipe_scores, item_patterns, weekly_learnings, user_settings

**.env.example**
- Purpose: Template for required environment variables
- Contains: Supabase credentials, Notion API key, Upstash Redis credentials, auth settings, cron secret

**vercel.json**
- Purpose: Deployment and scheduling configuration
- Contains: Build command, output directory, API rewrites, cron job schedules
- Cron jobs: Analyze-week (Sunday 8 AM, schedule "0 8 * * 0"), Generate-weekly (Sunday 9 AM, schedule "0 9 * * 0")

**requirements.txt**
- Purpose: Python backend dependencies
- Contains: supabase-py, notion-client, upstash-redis

## Key File Locations

**Entry Points:**

- `client/src/main.jsx`: React root mount, renders App component
- `client/src/App.jsx`: Router setup, authentication wrapper, route definitions
- `client/src/pages/Weekly.jsx`: Main app page showing grocery list and recipes
- `client/src/pages/Login.jsx`: Authentication entry point
- `api/recipes.py`, `api/weekly.py`, `api/staples.py`, `api/pantry.py`, `api/settings.py`: HTTP endpoint handlers
- `api/cron/generate-weekly.py`: Sunday 9 AM scheduler
- `api/cron/analyze-week.py`: Sunday 8 AM scheduler

**Configuration:**

- `client/vite.config.js`: Build configuration (React plugin, base path)
- `client/tailwind.config.js`: Tailwind CSS theme
- `client/postcss.config.js`: PostCSS setup for Tailwind
- `vercel.json`: Deployment and cron schedules
- `supabase/schema.sql`: Database schema

**Core Logic:**

- `api/_utils/notion.py`: Notion API integration, recipe parsing
- `api/_utils/db.py`: Database and cache client initialization
- `api/weekly.py`: Weekly list CRUD and recipe acceptance logic
- `api/cron/generate-weekly.py`: Recipe selection algorithm and list generation
- `client/src/hooks/useWeeklyList.js`: Data fetching with offline fallback
- `client/src/services/offlineStorage.js`: IndexedDB persistence layer

**Testing:**

- No test files present (pending implementation)
- Location when added: `client/src/**/*.test.jsx` or `client/__tests__/`
- Backend tests would go in `api/__tests__/` or use pytest

**Styling:**

- `client/src/index.css`: Tailwind import and global styles
- `client/tailwind.config.js`: Tailwind theme customization
- No component-scoped CSS files; Tailwind utility classes used

## Naming Conventions

**Files:**

- **Components:** PascalCase, single file per component (GroceryItem.jsx, RecipeCard.jsx)
- **Pages:** PascalCase, match route names (Weekly.jsx, Recipes.jsx, Settings.jsx, Login.jsx)
- **Hooks:** camelCase with "use" prefix (useAuth.js, useOffline.js, useWeeklyList.js)
- **Services:** camelCase (api.js, supabase.js, offlineStorage.js)
- **Python API endpoints:** kebab-case or snake_case (recipes.py, weekly.py, analyze-week.py)
- **Utilities:** camelCase (notion.py, db.py)

**Directories:**

- **React structure:** features/pages/components/hooks/services (standard React organization)
- **API structure:** endpoints at root (api/), utilities in _utils/, scheduled jobs in cron/

**Functions:**

- **JavaScript:** camelCase (fetchApi, cacheWeeklyList, syncPendingChanges)
- **Python:** snake_case (get_supabase, get_recipes_from_notion, parse_recipe_page)
- **React components:** PascalCase (GroceryItem, WeeklyList)
- **React hooks:** camelCase with "use" prefix (useAuth, useOffline)

**Variables:**

- **JavaScript:** camelCase (weeklyListId, notionPageId, isPending)
- **Python:** snake_case (weekly_list_id, notion_page_id, is_pending)
- **Constants:** UPPER_SNAKE_CASE (DB_NAME, API_BASE, CRON_SECRET)
- **Environment variables:** UPPER_SNAKE_CASE (SUPABASE_URL, NOTION_API_KEY)

**Types/Interfaces:**

- **JavaScript:** PascalCase (api.js exports named objects: weeklyApi, recipesApi, staplesApi)
- **Database tables:** snake_case plural (weekly_lists, weekly_list_items, pantry_items, recipe_scores)
- **Database columns:** snake_case (week_start, is_favorite, needs_restock, notion_page_id)

## Where to Add New Code

**New Feature (e.g., user preferences for item quantity):**
- Primary code: `api/settings.py` (backend endpoint), `client/src/pages/Settings.jsx` (UI)
- Services: `client/src/services/api.js` (add settingsApi function if needed)
- Database: Modify `supabase/schema.sql`, update user_settings table
- Tests: `client/src/pages/__tests__/Settings.test.jsx` or `api/__tests__/settings_test.py`

**New Component (e.g., recipe search filter):**
- Implementation: `client/src/components/RecipeFilter.jsx`
- Usage: Import in `client/src/pages/Recipes.jsx`
- Tests: `client/src/components/__tests__/RecipeFilter.test.jsx`
- Styling: Use Tailwind utility classes in JSX, no separate CSS file

**New Endpoint (e.g., DELETE /api/weekly for list removal):**
- Handler: Add do_DELETE method to `api/weekly.py` handler class
- API client: Add function to weeklyApi object in `client/src/services/api.js`
- Database: Ensure supabase table has delete permissions
- Tests: Add test case in `api/__tests__/weekly_test.py`

**New Custom Hook (e.g., useRecipeFilters):**
- Implementation: `client/src/hooks/useRecipeFilters.js`
- Usage: Import in components or pages
- Pattern: Export hook function, manage state with useState, fetch data with useEffect
- Tests: `client/src/hooks/__tests__/useRecipeFilters.test.js`

**New Utility Service (e.g., date formatting):**
- JavaScript: `client/src/services/dateUtils.js` (export named functions)
- Python: `api/_utils/dates.py` (import via `from api._utils.dates import get_week_start`)
- Usage: Import where needed, avoid circular dependencies

**New Cron Job (e.g., daily digest email):**
- File: `api/cron/send-digest.py` following generate-weekly.py pattern
- Handler class: `handler(BaseHTTPRequestHandler)` with `do_GET` method
- Registration: Add to vercel.json crons array with schedule
- Authorization: Check CRON_SECRET header like generate-weekly.py

## Special Directories

**node_modules/ (client/node_modules/)**
- Purpose: NPM dependencies
- Generated: Yes (npm install)
- Committed: No (.gitignore)

**.git/**
- Purpose: Git repository metadata
- Generated: Yes (git init)
- Committed: N/A (version control)

**client/dist/**
- Purpose: Built frontend output
- Generated: Yes (npm run build)
- Committed: No (.gitignore, deployed to Vercel)

**client/.vite/**
- Purpose: Vite cache directory
- Generated: Yes (vite dev)
- Committed: No (.gitignore)

**.planning/codebase/**
- Purpose: Generated architecture and design documentation
- Generated: Yes (by GSD map-codebase)
- Committed: Yes (reference documentation)

**__pycache__/ (api/__pycache__/)**
- Purpose: Python bytecode cache
- Generated: Yes (Python runtime)
- Committed: No (.gitignore)

---

*Structure analysis: 2026-02-01*
