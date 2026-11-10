'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { ANIME_BY_ID, INITIAL_LISTS, LIST_LABELS, WATCHED_EPS } from './data';
import type { Lists, WatchedEps } from './types';

interface StoreContextValue {
  lists: Lists;
  watchedEps: WatchedEps;
  toast: string | null;
  setListFor: (id: string, key: string, title?: string, silent?: boolean) => void;
  removeFrom: (id: string, title?: string) => void;
  updateWatchedEps: (id: string, eps: number) => void;
  showToast: (msg: string) => void;
}

const StoreContext = createContext<StoreContextValue | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [lists, setLists] = useState<Lists>({ ...INITIAL_LISTS });
  const [watchedEps, setWatchedEps] = useState<WatchedEps>({ ...WATCHED_EPS });
  const [toast, setToast] = useState<string | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load from localStorage on mount
  useEffect(() => {
    const savedLists = localStorage.getItem('justmegaara_lists');
    const savedEps = localStorage.getItem('justmegaara_watchedEps');

    // Use setTimeout to avoid synchronous setState during effect, which triggers lint warnings
    // and can cause cascading renders. This is safe for hydration as it happens after the first render.
    const timer = setTimeout(() => {
      if (savedLists) {
        try {
          setLists((prev) => ({ ...prev, ...JSON.parse(savedLists) }));
        } catch (e) {
          console.error('Failed to parse saved lists', e);
        }
      }
      if (savedEps) {
        try {
          setWatchedEps((prev) => ({ ...prev, ...JSON.parse(savedEps) }));
        } catch (e) {
          console.error('Failed to parse saved eps', e);
        }
      }
    }, 0);

    return () => clearTimeout(timer);
  }, []);

  // Save to localStorage when changed
  useEffect(() => {
    localStorage.setItem('justmegaara_lists', JSON.stringify(lists));
  }, [lists]);

  useEffect(() => {
    localStorage.setItem('justmegaara_watchedEps', JSON.stringify(watchedEps));
  }, [watchedEps]);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 1800);
  }, []);

  const setListFor = useCallback(
    (id: string, key: string, title?: string, silent?: boolean) => {
      setLists((prev) => ({ ...prev, [id]: key as Lists[string] }));
      if (!silent) {
        const name = title || ANIME_BY_ID[id]?.title || 'Anime';
        showToast(`Added "${name}" to ${LIST_LABELS[key]}`);
      }
    },
    [showToast],
  );

  const removeFrom = useCallback(
    (id: string, title?: string) => {
      setLists((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      const name = title || ANIME_BY_ID[id]?.title || 'Anime';
      showToast(`Removed "${name}" from your list`);
    },
    [showToast],
  );

  const updateWatchedEps = useCallback(
    (id: string, eps: number) => {
      setWatchedEps((prev) => ({ ...prev, [id]: eps }));
    },
    [],
  );

  const value = useMemo(
    () => ({ lists, watchedEps, toast, setListFor, removeFrom, updateWatchedEps, showToast }),
    [lists, watchedEps, toast, setListFor, removeFrom, updateWatchedEps, showToast],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside StoreProvider');
  return ctx;
}
