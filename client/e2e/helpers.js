/**
 * Shared test helpers for mocking Supabase auth and API responses.
 *
 * The app uses placeholder Supabase credentials in tests, so:
 *   - All requests to placeholder.supabase.co are intercepted
 *   - /api/* routes are fulfilled with realistic mock data
 *   - A fake session is injected via addInitScript so the GoTrue client
 *     returns it from localStorage before any network call fires
 */

const FAKE_USER = {
  id: 'test-user-id',
  email: 'gschultz49@gmail.com',
  user_metadata: { full_name: 'Test User', avatar_url: '' },
  app_metadata: {},
  aud: 'authenticated',
  created_at: new Date().toISOString(),
};

const FAKE_SESSION = {
  access_token: 'fake-access-token',
  refresh_token: 'fake-refresh-token',
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  token_type: 'bearer',
  user: FAKE_USER,
};

/**
 * Intercept Supabase requests so nothing hangs, and inject a fake
 * authenticated session into localStorage before page scripts run.
 */
export async function mockAuth(page) {
  // Intercept every request to placeholder.supabase.co
  await page.route('**/placeholder.supabase.co/**', (route) => {
    const url = route.request().url();

    // Token / session endpoint – return our fake session
    if (url.includes('/auth/v1/token') || url.includes('/auth/v1/user')) {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(FAKE_SESSION),
      });
    } else {
      // Anything else (realtime, etc) – just abort cleanly
      route.abort();
    }
  });

  // Inject session into localStorage before the app bootstraps.
  // Supabase JS client v2 looks for multiple possible key patterns;
  // we cover them all so whichever version resolves it works.
  await page.addInitScript(() => {
    const session = JSON.stringify({
      access_token: 'fake-access-token',
      refresh_token: 'fake-refresh-token',
      expires_in: 3600,
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      token_type: 'bearer',
      user: {
        id: 'test-user-id',
        email: 'gschultz49@gmail.com',
        user_metadata: { full_name: 'Test User' },
        app_metadata: {},
        aud: 'authenticated',
      },
    });

    // Common storage keys used across supabase-js versions
    const keys = [
      'supabase-auth-token',
      'sb-placeholder-auth-token',
      'supabase.auth.token',
      'supabase-placeholder-auth-token',
    ];
    keys.forEach((key) => localStorage.setItem(key, session));
  });
}

/**
 * Intercept Supabase requests WITHOUT injecting a session –
 * lets the app reach the login page cleanly instead of hanging.
 */
export async function interceptSupabase(page) {
  await page.route('**/placeholder.supabase.co/**', (route) => {
    const url = route.request().url();
    if (url.includes('/auth/v1/token')) {
      // No session – return empty
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: { session: null }, error: null }),
      });
    } else {
      route.abort();
    }
  });
}

// ---------------------------------------------------------------------------
// API mock payloads – match the shapes the components actually consume
// ---------------------------------------------------------------------------

export const MOCK_WEEKLY = {
  id: 'week-1',
  week_start: '2026-02-01',
  status: 'active',
  items: [
    { id: 'item-1', name: 'Bananas', category: 'Fruit', checked: false },
    { id: 'item-2', name: 'Bare Bell Bar', category: 'Snacks', checked: false },
    { id: 'item-3', name: 'Chicken Breast', category: 'Meat', checked: false },
    { id: 'item-4', name: 'Rice', category: 'Grains', checked: true },
  ],
  recipes: [
    { id: 'recipe-1', name: 'Grilled Chicken', status: 'accepted' },
    { id: 'recipe-2', name: 'Pasta Primavera', status: 'suggested' },
  ],
};

export const MOCK_RECIPES = [
  { id: 'notion-1', name: 'Grilled Chicken', category: 'Dinner', ingredients: ['Chicken', 'Lemon', 'Garlic'], is_favorite: true },
  { id: 'notion-2', name: 'Pasta Primavera', category: 'Dinner', ingredients: ['Pasta', 'Zucchini', 'Tomato', 'Parmesan'], is_favorite: false },
  { id: 'notion-3', name: 'Overnight Oats', category: 'Breakfast', ingredients: ['Oats', 'Milk', 'Chia Seeds'], is_favorite: false },
];

export const MOCK_STAPLES = [
  { id: 'staple-1', name: 'Bananas', category: 'Fruit', active: true },
  { id: 'staple-2', name: 'Bare Bell Bar', category: 'Snacks', active: true },
  { id: 'staple-3', name: 'Eggs', category: 'Dairy', active: false },
];

export const MOCK_PANTRY = [
  { id: 'pantry-1', name: 'Salt', category: 'Seasoning', needs_restock: false },
  { id: 'pantry-2', name: 'Olive Oil', category: 'Oil', needs_restock: true },
];

/**
 * Mount /api/* route handlers with mock payloads.
 */
export async function mockApi(page) {
  await page.route('/api/weekly', (route) => {
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_WEEKLY) });
  });

  await page.route('/api/recipes', (route) => {
    if (route.request().method() === 'GET') {
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_RECIPES) });
    } else {
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) });
    }
  });

  await page.route('/api/staples**', (route) => {
    if (route.request().method() === 'GET') {
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_STAPLES) });
    } else {
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) });
    }
  });

  await page.route('/api/pantry**', (route) => {
    if (route.request().method() === 'GET') {
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_PANTRY) });
    } else {
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) });
    }
  });

  await page.route('/api/settings**', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ setting_value: { day: 0, hour: 9, minute: 0 } }),
    });
  });

  await page.route('/api/notifications**', (route) => {
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) });
  });
}
