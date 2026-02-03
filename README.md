# Grocery List App

A smart grocery list app that integrates with Notion for meal planning and recipe management. The app automatically suggests recipes, generates grocery lists with staple items, and learns from your preferences over time.

## Architecture

### Frontend (React + Vite)
- **Location**: `client/`
- **Framework**: React 19 with Vite 7
- **Styling**: Tailwind CSS 4
- **Routing**: React Router 7
- **State**: React hooks + IndexedDB for offline support
- **Auth**: Supabase Auth with Google OAuth

The frontend is a mobile-first Progressive Web App that provides:
- Weekly grocery list with checkboxes
- Recipe browsing from Notion
- Settings for staples, pantry items, and notification schedule
- Offline support for checking off items at the store

### Backend (Python Serverless Functions)
- **Location**: `api/`
- **Runtime**: Python 3.12
- **Pattern**: Vercel-style serverless handlers (`BaseHTTPRequestHandler`)
- **Database**: Supabase (PostgreSQL)
- **Cache**: Upstash Redis
- **Recipes Source**: Notion API (read-only)

API endpoints:
- `/api/recipes` - Fetch recipes from Notion, manage favorites
- `/api/weekly` - Weekly list CRUD, accept/reject recipe suggestions
- `/api/staples` - Manage always-included items
- `/api/pantry` - Manage items to filter from recipes
- `/api/settings` - User preferences and notification schedule
- `/api/notifications` - Push notification management
- `/api/cron/analyze-week` - Weekly learning analysis (Sunday 8 AM)
- `/api/cron/generate-weekly` - Generate new suggestions (Sunday 9 AM)

### Database (Supabase PostgreSQL)
Key tables:
- `staples` - Always-included items (Bare Bell bars, fruits, etc.)
- `pantry_items` - Items always on hand (salt, oil, etc.)
- `favorite_recipes` - Notion recipe preferences
- `weekly_lists` - Main grocery lists by week
- `weekly_list_items` - Individual items with checked status
- `weekly_recipes` - Recipe suggestions (suggested/accepted/rejected)
- `recipe_scores` - ML: tracks acceptance rates
- `item_patterns` - ML: tracks purchase patterns
- `weekly_learnings` - ML: weekly analysis results

## Local Setup

### Prerequisites
- Node.js 22+
- Python 3.12+
- Docker (optional, for containerized development)

### Environment Variables

Copy `.env.example` to `.env` and fill in:

```bash
# Notion API
NOTION_API_KEY=secret_xxx
NOTION_RECIPES_DATABASE_ID=xxx

# Supabase
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_KEY=xxx
SUPABASE_SERVICE_KEY=xxx  # For backend

# Upstash Redis
UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=xxx

# Auth
ALLOWED_EMAILS=email1@gmail.com,email2@gmail.com

# Cron security (generate a random string)
CRON_SECRET=xxx
```

### Setup Steps

#### 1. Set Up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Run the schema:
   ```bash
   # Copy the SQL from supabase/schema.sql and run it in the Supabase SQL editor
   ```
3. Configure Google OAuth:
   - Go to Authentication → Providers → Google
   - Add your OAuth credentials
   - Add authorized redirect URLs

#### 2. Set Up Notion Integration

1. Create a Notion integration at [notion.so/my-integrations](https://www.notion.so/my-integrations)
2. Create a recipes database in Notion with properties:
   - Title (title)
   - Ingredients (multi-line text or rich text)
   - Instructions (multi-line text or rich text)
3. Share your database with the integration
4. Copy the database ID from the URL and integration secret to `.env`

#### 3. Set Up Upstash Redis

1. Create account at [upstash.com](https://upstash.com)
2. Create a new Redis database
3. Copy REST URL and token to `.env`

#### 4. Install Dependencies

**Frontend:**
```bash
cd client
npm install
```

**Backend:**
```bash
pip install -r requirements.txt
```

### Running Locally

#### Option 1: Docker (Recommended)

```bash
# Development mode (hot reload)
docker compose up app-dev

# Access:
# - Frontend: http://localhost:5173
# - API: http://localhost:3001
```

#### Option 2: Manual

**Terminal 1 - Frontend:**
```bash
cd client
npm run dev
# Runs on http://localhost:5173
```

**Terminal 2 - Backend:**
```bash
cd api
python dev_server.py
# Runs on http://localhost:3001
```

**Note**: The frontend is configured to proxy `/api/*` requests to `http://localhost:3001`

### How It Works

#### Weekly Flow

1. **Sunday 8 AM** - Analysis cron job runs:
   - Analyzes which recipes were accepted vs rejected
   - Tracks which items were purchased (checked off)
   - Updates ML scores in `recipe_scores` and `item_patterns`

2. **Sunday 9 AM** - Generation cron job runs:
   - Adds all active staples to new weekly list
   - Selects 2-3 recipes based on:
     - Historical acceptance rates
     - Favorites
     - Recency (avoid repeats)
     - Randomness for variety
   - Extracts ingredients from selected recipes
   - Filters out pantry items
   - Sends push notification with suggestions

3. **User Interaction**:
   - User views suggestions in app
   - Accepts/rejects recipes (updates `weekly_recipes`)
   - Checks off items at store (syncs via IndexedDB + Supabase)

#### Offline Support

The app uses IndexedDB to cache:
- Checkbox states for grocery items
- Pending sync operations

When online, changes sync automatically to Supabase.

#### Learning System

The app learns from:
- **Recipe acceptance rate**: How often each recipe is accepted vs rejected
- **Item purchase patterns**: Which items are consistently checked off
- **Explicit favorites**: Recipes marked as favorites in the UI

Scores are used to improve future suggestions.

## Project Structure

```
grocery-app/
├── api/                          # Python backend
│   ├── _utils/
│   │   ├── db.py                 # Supabase + Redis clients
│   │   └── notion.py             # Notion API wrapper
│   ├── cron/
│   │   ├── analyze-week.py       # ML analysis
│   │   └── generate-weekly.py    # Suggestion generation
│   ├── dev_server.py             # Local development server
│   ├── recipes.py                # Recipe endpoints
│   ├── weekly.py                 # Weekly list endpoints
│   ├── staples.py                # Staples management
│   ├── pantry.py                 # Pantry management
│   ├── settings.py               # User settings
│   └── notifications.py          # Push notifications
├── client/                       # React frontend
│   ├── src/
│   │   ├── components/           # React components
│   │   ├── hooks/                # Custom hooks
│   │   ├── pages/                # Page components
│   │   ├── services/             # API + offline services
│   │   └── main.jsx              # App entry point
│   └── package.json
├── e2e/                          # Playwright E2E tests
├── supabase/
│   └── schema.sql                # Database schema
├── docker/
│   └── nginx.conf                # Production nginx config
├── .github/workflows/            # CI/CD
├── Dockerfile                    # Multi-stage Docker build
├── docker-compose.yml            # Local development
├── playwright.config.js          # E2E test config
├── vercel.json                   # Vercel deployment config
└── requirements.txt              # Python dependencies
```

## Testing

### E2E Tests (Playwright)

```bash
cd client
npm install
npm run test:e2e          # Run all tests
npm run test:e2e:ui       # Interactive mode
```

See [README-TESTING.md](README-TESTING.md) for detailed testing guide.

## Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Connect repository to Vercel
3. Configure environment variables in Vercel dashboard
4. Deploy

Vercel automatically:
- Builds the frontend (`client/`)
- Sets up serverless functions from `api/`
- Configures cron jobs from `vercel.json`

### Docker (Self-hosted)

```bash
# Build production image
docker compose --profile prod build app-prod

# Run
docker compose --profile prod up app-prod

# Access at http://localhost:80
```

## Key Features

- ✅ Notion integration for recipes (source of truth)
- ✅ Weekly grocery lists with checkboxes
- ✅ Staple items (always included)
- ✅ Pantry filtering (items always on hand)
- ✅ Automated Sunday suggestions
- ✅ Machine learning from user behavior
- ✅ Mobile-first responsive design
- ✅ Offline support for grocery shopping
- ✅ Google OAuth with email whitelist
- ✅ Configurable notification schedule
- ✅ Docker support for local development

## Tech Stack

**Frontend:**
- React 19 + Vite 7
- Tailwind CSS 4
- React Router 7
- Supabase Auth
- IndexedDB for offline

**Backend:**
- Python 3.12
- Supabase (PostgreSQL)
- Upstash Redis
- Notion API

**Infrastructure:**
- Vercel (serverless)
- Docker (local dev)
- GitHub Actions (CI/CD)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests: `npm run test:e2e`
5. Submit a pull request

## License

MIT

## Support

For issues and questions, please open a GitHub issue.
