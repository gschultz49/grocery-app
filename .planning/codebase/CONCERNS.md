# Codebase Concerns

**Analysis Date:** 2026-02-01

## Security Considerations

**Broad CORS Access:**
- Risk: All Python API endpoints return `Access-Control-Allow-Origin: *` which allows any domain to make requests
- Files: `api/weekly.py` (lines 165, 172), `api/recipes.py` (lines 70, 77), `api/staples.py`, `api/pantry.py`, `api/settings.py`, `api/notifications.py`
- Current mitigation: Email whitelist enforced at frontend auth level only
- Recommendations: Restrict CORS to specific origin (Vercel domain), validate auth tokens on API calls, remove wildcard CORS headers

**Missing Authentication on API Endpoints:**
- Risk: All backend endpoints accept requests without validating user identity or session tokens
- Files: `api/weekly.py`, `api/recipes.py`, `api/staples.py`, `api/pantry.py`, `api/notifications.py`, `api/settings.py`
- Current mitigation: Frontend enforces auth before calling APIs; email whitelist in Supabase
- Recommendations: Add Supabase auth token validation to every endpoint; check user.email against whitelist in backend

**Notion API Key in Environment:**
- Risk: Notion API key stored as plaintext env var; if leaked, grants access to recipes database
- Files: `api/_utils/notion.py` (line 6)
- Current mitigation: Vercel environment variable protection
- Recommendations: Consider using Notion API OAuth with scoped permissions; audit Notion integration access logs regularly

**Email Whitelist as String Parsing:**
- Risk: `.env.example` suggests email whitelist stored as environment variable, but no implementation visible
- Files: `CLAUDE.md` references `ALLOWED_EMAILS` variable; not found in codebase
- Current mitigation: Email check in `client/src/hooks/useAuth.js` (lines 16, 34) via `isEmailAllowed()`
- Recommendations: Implement backend validation of allowed emails; don't rely solely on frontend checks

**Cron Job Secret Validation Is Optional:**
- Risk: Cron endpoints check `CRON_SECRET` only if it exists; requests without auth header will succeed if env var is missing
- Files: `api/cron/generate-weekly.py` (lines 194-199), `api/cron/analyze-week.py` (lines 220-225)
- Impact: Anyone with knowledge of cron endpoint URLs can trigger them
- Fix approach: Make `CRON_SECRET` mandatory, always validate; use Vercel's built-in cron authentication instead

## Tech Debt

**Recipe Data Parsing Is Fragile:**
- Issue: Multiple fallback patterns for ingredient/category extraction from Notion
- Files: `api/_utils/notion.py` (lines 54-85)
- Impact: If Notion database structure changes, recipes may fail to parse or lose ingredients
- Fix approach: Document exact Notion schema expected; add validation/logging for missing properties; consider template constraints in Notion database

**Implicit Pantry Item Matching:**
- Issue: Ingredient filtering uses substring matching (`any(p in ingredient.lower() for p in pantry_names)`) instead of exact/fuzzy matching
- Files: `api/weekly.py` (line 104)
- Impact: "Flour" will match "All-Purpose Flour" or "Self-Rising Flour"; "oil" matches all oil types; false positives in filtering
- Fix approach: Use fuzzy string matching library (fuzzywuzzy); add unit tests for edge cases; consider allowing users to define match rules per pantry item

**Week Calculation Logic Duplicated:**
- Issue: `get_week_start()` and `get_current_week_start()` and `get_previous_week_start()` in three files with identical logic
- Files: `api/weekly.py` (lines 20-27), `api/cron/generate-weekly.py` (lines 23-30), `api/cron/analyze-week.py` (lines 19-27)
- Impact: Bug fix in one requires changes in three places; inconsistent behavior if implementations drift
- Fix approach: Centralize in `api/_utils/time.py` or similar; import and reuse

**Bare Exception Handlers:**
- Issue: Catch-all `except Exception` blocks throughout backend with silent failures
- Files: `api/_utils/db.py` (lines 23-27, 34-35), `api/weekly.py` (lines 158, 217-218), `api/cron/generate-weekly.py` (lines 184-185), `api/cron/analyze-week.py` (lines 230-239)
- Impact: Errors are swallowed; hard to debug; notification failures silently ignored; cron job logging failures go unnoticed
- Fix approach: Log all exceptions with context; differentiate between recoverable (log and continue) vs critical (fail loudly); send alerts for cron failures

**Manual JSON Parsing Without Validation:**
- Issue: API endpoints parse request bodies with no schema validation
- Files: `api/weekly.py` (line 74), `api/recipes.py` (line 45), `api/staples.py` (line 31), `api/pantry.py`, `api/settings.py`
- Impact: Invalid payloads silently fail or cause cryptic errors; no protection against malformed requests
- Fix approach: Use Pydantic models or JSON schema for validation; return 400 with validation errors

## Performance Bottlenecks

**N+1 Queries on Weekly List Fetch:**
- Issue: `do_GET` in `api/weekly.py` makes separate queries for list, items, and recipes
- Files: `api/weekly.py` (lines 40, 54, 57)
- Cause: No join queries; three separate database calls per request
- Impact: Slow response times; cascading latency for each client request
- Improvement path: Use Supabase views with joins or combine queries; consider caching entire weekly data

**Notion Recipes Fetched on Every Request:**
- Issue: `api/recipes.py` fetches all recipes from Notion even with 10-minute cache
- Files: `api/recipes.py` (lines 35-36), `api/_utils/notion.py` (lines 11-37)
- Cause: Pagination loop fetches all recipes; no filtering by date
- Impact: Slow `GET /api/recipes` response if Notion database is large (100+ recipes = multiple API calls)
- Improvement path: Add date-based filtering (`filter_by_date` to Notion query); paginate in frontend; increase cache TTL to hourly

**Recipe Details Fetch on Accept:**
- Issue: When user accepts a recipe, backend immediately fetches all recipe details from Notion
- Files: `api/weekly.py` (lines 93-95)
- Impact: Blocking call during user interaction; if Notion is slow, user sees delay
- Improvement path: Pre-fetch recipe details when weekly list is generated; store in `weekly_recipes` table; use async job queue for background enrichment

**Weekly List Regeneration Deletes and Recreates:**
- Issue: `generate_weekly_list()` deletes existing weekly list before creating new one
- Files: `api/cron/generate-weekly.py` (line 111)
- Impact: Brief period where list is missing; race condition if user accesses during regeneration; no atomic transaction
- Improvement path: Use upsert with unique constraint on `week_start`; wrap in transaction; preserve user modifications (checked items)

## Fragile Areas

**Learning System Has No Manual Override:**
- Files: `api/cron/analyze-week.py`, `api/cron/generate-weekly.py` (recipe selection algorithm lines 33-99)
- Why fragile: System learns preferences automatically but no way to reset/retrain if user's preferences change
- Safe modification: Always add guard clauses for learning flags; make learning toggleable in settings
- Test coverage: No tests for learning algorithm; edge cases like "no decisions made this week" or "all recipes rejected" untested

**Offline Sync Has No Conflict Resolution:**
- Files: `client/src/services/offlineStorage.js` (lines 155-169)
- Why fragile: If item is checked offline and unchecked online (or vice versa), last write wins; no merge strategy
- Safe modification: Add timestamp comparison; let user choose on conflict; log conflicts
- Test coverage: No tests for sync scenarios; offline->online transition untested

**Date Calculations Are Timezone-Naive:**
- Issue: Python uses `datetime.now()` without timezone; JavaScript uses `Date.now()` in browser's local timezone
- Files: `api/cron/generate-weekly.py` (line 25), `api/cron/analyze-week.py` (line 21), database stores timestamps with UTC
- Impact: Week boundary may be wrong if server and client in different timezones; cron jobs may run at unexpected times
- Safe modification: Store all timestamps in UTC; convert to user's timezone only for display
- Test coverage: No tests for timezone edge cases

**Recipe Scoring Algorithm Lacks Bounds:**
- Issue: Score calculation can theoretically exceed 100 with randomness bonus
- Files: `api/cron/generate-weekly.py` (lines 80, 73)
- Impact: Inconsistent scoring; randomness could dominate real preferences
- Safe modification: Clamp final score to [0, 100] range; reduce randomness weight or use weighted distribution

**Notion Database Schema Not Validated:**
- Files: `api/_utils/notion.py` (entire file)
- Why fragile: Code assumes specific property names (Name, Ingredients, Category) exist; no error if Notion schema changes
- Safe modification: Add schema validation on first fetch; cache schema; alert admin if validation fails
- Test coverage: No tests with various Notion schema structures

## Missing Critical Features

**No Syncing of Pending Changes on Connection:**
- Problem: Offline changes are queued but sync is never automatically triggered
- Files: `client/src/services/offlineStorage.js` (lines 155-169); called from nowhere visible
- Blocks: Users can make offline changes but sync only happens if manually triggered or page reloaded
- Fix: Add `online` event listener to trigger `syncPendingChanges()` automatically

**No Error Recovery for Failed Cron Jobs:**
- Problem: If `generate-weekly` fails, no retry; if `analyze-week` fails, user preferences don't update
- Files: `api/cron/generate-weekly.py`, `api/cron/analyze-week.py`
- Blocks: Users don't get weekly suggestions if cron fails silently
- Fix: Add retry logic (exponential backoff); send alert to admin email on failure

**No Rollback for Partial Weekly List Generation:**
- Problem: If recipe selection succeeds but ingredient insertion fails, list is incomplete
- Files: `api/cron/generate-weekly.py` (lines 102-167)
- Impact: User sees partial list; missing ingredients for some recipes
- Fix: Wrap entire generation in transaction; use Supabase transaction feature or implement manual rollback

**No Audit Log for User Actions:**
- Problem: No way to see what user did each week; helpful for debugging and learning system validation
- Blocks: Can't verify if learning system is correct; can't help users understand past lists
- Fix: Add `action_logs` table; log recipe accept/reject, item toggle with timestamp

## Test Coverage Gaps

**No Tests for Notion Integration:**
- What's not tested: Recipe parsing with various Notion schema variations; pagination with large datasets
- Files: `api/_utils/notion.py`
- Risk: Notion API changes go unnoticed; recipe parsing bugs discovered in production
- Priority: High - affects core feature

**No Tests for Learning Algorithm:**
- What's not tested: Recipe scoring edge cases (no history, all accepted, all rejected); item pattern calculations
- Files: `api/cron/analyze-week.py` (lines 30-84)
- Risk: Learning produces poor results or crashes on edge cases; silent failures
- Priority: High - directly impacts user experience

**No Tests for Cron Jobs:**
- What's not tested: Execution flow, side effects, error handling
- Files: `api/cron/generate-weekly.py`, `api/cron/analyze-week.py`
- Risk: Data corruption if logic changes; no confidence before deployments
- Priority: Critical - runs automatically without manual verification

**No Tests for Offline Sync:**
- What's not tested: Conflict resolution, partial sync failure, network reconnection timing
- Files: `client/src/services/offlineStorage.js`
- Risk: Data loss or duplication; sync failures go unnoticed
- Priority: High - offline is a core feature

**No Tests for Weekly List Generation:**
- What's not tested: Multiple recipes with overlapping ingredients, pantry filtering accuracy, edge cases
- Files: `api/weekly.py` (lines 82-115)
- Risk: Duplicate ingredients on list; incorrect filtering; missing items
- Priority: High - directly visible to users

**No Tests for Settings/Schedule:**
- What's not tested: Schedule change propagation, timezone handling, cron schedule accuracy
- Files: `api/settings.py`, `client/src/pages/Settings.jsx`
- Risk: Schedule changes don't take effect; users miss suggestions
- Priority: Medium

**Frontend Unit Tests Missing:**
- What's not tested: Component rendering, user interactions, API error states
- Files: All files in `client/src/`
- Risk: UI regressions, broken states, poor error messaging
- Priority: Medium - PWA feature mentioned as pending

## Scaling Limits

**Notion Query Performance:**
- Current capacity: Works with ~100 recipes in Notion database
- Limit: API rate limits (~3 requests per second); pagination loops over all recipes
- Scaling path: Implement incremental sync (only fetch updated recipes since last sync); use database filters; batch requests

**Weekly List Size:**
- Current: Works with reasonable grocery lists (20-50 items per week)
- Limit: No pagination on frontend; all items loaded at once
- Scaling path: Add pagination to Weekly component; lazy load categories; virtual scrolling

**Redis Memory:**
- Current: Caches 10-minute recipe list + 24-hour notifications + 100 cron logs
- Limit: No cleanup strategy for old notifications; Redis memory could grow unbounded
- Scaling path: Set explicit TTLs on all keys; implement log rotation in cron jobs (already done for logs)

**Database Query Performance:**
- Current: Individual queries for each API endpoint
- Limit: N+1 queries; no connection pooling visible
- Scaling path: Use Supabase connection pooling; implement query caching; batch operations

## Dependencies at Risk

**python-notion Client:**
- Risk: Not actively maintained (check GitHub); API changes could break parsing
- Impact: Recipe fetching could fail; new Notion features not supported
- Migration plan: Keep working version pinned; monitor releases; consider Notion Official Python SDK if available

**Supabase Python Client:**
- Risk: Relatively new library; breaking changes possible
- Impact: Database operations could fail after library update
- Migration plan: Pin minor version in requirements.txt; test updates before deploying

**IndexedDB Usage (Frontend):**
- Risk: Browser implementation differences; data loss if user clears storage
- Impact: Offline changes could be lost
- Migration plan: Add warning before storage clear; consider localStorage backup; export/import user data

---

*Concerns audit: 2026-02-01*
