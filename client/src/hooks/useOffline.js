import { useState, useEffect, useCallback } from 'react';
import {
  initOfflineDB,
  cacheWeeklyList,
  getCachedWeeklyList,
  saveItemState,
  getAllItemStates,
  addPendingChange,
  syncPendingChanges
} from '../services/offlineStorage';
import { weeklyApi } from '../services/api';

export function useOffline() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingSync, setPendingSync] = useState(false);

  useEffect(() => {
    // Initialize offline database
    initOfflineDB().catch(console.error);

    const handleOnline = async () => {
      setIsOnline(true);
      // Sync pending changes when coming back online
      setPendingSync(true);
      try {
        await syncPendingChanges(weeklyApi);
      } finally {
        setPendingSync(false);
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return { isOnline, pendingSync };
}

export function useWeeklyList(weekStart) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { isOnline } = useOffline();

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      if (isOnline) {
        // Fetch from API
        const result = await weeklyApi.getCurrent();

        // Merge with any local item states
        const localStates = await getAllItemStates();
        const stateMap = new Map(localStates.map(s => [s.id, s.checked]));

        if (result.items) {
          result.items = result.items.map(item => ({
            ...item,
            checked: stateMap.has(item.id) ? stateMap.get(item.id) : item.checked
          }));
        }

        // Cache for offline use
        await cacheWeeklyList(result);
        setData(result);
      } else {
        // Load from cache
        const cached = await getCachedWeeklyList(weekStart);
        if (cached) {
          // Apply local item states
          const localStates = await getAllItemStates();
          const stateMap = new Map(localStates.map(s => [s.id, s.checked]));

          if (cached.items) {
            cached.items = cached.items.map(item => ({
              ...item,
              checked: stateMap.has(item.id) ? stateMap.get(item.id) : item.checked
            }));
          }
          setData(cached);
        } else {
          setError('No offline data available');
        }
      }
    } catch (err) {
      // Try to load from cache on error
      try {
        const cached = await getCachedWeeklyList(weekStart);
        if (cached) {
          setData(cached);
        } else {
          setError(err.message);
        }
      } catch {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  }, [weekStart, isOnline]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const toggleItem = useCallback(async (itemId, checked) => {
    // Optimistically update local state
    setData(prev => ({
      ...prev,
      items: prev.items.map(item =>
        item.id === itemId ? { ...item, checked } : item
      )
    }));

    // Save to local storage immediately
    await saveItemState(itemId, checked);

    if (isOnline) {
      try {
        await weeklyApi.toggleItem(itemId, checked);
      } catch (err) {
        // Queue for later sync
        await addPendingChange({ type: 'toggle_item', itemId, checked });
      }
    } else {
      // Queue for later sync
      await addPendingChange({ type: 'toggle_item', itemId, checked });
    }
  }, [isOnline]);

  return { data, loading, error, refetch: fetchData, toggleItem };
}
