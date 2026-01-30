const API_BASE = '/api';

async function fetchApi(endpoint, options = {}) {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || 'Request failed');
  }

  return response.json();
}

// Weekly List API
export const weeklyApi = {
  getCurrent: () => fetchApi('/weekly'),
  getByWeek: (weekStart) => fetchApi(`/weekly?week=${weekStart}`),
  acceptRecipe: (weeklyListId, recipeId) =>
    fetchApi('/weekly', {
      method: 'POST',
      body: JSON.stringify({ action: 'accept_recipe', weekly_list_id: weeklyListId, recipe_id: recipeId }),
    }),
  rejectRecipe: (weeklyListId, recipeId) =>
    fetchApi('/weekly', {
      method: 'POST',
      body: JSON.stringify({ action: 'reject_recipe', weekly_list_id: weeklyListId, recipe_id: recipeId }),
    }),
  activateList: (weeklyListId) =>
    fetchApi('/weekly', {
      method: 'POST',
      body: JSON.stringify({ action: 'activate', weekly_list_id: weeklyListId }),
    }),
  toggleItem: (itemId, checked) =>
    fetchApi('/weekly', {
      method: 'PUT',
      body: JSON.stringify({ id: itemId, checked }),
    }),
};

// Recipes API
export const recipesApi = {
  getAll: () => fetchApi('/recipes'),
  getById: (id) => fetchApi(`/recipes?id=${id}`),
  toggleFavorite: (notionPageId, name, isFavorite) =>
    fetchApi('/recipes', {
      method: 'POST',
      body: JSON.stringify({ notion_page_id: notionPageId, name, is_favorite: isFavorite }),
    }),
};

// Staples API
export const staplesApi = {
  getAll: () => fetchApi('/staples'),
  add: (name, category) =>
    fetchApi('/staples', {
      method: 'POST',
      body: JSON.stringify({ name, category }),
    }),
  update: (id, updates) =>
    fetchApi('/staples', {
      method: 'PUT',
      body: JSON.stringify({ id, ...updates }),
    }),
  delete: (id) =>
    fetchApi(`/staples?id=${id}`, { method: 'DELETE' }),
};

// Pantry API
export const pantryApi = {
  getAll: () => fetchApi('/pantry'),
  add: (name, category) =>
    fetchApi('/pantry', {
      method: 'POST',
      body: JSON.stringify({ name, category }),
    }),
  update: (id, updates) =>
    fetchApi('/pantry', {
      method: 'PUT',
      body: JSON.stringify({ id, ...updates }),
    }),
  markRestock: (id, needsRestock) =>
    fetchApi('/pantry', {
      method: 'PUT',
      body: JSON.stringify({ id, needs_restock: needsRestock }),
    }),
  delete: (id) =>
    fetchApi(`/pantry?id=${id}`, { method: 'DELETE' }),
};

// Notifications API
export const notificationsApi = {
  getLatest: () => fetchApi('/notifications'),
  subscribe: (subscription, deviceId) =>
    fetchApi('/notifications', {
      method: 'POST',
      body: JSON.stringify({ subscription, device_id: deviceId }),
    }),
};

// Settings API
export const settingsApi = {
  getSchedule: async () => {
    try {
      const result = await fetchApi('/settings?key=suggestion_schedule');
      return result?.setting_value || { day: 0, hour: 9, minute: 0 };
    } catch {
      return { day: 0, hour: 9, minute: 0 };
    }
  },
  updateSchedule: (schedule) =>
    fetchApi('/settings', {
      method: 'POST',
      body: JSON.stringify({ key: 'suggestion_schedule', value: schedule }),
    }),
};
