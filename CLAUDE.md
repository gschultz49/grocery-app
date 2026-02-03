# Grocery List App - Project Context

## Overview
A grocery list app that integrates with Notion to make weekly meal planning easier. The app automatically suggests recipes and generates grocery lists with staple items, learning from user preferences over time.

## User Requirements
- Read recipes from a Notion database (Notion is the source of truth)
- Weekly grocery list with checkboxes
- Staple items that are always included (fruits, Bare Bell protein bars, etc.)
- Pantry items that are filtered OUT from recipes (salt, olive oil - things always on hand)
- Every Sunday at 9 AM, send a notification with weekly suggestions
- Learning system that tracks what was suggested vs actually purchased
- Mobile-first design that works on web and iOS
- Offline support for checking off items at the grocery store
- Google Authentication with email whitelist (2 specific users only)
- Configurable schedule for when suggestions are generated

## Tech Stack
- **Frontend**: React + Vite + Tailwind CSS
- **Backend**: Python serverless functions on Vercel
- **Database**: Supabase (PostgreSQL)
- **Caching/Notifications**: Upstash (Redis)
- **Recipes Source**: Notion API (read-only integration)
- **Hosting**: Vercel
- **Auth**: Supabase Auth with Google OAuth

## Project Structure
```
grocery-app/
├── api/                          # Python serverless functions
│   ├── _utils/
│   │   ├── __init__.py
│   │   ├── db.py                 # Supabase + Redis clients
│   │   └── notion.py             # Notion API integration
│   ├── cron/
│   │   ├── analyze-week.py       # Sunday 8 AM - learns from previous week
│   │   └── generate-weekly.py    # Sunday 9 AM - creates suggestions
│   ├── dev_server.py             # Local development server wrapper
│   ├── notifications.py
│   ├── pantry.py
│   ├── recipes.py
│   ├── settings.py
│   ├── staples.py
│   └── weekly.py
├── client/                       # React frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── GroceryItem.jsx
│   │   │   ├── Navigation.jsx
│   │   │   └── RecipeCard.jsx
│   │   ├── hooks/
│   │   │   ├── useAuth.js
│   │   │   └── useOffline.js
│   │   ├── pages/
│   │   │   ├── Login.jsx
│   │   │   ├── Recipes.jsx
│   │   │   ├── Settings.jsx      # Includes Schedule tab
│   │   │   └── Weekly.jsx
│   │   ├── services/
│   │   │   ├── api.js
│   │   │   ├── offlineStorage.js # IndexedDB for offline support
│   │   │   └── supabase.js
│   │   ├── App.jsx
│   │   ├── App.css
│   │   ├── index.css             # Tailwind imports
│   │   └── main.jsx
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   └── vite.config.js
├── e2e/                          # Playwright E2E tests
│   ├── auth.spec.js
│   ├── weekly-list.spec.js
│   ├── recipes.spec.js
│   ├── settings.spec.js
│   ├── navigation.spec.js
│   └── offline.spec.js
├── docker/
│   └── nginx.conf                # Production nginx config
├── supabase/
│   └── schema.sql                # Full database schema with seed data
├── .github/workflows/
│   └── playwright.yml            # CI/CD for E2E tests
├── Dockerfile                    # Multi-stage: dev + prod
├── docker-compose.yml            # Local development orchestration
├── playwright.config.js          # E2E test configuration
├── vercel.json                   # Vercel config with cron jobs
├── requirements.txt              # Python dependencies
├── README.md                     # Main documentation
├── README-TESTING.md             # Testing guide
└── .env.example                  # Environment variables template
```

## Database Schema (Supabase)
Key tables:
- `staples` - Items always on grocery list (Bare Bell bars, fruits, etc.)
- `pantry_items` - Items always on hand, filtered from recipes (salt, oil)
- `favorite_recipes` - Tracks which Notion recipes are favorites
- `weekly_lists` - Main grocery list per week
- `weekly_list_items` - Individual items with checked status
- `weekly_recipes` - Recipe suggestions per week (suggested/accepted/rejected)
- `recipe_scores` - Learning: tracks acceptance rates per recipe
- `item_patterns` - Learning: tracks purchase patterns per item
- `weekly_learnings` - Learning: weekly analysis results
- `user_settings` - User preferences including suggestion schedule

## Cron Jobs (vercel.json)
1. **Sunday 8 AM** (`/api/cron/analyze-week`): Analyzes previous week's data
   - Which recipes were accepted vs rejected
   - Which items were purchased (checked) vs skipped
   - Updates preference scores for better future suggestions

2. **Sunday 9 AM** (`/api/cron/generate-weekly`): Generates new suggestions
   - Adds all active staples to the list
   - Selects 2-3 recipes based on learned preferences
   - Checks for pantry items needing restock
   - Sends push notification

## API Endpoints
- `GET/POST /api/recipes` - List recipes from Notion, mark favorites
- `GET/POST/PUT /api/weekly` - Weekly list management, accept/reject recipes
- `GET/POST/PUT/DELETE /api/staples` - Manage staple items
- `GET/POST/PUT/DELETE /api/pantry` - Manage pantry items
- `GET/POST /api/settings` - User settings (schedule configuration)
- `GET/POST /api/notifications` - Push notification management

## Key Features Implemented
- [x] Python/Vercel serverless backend
- [x] Supabase database with full schema
- [x] Notion API integration for recipes
- [x] Weekly list with checkboxes
- [x] Staples management
- [x] Pantry items (filtered from recipes)
- [x] Learning system (recipe scores, item patterns)
- [x] Cron jobs for weekly generation
- [x] Push notifications via Upstash Redis
- [x] Google OAuth authentication
- [x] Email whitelist for auth
- [x] Offline support with IndexedDB
- [x] Mobile-first React UI with Tailwind CSS
- [x] Schedule configuration in Settings
- [x] Docker support for local development
- [x] Playwright E2E testing framework
- [x] Comprehensive documentation (README.md)

## Pending Items
- [ ] PWA support (service worker, manifest.json)
- [ ] Fix Tailwind CSS production build config
- [ ] Full deployment and testing

## Environment Variables Needed
```
# Supabase
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_KEY=

# Notion
NOTION_API_KEY=
NOTION_RECIPES_DATABASE_ID=

# Upstash Redis
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# Auth
ALLOWED_EMAILS=email1@gmail.com,email2@gmail.com

# Cron security
CRON_SECRET=
```

## Setup Steps
1. Create Supabase project, run `supabase/schema.sql`
2. Set up Upstash Redis instance
3. Create Notion integration, share recipes database with it
4. Configure Google OAuth in Supabase Auth settings
5. Add all environment variables to Vercel
6. Deploy to Vercel

## Design Decisions
- **Notion as source of truth**: Recipes are always fetched from Notion, not cached in DB
- **Supabase only stores references**: `favorite_recipes` table stores Notion page IDs and user preferences, not recipe content
- **Offline-first for checkboxes**: IndexedDB stores checkbox states locally, syncs when online
- **Learning algorithm**: Combines acceptance rate, recency, and explicit favorites with randomness for recipe suggestions

## Development Patterns

### Vercel Handler Pattern
API endpoints use Vercel's `BaseHTTPRequestHandler` pattern:

```python
from http.server import BaseHTTPRequestHandler

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        # Handle GET request
        self._send_json({"data": "example"})

    def _send_json(self, data):
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(json.dumps(data).encode())
```

**Local Development**: `api/dev_server.py` wraps these handlers for local testing:
- Routes `/api/*` paths to appropriate handler modules
- Dynamically loads handler classes
- Provides `_send_json` and `_send_error` helper methods
- Runs on port 3001 (configurable via `API_PORT` env var)

### Frontend-Backend Communication

**Development**:
- Frontend: Vite dev server on port 5173
- Backend: Python dev server on port 3001
- Vite proxy config forwards `/api/*` to backend

```javascript
// vite.config.js
server: {
  proxy: {
    '/api': {
      target: process.env.VITE_API_URL || 'http://localhost:3001',
      changeOrigin: true,
    },
  },
}
```

**Production** (Vercel):
- Frontend static files served by Vercel CDN
- `/api/*` routes automatically mapped to serverless functions

### JSX in .js Files
Project uses `.js` extension for React hooks that contain JSX. Vite config handles this:

```javascript
// vite.config.js
optimizeDeps: {
  esbuildOptions: {
    loader: {
      '.js': 'jsx',  // Treat .js files as JSX during dependency optimization
    },
  },
}
```

### Docker Multi-Stage Build

**Development stage**:
- Includes both Node.js and Python
- Installs all dependencies
- Runs Vite dev server + API server concurrently
- Supports hot reload via volume mounts

**Production stage**:
- Frontend built with Vite
- Nginx serves static files
- Python API runs alongside
- Optimized for size and performance

```bash
# Development
docker compose up app-dev

# Production
docker compose --profile prod up app-prod
```

### E2E Testing Strategy

Playwright tests cover:
1. **Authentication flow** - Google OAuth, email whitelist
2. **Core features** - Weekly lists, recipes, settings
3. **Offline support** - IndexedDB sync
4. **Mobile responsiveness** - Multiple viewports
5. **Cross-browser** - Chrome, Firefox, Safari

**Test isolation**: Each test is independent and can run in parallel

**Auto-start server**: Playwright config automatically starts Vite dev server:
```javascript
webServer: {
  command: 'cd client && npm run dev',
  url: 'http://localhost:5173',
  reuseExistingServer: !process.env.CI,
}
```

## Known Issues

1. **Tailwind CSS Production Build**: Uses Tailwind 4 which requires `@tailwindcss/postcss` instead of direct PostCSS plugin. Development builds work fine.

2. **GitHub Actions OAuth Scope**: Workflows can't be committed via OAuth tokens without `workflow` scope. Must be added manually in repository.

3. **Python Output Buffering**: Use `flush=True` in print statements for Docker logs to appear immediately

## Branches
- **Main**: `claude/grocery-list-notion-app-e7zDL`
- **Docker Support**: `feature/docker-support` (PR #2)
- **Playwright Testing**: `feature/playwright-testing` (PR #3)

## Recent Commits
- `f99afcb` docs: Add comprehensive README with setup instructions
- `d7bce5a` feat: Add Playwright E2E testing framework
- `a69f7ef` fix: Resolve Docker dev server routing and Vite JSX handling
- `35ba07a` feat: Add Docker support for local development and production
- `efd7575` feat: Initial grocery list app with Notion integration

## Local Development Workflow

1. **With Docker** (recommended):
   ```bash
   cp .env.example .env
   # Edit .env with credentials
   docker compose up app-dev
   ```

2. **Manual**:
   ```bash
   # Terminal 1 - Backend
   python api/dev_server.py

   # Terminal 2 - Frontend
   cd client && npm run dev
   ```

3. **Run tests**:
   ```bash
   cd client
   npm run test:e2e
   ```
