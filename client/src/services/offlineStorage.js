/**
 * Offline storage service using IndexedDB for robust offline support.
 * Handles syncing when back online.
 */

const DB_NAME = 'grocery-list-offline';
const DB_VERSION = 1;

let db = null;

export async function initOfflineDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const database = event.target.result;

      // Store for weekly list cache
      if (!database.objectStoreNames.contains('weeklyList')) {
        database.createObjectStore('weeklyList', { keyPath: 'week_start' });
      }

      // Store for pending changes (to sync when online)
      if (!database.objectStoreNames.contains('pendingChanges')) {
        const store = database.createObjectStore('pendingChanges', {
          keyPath: 'id',
          autoIncrement: true
        });
        store.createIndex('type', 'type', { unique: false });
      }

      // Store for item states (local checkbox states)
      if (!database.objectStoreNames.contains('itemStates')) {
        database.createObjectStore('itemStates', { keyPath: 'id' });
      }
    };
  });
}

export async function cacheWeeklyList(weeklyList) {
  if (!db) await initOfflineDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction('weeklyList', 'readwrite');
    const store = tx.objectStore('weeklyList');
    store.put(weeklyList);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getCachedWeeklyList(weekStart) {
  if (!db) await initOfflineDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction('weeklyList', 'readonly');
    const store = tx.objectStore('weeklyList');
    // If no specific week requested, return the most recently cached list
    const request = weekStart ? store.get(weekStart) : store.getAll();
    request.onsuccess = () => {
      if (weekStart) {
        resolve(request.result);
      } else {
        const all = request.result;
        resolve(all.length > 0 ? all[all.length - 1] : null);
      }
    };
    request.onerror = () => reject(request.error);
  });
}

export async function saveItemState(itemId, checked) {
  if (!db) await initOfflineDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction('itemStates', 'readwrite');
    const store = tx.objectStore('itemStates');
    store.put({ id: itemId, checked, updatedAt: Date.now() });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getItemState(itemId) {
  if (!db) await initOfflineDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction('itemStates', 'readonly');
    const store = tx.objectStore('itemStates');
    const request = store.get(itemId);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function getAllItemStates() {
  if (!db) await initOfflineDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction('itemStates', 'readonly');
    const store = tx.objectStore('itemStates');
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function addPendingChange(change) {
  if (!db) await initOfflineDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction('pendingChanges', 'readwrite');
    const store = tx.objectStore('pendingChanges');
    store.add({ ...change, createdAt: Date.now() });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getPendingChanges() {
  if (!db) await initOfflineDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction('pendingChanges', 'readonly');
    const store = tx.objectStore('pendingChanges');
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function clearPendingChange(id) {
  if (!db) await initOfflineDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction('pendingChanges', 'readwrite');
    const store = tx.objectStore('pendingChanges');
    store.delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function clearAllPendingChanges() {
  if (!db) await initOfflineDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction('pendingChanges', 'readwrite');
    const store = tx.objectStore('pendingChanges');
    store.clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// Sync pending changes when online
export async function syncPendingChanges(weeklyApi) {
  const changes = await getPendingChanges();

  for (const change of changes) {
    try {
      if (change.type === 'toggle_item') {
        await weeklyApi.toggleItem(change.itemId, change.checked);
      }
      await clearPendingChange(change.id);
    } catch (error) {
      console.error('Failed to sync change:', error);
      // Keep the change for next sync attempt
    }
  }
}
