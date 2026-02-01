# External Integrations

**Analysis Date:** 2026-02-01

## APIs & External Services

**Notion:**
- Notion API - Fetch recipes from shared Notion database
  - SDK/Client: `notion-client` 2.2.1
  - Auth: `NOTION_API_KEY` (environment variable)
  - Implementation: `api/_utils/notion.py`
  - Endpoints used:
    - `databases.query()` - List all recipes from database
    - `pages.retrieve()` - Get full recipe details
    - `blocks.children.list()` - Fetch recipe content/blocks
  - Read-only integration - recipes cached locally

## Data Storage

**Databases:**
- Supabase (PostgreSQL)
  - Connection: `SUPABASE_URL`, `SUPABASE_KEY` (anonymous key for frontend)
  - Client: `@supabase/supabase-js` (frontend), `supabase` Python package (backend)
  - Implementation: `client/src/services/supabase.js`, `api/_utils/db.py`
  - Tables: `staples`, `pantry_items`, `favorite_recipes`, `weekly_lists`, `weekly_list_items`, `weekly_recipes`, `recipe_scores`, `item_patterns`, `weekly_learnings`, `user_settings`
  - Schema: `supabase/schema.sql`

**File Storage:**
- Not used - application stores data only in Supabase

**Caching:**
- Upstash Redis (REST-based)
  - Connection: `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`
  - Client: `upstash-redis` 1.0.0 Python package
  - Implementation: `api/_utils/db.py`
  - Usage:
    - Cache recipes list with 10-minute expiration (600 seconds)
    - Notification queue storage
    - Session/temporary data

**Offline Storage:**
- IndexedDB (browser-local)
  - Implementation: `client/src/services/offlineStorage.js`
  - Stores:
    - `weeklyList` - Cached weekly grocery list
    - `pendingChanges` - Pending item state changes for sync
    - `itemStates` - Local checkbox/checked states
  - Syncs automatically when connection restored

## Authentication & Identity

**Auth Provider:**
- Supabase Auth with Google OAuth
  - Provider: Google Sign-In
  - Implementation: `client/src/services/supabase.js`, `client/src/hooks/useAuth.js`
  - Email whitelist: 2 allowed emails hardcoded in `client/src/services/supabase.js`
    - `gjs86@cornell.edu`
    - `gschultz49@gmail.com`
  - Flow:
    1. User clicks Google sign-in button
    2. Redirects to Google OAuth consent
    3. Returns to `{origin}/auth/callback`
    4. Email validation against whitelist
    5. Unauthorized users signed out automatically

**Frontend Auth Flow:**
```javascript
// src/services/supabase.js
signInWithOAuth({ provider: 'google' })
getCurrentUser()
getSession()
signOut()
```

## Monitoring & Observability

**Error Tracking:**
- Not detected - No Sentry, Rollbar, or similar configured

**Logs:**
- Server: Python function logs via Vercel Functions
- Client: Browser console only (`console.error()` in error handlers)

## CI/CD & Deployment

**Hosting:**
- Vercel - Serverless platform for frontend and Python backend
  - Frontend build: `cd client && npm install && npm run build`
  - Output: `client/dist/`
  - Python backend: Vercel Functions (`/api/` directory)

**CI Pipeline:**
- Not detected - No GitHub Actions, CircleCI, or similar configured

**Deployment Config:**
- `vercel.json`:
  - Build command: `"cd client && npm install && npm run build"`
  - Output directory: `"client/dist"`
  - Rewrites: `/api/*` routes to Python functions
  - Cron jobs configured for Sunday:
    - 8 AM UTC: `GET /api/cron/analyze-week`
    - 9 AM UTC: `GET /api/cron/generate-weekly`

## Environment Configuration

**Required env vars (from `.env.example`):**
- `NOTION_API_KEY` - Notion API authentication
- `NOTION_RECIPES_DATABASE_ID` - Recipes database ID
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_KEY` - Supabase anon key
- `UPSTASH_REDIS_REST_URL` - Redis endpoint
- `UPSTASH_REDIS_REST_TOKEN` - Redis auth token

**Frontend env vars (prefixed with VITE_):**
- `VITE_SUPABASE_URL` - Passed to Vite build
- `VITE_SUPABASE_ANON_KEY` - Passed to Vite build
- Read in: `client/src/services/supabase.js` via `import.meta.env`

**Secrets location:**
- Vercel dashboard environment variables (for production)
- Local `.env` file for development (not committed)

## Webhooks & Callbacks

**Incoming:**
- OAuth callback: `{window.location.origin}/auth/callback`
  - Handled automatically by Supabase Auth
  - No manual webhook implementation needed

**Outgoing:**
- Not detected - No webhooks sent to external services
- Cron jobs are Vercel-managed, not external webhooks

## Data Flow Summary

**Recipe Management:**
1. Notion API provides recipes (read-only)
2. Backend fetches recipes via `notion-client`, caches in Redis
3. Frontend calls `/api/recipes` endpoint
4. Favorite recipes stored in Supabase `favorite_recipes` table
5. Weekly suggestions combine favorites + learning algorithm

**Weekly List Management:**
1. User accesses `/weekly` page
2. Frontend fetches current list from Supabase via `/api/weekly`
3. Cached to IndexedDB for offline access
4. User checks items locally (stored in IndexedDB)
5. When online, changes synced to Supabase
6. Pending changes queue in IndexedDB if offline

**Notifications:**
1. Cron job Sunday 9 AM: `POST /api/cron/generate-weekly`
2. Backend generates suggestions, stores in Supabase
3. Pushes notification metadata to Upstash Redis
4. Frontend polls or receives push notification

---

*Integration audit: 2026-02-01*
