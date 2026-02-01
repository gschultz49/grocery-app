# Architecture

**Analysis Date:** 2026-02-01

## Pattern Overview

**Overall:** Distributed two-tier architecture with event-driven scheduling

**Key Characteristics:**
- Frontend React SPA with offline-first capabilities
- Stateless serverless backend on Vercel for HTTP endpoints and scheduled cron jobs
- Supabase PostgreSQL as source of truth with Upstash Redis for notifications/caching
- Notion as external recipe database (read-only API integration)
- Weekly generation triggered by scheduled cron jobs (Sunday 8 AM and 9 AM)

## Layers

**Presentation Layer:**
- Purpose: Mobile-first web UI with Tailwind CSS styling
- Location: `client/src/pages/`, `client/src/components/`
- Contains: React page components (Weekly, Recipes, Settings, Login) and reusable UI components (GroceryItem, RecipeCard, Navigation)
- Depends on: React Router for navigation, Supabase Auth for authentication, services layer for API calls
- Used by: End users via web browser

**Services/API Layer:**
- Purpose: Client-side API abstraction and offline storage management
- Location: `client/src/services/` (api.js, supabase.js, offlineStorage.js)
- Contains: API client functions (weeklyApi, recipesApi, staplesApi, pantryApi, settingsApi, notificationsApi), Supabase client initialization, IndexedDB offline storage
- Depends on: @supabase/supabase-js, native browser APIs (IndexedDB, fetch)
- Used by: Components and hooks

**Hooks/State Management:**
- Purpose: Data fetching and client-side state management with offline support
- Location: `client/src/hooks/`
- Contains: useAuth (authentication state and email whitelist validation), useOffline (online/offline detection and sync), useWeeklyList (weekly list data fetching with offline caching)
- Depends on: Services layer, React hooks
- Used by: Page components

**Backend HTTP Endpoints:**
- Purpose: RESTful API endpoints for CRUD operations on grocery lists, recipes, staples, pantry items, settings, and notifications
- Location: `api/*.py` (recipes.py, weekly.py, staples.py, pantry.py, settings.py, notifications.py)
- Contains: HTTP request handlers for GET, POST, PUT, DELETE operations
- Depends on: _utils layer for database and third-party API access
- Used by: Frontend via fetch requests

**Scheduled Jobs/Cron Layer:**
- Purpose: Automated weekly tasks triggered on schedule
- Location: `api/cron/`
- Contains: analyze-week.py (Sunday 8 AM) for learning analysis, generate-weekly.py (Sunday 9 AM) for list generation and notifications
- Depends on: _utils layer, core API logic
- Used by: Vercel scheduler via HTTP GET requests

**Utilities/Infrastructure Layer:**
- Purpose: Shared database clients, Notion API integration, Redis caching
- Location: `api/_utils/`
- Contains: db.py (Supabase and Redis clients), notion.py (Notion API integration and recipe parsing)
- Depends on: supabase-py, notion-client, upstash-redis Python libraries
- Used by: All backend endpoints and cron jobs

**Data Storage Layer:**
- Purpose: Persistent storage and caching
- Location: Supabase PostgreSQL for relational data, Upstash Redis for notifications/caching, IndexedDB (client-side) for offline checkpoint
- Contains: Tables for staples, pantry_items, favorite_recipes, weekly_lists, weekly_list_items, weekly_recipes, recipe_scores, item_patterns, weekly_learnings, user_settings
- Depends on: Nothing (final layer)
- Used by: All API endpoints and client-side offline storage

## Data Flow

**Weekly List Generation Workflow:**

1. **Sunday 8 AM (analyze-week.py):** Analyze previous week's data
   - Fetch last week's weekly_recipes and their acceptance status
   - Calculate acceptance rates for recipes
   - Update recipe_scores table with learned preferences
   - Fetch weekly_list_items and check status
   - Update item_patterns table
   - Store weekly_learnings record

2. **Sunday 9 AM (generate-weekly.py):** Create new weekly list
   - Check if weekly_lists entry exists for current week (create if not)
   - Fetch all active staples, insert into weekly_list_items
   - Fetch pantry_items with needs_restock=true, insert into weekly_list_items
   - Fetch all recipes from Notion
   - Score recipes using recipe_scores (learned preferences) + favorite_recipes (explicit favorites) + randomness
   - Select top 3 recipes, insert into weekly_recipes with status='suggested'
   - Send push notification via Redis
   - Log cron execution to Redis

3. **User Reviews and Activates List (Weekly.jsx):**
   - View suggested recipes (status='suggested')
   - Accept recipe: weekly.py POST action='accept_recipe'
     - Update weekly_recipes status to 'accepted'
     - Fetch full recipe from Notion via get_recipe_details()
     - Get pantry_items for filtering
     - Extract ingredients, filter out pantry items, insert into weekly_list_items
   - Reject recipe: weekly.py POST action='reject_recipe'
     - Update weekly_recipes status to 'rejected'
   - Activate list: weekly.py POST action='activate'
     - Update weekly_lists status to 'active'
     - List is now ready for shopping

4. **Shopping Offline:**
   - User toggles items (GroceryItem.jsx checkbox)
   - useWeeklyList.toggleItem() called
   - Item state saved to IndexedDB immediately (optimistic update)
   - If offline: queued in pendingChanges store
   - If online: sent to weekly.py PUT endpoint
   - When back online: syncPendingChanges() processes queue

**Authentication Flow:**

1. User navigates to /login (Login.jsx)
2. AuthProvider initializes, checks session via supabase.auth.getSession()
3. User clicks Google OAuth button
4. Supabase redirects to Google, returns to /auth/callback
5. useAuth hook checks email against ALLOWED_EMAILS whitelist
6. If allowed: setUser, navigate to /
7. If denied: signOut, show error, remain on login

**Recipes Management Flow:**

1. GET /api/recipes: recipes.py do_GET
   - Check Redis cache for recipes_list (10 min TTL)
   - If cached: return cached data
   - If not cached: call get_recipes_from_notion()
     - Pagination through Notion database
     - Parse each page with parse_recipe_page()
     - Extract name, ingredients, category
   - Cache result for 10 minutes
   - Return recipes array

2. POST /api/recipes: recipes.py do_POST
   - Mark recipe as favorite in favorite_recipes table
   - Used by recipesApi.toggleFavorite() in Recipes.jsx

## State Management

**Server-side state:**
- Weekly lists, items, recipes stored in Supabase (source of truth)
- Learning data (recipe_scores, item_patterns, weekly_learnings) accumulated over time
- Staples and pantry items managed as user preferences

**Client-side state:**
- Authentication state held in AuthContext (useAuth hook)
- Weekly list data fetched on demand, cached in IndexedDB
- Item checkbox states stored in IndexedDB itemStates store
- Pending changes queued in IndexedDB pendingChanges store
- Online/offline state tracked in useOffline hook
- Component local state for UI (active tabs, loading states)

**Offline synchronization:**
- IndexedDB maintains local cache of weekly list
- Checkbox changes written to itemStates immediately (optimistic)
- When offline: queued as pendingChanges
- When online: syncPendingChanges() replays queue via weeklyApi.toggleItem()
- Failed syncs remain queued for retry

## Key Abstractions

**Weekly List Model:**
- Purpose: Represents a user's grocery list for one week
- Examples: `api/weekly.py`, `client/src/pages/Weekly.jsx`, Supabase weekly_lists table
- Pattern: State machine (draft → active → completed), supports recipe acceptance before activation

**Recipe Scoring Algorithm:**
- Purpose: Determine which recipes to suggest based on user preferences
- Examples: `api/cron/generate-weekly.py` select_recipes() function
- Pattern: Multi-factor scoring combining learned acceptance_rate, explicit favorites, recency filtering, and randomness

**Offline-First Data Sync:**
- Purpose: Enable app functionality without connectivity, replay changes when online
- Examples: `client/src/services/offlineStorage.js`, `client/src/hooks/useOffline.js`
- Pattern: Optimistic updates + queue-based replay, IndexedDB as local persistence

**Pantry Filtering:**
- Purpose: Remove common household items from recipe ingredient lists
- Examples: `api/weekly.py` accept_recipe logic, pantry_items table
- Pattern: Case-insensitive substring matching of ingredient names against pantry item names

## Entry Points

**Frontend Entry Point:**
- Location: `client/src/main.jsx`
- Triggers: Browser navigation to Vercel deployed domain
- Responsibilities: Mount React root, render App component

**App Root Component:**
- Location: `client/src/App.jsx`
- Triggers: Loaded by main.jsx
- Responsibilities: Set up BrowserRouter, AuthProvider, define route structure, protect non-login routes

**Login Page Entry:**
- Location: `client/src/pages/Login.jsx`
- Triggers: Navigation to /login or unauthenticated access
- Responsibilities: Display login UI, trigger Supabase Google OAuth

**Weekly List Page:**
- Location: `client/src/pages/Weekly.jsx`
- Triggers: Navigation to / (authenticated)
- Responsibilities: Fetch and display weekly list, handle recipe acceptance/rejection, show offline status, coordinate shopping list management

**API Endpoints Entry Points:**
- Location: `api/*.py` handler class methods (do_GET, do_POST, do_PUT, do_DELETE)
- Triggers: HTTP requests from frontend or Vercel routing
- Responsibilities: Parse request, validate input, delegate to business logic, return JSON response

**Cron Job Entry Points:**
- Location: `api/cron/analyze-week.py` and `api/cron/generate-weekly.py` handler.do_GET()
- Triggers: Vercel scheduler (Sunday 8 AM UTC and 9 AM UTC per vercel.json)
- Responsibilities: Authenticate via CRON_SECRET header, execute generation logic, return status

## Error Handling

**Strategy:** Graceful degradation with user-facing error messages

**Patterns:**
- **API errors:** Frontend catches fetch exceptions, displays error banner, provides "Try Again" button with refetch
- **Offline errors:** useWeeklyList falls back to cached data from IndexedDB
- **Sync failures:** Failed changes remain in pendingChanges queue for retry when online
- **Notion API failures:** generate-weekly.py wraps get_recipes_from_notion() in try-catch, logs error, continues without recipes
- **Cache errors:** db.py exception handling silently returns None for cache misses
- **Auth errors:** AuthProvider catches email whitelist failures, signs out user, displays denial message

## Cross-Cutting Concerns

**Logging:**
- Backend: Python print statements logged to Vercel function logs
- Cron: Generate-weekly logs job result to Redis cron_logs list (last 100 entries)
- Frontend: Console.error for exceptions, browser DevTools

**Validation:**
- API endpoints check for required fields (notion_page_id, name, action) before processing
- Client-side email whitelist validation in useAuth hook
- Cron-secret header validation in cron job handlers

**Authentication:**
- Supabase Auth with Google OAuth provider
- Email whitelist enforced in useAuth hook (ALLOWED_EMAILS env var)
- Cron jobs protected by CRON_SECRET header (Bearer token)

**Caching:**
- Redis for recipes list (600s TTL)
- IndexedDB for weekly list cache (indefinite, synced on fetch)
- Browser cache for static assets (Vite production build)

**CORS:**
- All API endpoints set "Access-Control-Allow-Origin: *"
- Handle OPTIONS preflight requests

---

*Architecture analysis: 2026-02-01*
