# Grocery List App 🛒

A smart grocery list app that integrates with Notion to make weekly meal planning easier. The app automatically suggests recipes based on your preferences and generates grocery lists with staple items, learning from your choices over time.

## Features

- 📖 **Notion Integration**: Read recipes from your Notion database (Notion is the source of truth)
- 📝 **Weekly Grocery Lists**: Auto-generated lists with checkboxes for easy shopping
- ⭐ **Smart Suggestions**: Recipe suggestions every Sunday at 9 AM based on learned preferences
- 🧠 **Learning System**: Tracks what you accept vs reject to improve future suggestions
- 🥫 **Staple Items**: Always-included items (fruits, protein bars, etc.)
- 🧂 **Pantry Management**: Filter out items you always have on hand (salt, olive oil, etc.)
- 📱 **Mobile-First**: Responsive design that works great on phones and web
- 🔒 **Secure Auth**: Google Authentication with email whitelist
- 📡 **Offline Support**: Check off items at the store even without internet
- ⏰ **Configurable Schedule**: Set when weekly suggestions are generated

## Tech Stack

- **Frontend**: React 19 + Vite + Tailwind CSS 4
- **Backend**: Python serverless functions on Vercel
- **Database**: Supabase (PostgreSQL)
- **Caching/Notifications**: Upstash Redis
- **Recipes Source**: Notion API (read-only integration)
- **Hosting**: Vercel
- **Auth**: Supabase Auth with Google OAuth

## Project Structure

```
grocery-app/
├── api/                          # Python serverless functions (Vercel)
│   ├── _utils/
│   │   ├── __init__.py
│   │   ├── db.py                 # Supabase + Redis clients
│   │   └── notion.py             # Notion API integration
│   ├── cron/
│   │   ├── analyze-week.py       # Sunday 8 AM - learns from previous week
│   │   └── generate-weekly.py    # Sunday 9 AM - creates suggestions
│   ├── notifications.py          # Push notification management
│   ├── pantry.py                 # Manage pantry items
│   ├── recipes.py                # Fetch recipes from Notion
│   ├── settings.py               # User settings and schedule config
│   ├── staples.py                # Manage staple items
│   └── weekly.py                 # Weekly list management
├── client/                       # React frontend
│   ├── src/
│   │   ├── components/           # Reusable UI components
│   │   ├── hooks/                # Custom React hooks
│   │   ├── pages/                # Main app pages
│   │   └── services/             # API clients and offline storage
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   └── tailwind.config.js
├── supabase/
│   └── schema.sql                # Database schema with seed data
├── vercel.json                   # Vercel config with cron jobs
├── requirements.txt              # Python dependencies
└── .env.example                  # Environment variables template
```

## Prerequisites

Before you begin, ensure you have:

- Node.js 18+ and npm
- Python 3.9+
- A [Vercel](https://vercel.com) account
- A [Supabase](https://supabase.com) account
- An [Upstash](https://upstash.com) account (free tier works)
- A [Notion](https://www.notion.so) account with a recipes database

## Setup Instructions

### 1. Notion Setup

1. Create a new Notion integration at https://www.notion.so/my-integrations
2. Copy the "Internal Integration Token" (this is your `NOTION_API_KEY`)
3. Create a database in Notion for your recipes with at least these properties:
   - Title (default title property)
   - Ingredients (multi-line text or rich text)
   - Any other properties you want (tags, prep time, etc.)
4. Share your recipes database with your integration
5. Get the database ID from the URL: `https://notion.so/[workspace]/[DATABASE_ID]?v=...`

### 2. Supabase Setup

1. Create a new project at https://supabase.com
2. Go to Project Settings > API to get:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY` (called "anon public" in the dashboard)
   - `SUPABASE_SERVICE_KEY` (called "service_role" - keep this secret!)
3. Go to SQL Editor and run the schema from `supabase/schema.sql`
4. Configure Google OAuth:
   - Go to Authentication > Providers
   - Enable Google
   - Add your Google OAuth credentials
   - Set the redirect URL to: `https://[your-domain]/auth/callback`

### 3. Upstash Redis Setup

1. Create a Redis database at https://console.upstash.com
2. Copy the REST URL and token:
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`

### 4. Local Development

1. Clone the repository:
```bash
git clone https://github.com/gschultz49/grocery-app.git
cd grocery-app
```

2. Set up environment variables:
```bash
# Backend environment variables
cp .env.example .env
# Edit .env with your actual credentials

# Frontend environment variables
cd client
cp .env.example .env
# Edit .env with your Supabase URL and anon key
cd ..
```

3. Install frontend dependencies:
```bash
cd client
npm install
cd ..
```

4. Install Python dependencies:
```bash
pip install -r requirements.txt
```

5. Run the frontend dev server:
```bash
cd client
npm run dev
```

6. For local API testing, you can use Vercel CLI:
```bash
npm install -g vercel
vercel dev
```

### 5. Deploy to Vercel

1. Install Vercel CLI (if not already installed):
```bash
npm install -g vercel
```

2. Deploy:
```bash
vercel
```

3. Add environment variables in Vercel dashboard:
   - Go to Project Settings > Environment Variables
   - Add all variables from `.env.example`

4. The cron jobs will automatically run:
   - **Sunday 8 AM**: Analyzes previous week's data
   - **Sunday 9 AM**: Generates new weekly suggestions

## Environment Variables

### Backend (.env at root)

Create a `.env` file based on `.env.example`:

```bash
# Notion API
NOTION_API_KEY=your_notion_api_key
NOTION_RECIPES_DATABASE_ID=your_recipes_database_id

# Supabase
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_anon_key

# Upstash Redis
UPSTASH_REDIS_REST_URL=your_upstash_url
UPSTASH_REDIS_REST_TOKEN=your_upstash_token

# Auth (comma-separated list)
ALLOWED_EMAILS=user1@gmail.com,user2@gmail.com

# Cron Security (generate a random string)
CRON_SECRET=your_random_secret_string
```

### Frontend (client/.env)

Create a `client/.env` file based on `client/.env.example`:

```bash
# Supabase Configuration (for frontend)
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Database Schema

The app uses Supabase PostgreSQL with the following key tables:

- `staples` - Items always on your grocery list
- `pantry_items` - Items always on hand (filtered from recipes)
- `favorite_recipes` - Notion recipe references and preferences
- `weekly_lists` - Main grocery list per week
- `weekly_list_items` - Individual items with checked status
- `weekly_recipes` - Recipe suggestions per week
- `recipe_scores` - Learning algorithm data
- `item_patterns` - Purchase pattern tracking
- `weekly_learnings` - Weekly analysis results
- `user_settings` - User preferences and schedule

See `supabase/schema.sql` for the complete schema.

## API Endpoints

### Recipes
- `GET /api/recipes` - List all recipes from Notion
- `POST /api/recipes` - Mark a recipe as favorite

### Weekly Lists
- `GET /api/weekly` - Get current week's list
- `GET /api/weekly?week=YYYY-MM-DD` - Get specific week
- `POST /api/weekly` - Accept/reject recipes
- `PUT /api/weekly` - Update item (check/uncheck)

### Staples
- `GET /api/staples` - List all staple items
- `POST /api/staples` - Add a staple item
- `PUT /api/staples` - Update a staple item
- `DELETE /api/staples` - Delete a staple item

### Pantry
- `GET /api/pantry` - List all pantry items
- `POST /api/pantry` - Add a pantry item
- `PUT /api/pantry` - Update a pantry item
- `DELETE /api/pantry` - Delete a pantry item

### Settings
- `GET /api/settings` - Get user settings
- `POST /api/settings` - Update user settings

### Notifications
- `GET /api/notifications` - Get notification settings
- `POST /api/notifications` - Update notification preferences

## How It Works

### Weekly Workflow

1. **Sunday 8 AM** (Cron: `analyze-week.py`)
   - Analyzes last week's grocery list
   - Tracks which recipes were accepted vs rejected
   - Tracks which items were purchased (checked) vs skipped
   - Updates preference scores for better future suggestions

2. **Sunday 9 AM** (Cron: `generate-weekly.py`)
   - Creates a new weekly grocery list
   - Adds all active staples automatically
   - Selects 2-3 recipe suggestions based on:
     - Learned preferences (acceptance rate)
     - Recency (avoid repeating recent recipes)
     - Favorites (explicit user favorites)
     - Randomness (for variety)
   - Checks pantry items for restocking needs
   - Sends push notification with suggestions

3. **User Review**
   - User reviews suggested recipes
   - Accepts recipes → ingredients added to list (pantry items filtered out)
   - Rejects recipes → not added to list
   - Activates the list when ready

4. **Shopping**
   - Offline support via IndexedDB
   - Check off items as you shop
   - Syncs when back online

### Learning Algorithm

The app learns from your behavior:

- **Recipe Scoring**: Tracks acceptance rate, recency, and explicit favorites
- **Item Patterns**: Learns which ingredients you tend to buy vs skip
- **Adaptive Suggestions**: Future recipes are weighted by learned preferences

## Development

### Run Frontend Dev Server
```bash
cd client
npm run dev
```

### Run Frontend Linter
```bash
cd client
npm run lint
```

### Build Frontend
```bash
cd client
npm run build
```

### Test Python Functions Locally
```bash
vercel dev
```

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Commit your changes: `git commit -am 'Add my feature'`
4. Push to the branch: `git push origin feature/my-feature`
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Acknowledgments

- Built with ❤️ for easier meal planning
- Notion API for recipe management
- Supabase for backend infrastructure
- Vercel for serverless hosting
