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
/home/user/demos/
├── api/                          # Python serverless functions
│   ├── _utils/
│   │   ├── __init__.py
│   │   ├── db.py                 # Supabase + Redis clients
│   │   └── notion.py             # Notion API integration
│   ├── cron/
│   │   ├── analyze-week.py       # Sunday 8 AM - learns from previous week
│   │   └── generate-weekly.py    # Sunday 9 AM - creates suggestions
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
├── supabase/
│   └── schema.sql                # Full database schema with seed data
├── vercel.json                   # Vercel config with cron jobs
├── requirements.txt              # Python dependencies
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

## Pending Items
- [ ] PWA support (service worker, manifest.json)
- [ ] Playwright end-to-end tests
- [ ] Full testing and deployment

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

## Branch
`claude/grocery-list-notion-app-e7zDL`

## Latest Commit
`efd7575 feat: Initial grocery list app with Notion integration`
