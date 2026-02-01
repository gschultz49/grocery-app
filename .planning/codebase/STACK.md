# Technology Stack

**Analysis Date:** 2026-02-01

## Languages

**Primary:**
- JavaScript (React, Node.js ecosystem) - Frontend client application
- Python (3.x) - Backend serverless functions on Vercel
- SQL (PostgreSQL) - Database queries via Supabase

**Secondary:**
- CSS - Component styling (Tailwind CSS utility framework)
- HTML - Frontend markup via JSX

## Runtime

**Environment:**
- Node.js (via npm) - JavaScript runtime for client build and development
- Python - Serverless functions executed on Vercel Functions

**Package Manager:**
- npm - JavaScript dependency management
  - Lockfile: `package-lock.json` (present)
- pip - Python dependency management (via `requirements.txt`)

## Frameworks

**Core:**
- React 19.2.0 - Client UI framework (`client/src/`)
- Vite 7.2.4 - Frontend build tool and dev server (`client/vite.config.js`)
- React Router DOM 7.13.0 - Client-side routing (`client/src/`)

**Styling:**
- Tailwind CSS 4.1.18 - Utility-first CSS framework (`client/tailwind.config.js`)
- PostCSS 8.5.6 - CSS processing pipeline (`client/postcss.config.js`)
- Autoprefixer 10.4.23 - CSS vendor prefixing

**Testing/Linting:**
- ESLint 9.39.1 - JavaScript linting (`client/eslint.config.js`)
  - Plugins: `@eslint/js`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`
  - Config: `client/eslint.config.js` with recommended React rules

**Build/Dev:**
- @vitejs/plugin-react 5.1.1 - Vite React integration
- Vercel CLI/Functions - Serverless backend deployment

## Key Dependencies

**Critical:**
- @supabase/supabase-js 2.93.3 - JavaScript client for Supabase (auth, database)
  - Used in: `client/src/services/supabase.js`, `client/src/hooks/useAuth.js`
- supabase 2.4.0 - Python client for Supabase (database operations)
  - Used in: `api/_utils/db.py`, all API endpoints
- notion-client 2.2.1 - Official Notion API client
  - Used in: `api/_utils/notion.py` for fetching recipes
- upstash-redis 1.0.0 - Upstash Redis REST client
  - Used in: `api/_utils/db.py` for caching

**Infrastructure:**
- python-dotenv 1.0.1 - Environment variable loading for Python backend
  - Used in: Python API functions

**Frontend types/development:**
- @types/react 19.2.5 - TypeScript types for React
- @types/react-dom 19.2.3 - TypeScript types for React DOM
- globals 16.5.0 - Global variable definitions for ESLint

## Configuration

**Environment:**
- Variables configured in `.env.example`:
  - `NOTION_API_KEY` - Notion API authentication
  - `NOTION_RECIPES_DATABASE_ID` - Notion database containing recipes
  - `SUPABASE_URL` - Supabase project URL
  - `SUPABASE_KEY` - Supabase anonymous key
  - `UPSTASH_REDIS_REST_URL` - Upstash Redis endpoint
  - `UPSTASH_REDIS_REST_TOKEN` - Upstash Redis authentication

**Build:**
- `client/vite.config.js` - Vite build configuration with React plugin
- `client/tailwind.config.js` - Tailwind CSS content sources
- `client/postcss.config.js` - PostCSS plugins (Tailwind, Autoprefixer)
- `client/eslint.config.js` - ESLint rules for React/JSX
- `vercel.json` - Vercel deployment config with cron jobs and rewrites

## Platform Requirements

**Development:**
- Node.js 18+ (for npm and Vite)
- Python 3.7+ (for backend functions)
- Vercel account (for serverless deployment)
- Supabase project (PostgreSQL database)
- Notion integration (API key and recipes database)
- Upstash Redis instance

**Production:**
- Vercel Functions - Serverless Python backend hosting
- Supabase - PostgreSQL database
- Upstash Redis - Cache and notification management
- Notion API - Recipe source (read-only)

---

*Stack analysis: 2026-02-01*
