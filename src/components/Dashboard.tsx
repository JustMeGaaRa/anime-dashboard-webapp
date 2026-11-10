'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ANIME, ANIME_BY_ID, RECENTLY_WATCHED_IDS } from '@/lib/data';
import { useStore } from '@/lib/store';
import type { MALProfileData, MALListItem } from '@/app/page';
import type { Anime, ListKey } from '@/lib/types';
import { updateAnimeStatus, deleteAnimeFromList } from '@/app/actions';
import { unmapListStatus } from '@/lib/mapper';
import { DashboardHero } from './dashboard/DashboardHero';
import { RecentlyWatchedSection } from './dashboard/RecentlyWatchedSection';
import { MyListSection } from './dashboard/MyListSection';

interface DashboardProps {
  malData?: MALProfileData | null;
}

export default function Dashboard({ malData }: DashboardProps) {
  const { lists, watchedEps, setListFor, removeFrom, showToast } = useStore();
  const [activeFilter, setActiveFilter] = useState('watching');
  const [sortBy, setSortBy] = useState<'name' | 'release_date' | 'date_added'>('date_added');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Local copy of MAL list so UI updates (move/remove) are reflected immediately
  const [malList, setMalList] = useState<MALListItem[] | null>(malData?.animeList ?? null);

  const handleSetList = async (id: string, key: string) => {
    // Optimistic UI
    if (malList) {
      setMalList((prev) =>
        prev?.map((item) =>
          item.anime.id === id ? { ...item, listKey: key as ListKey } : item,
        ) ?? null,
      );
    }
    const item = malList?.find(it => it.anime.id === id);
    setListFor(id, key, item?.anime.title || ANIME_BY_ID[id]?.title);

    try {
      await updateAnimeStatus(Number(id), unmapListStatus(key as ListKey));
    } catch (err) {
      console.error('[Dashboard] Failed to update MAL status:', err);
      // Revert store on failure (simple implementation)
      // In a real app we might want a more robust rollback
    }
  };

  const handleRemove = async (id: string) => {
    const item = malList?.find((it) => it.anime.id === id);
    const title = item?.anime.title || ANIME_BY_ID[id]?.title;
    const previousKey = item?.listKey ?? lists[id];

    // Optimistic UI
    if (malList) {
      setMalList((prev) => prev?.filter((it) => it.anime.id !== id) ?? null);
    }
    removeFrom(id, title);

    try {
      await deleteAnimeFromList(Number(id));
    } catch (err) {
      console.error('[Dashboard] Failed to remove from MAL:', err);
      // Roll back so the UI matches MAL, then tell the user
      if (item) setMalList((prev) => (prev ? [...prev, item] : prev));
      if (previousKey) setListFor(id, previousKey, title, true);
      showToast(`Couldn't remove "${title ?? 'Anime'}". Please try again.`);
    }
  };

  // Stats — prefer real MAL statistics, fall back to counting from store
  const stats = useMemo(() => {
    const malStats = malData?.user.anime_statistics;
    if (malStats) {
      return {
        watching: malStats.num_items_watching,
        planned: malStats.num_items_plan_to_watch,
        completed: malStats.num_items_completed,
        total: malStats.num_items,
      };
    }
    const c: Record<string, number> = { watching: 0, planned: 0, completed: 0 };
    Object.values(lists).forEach((v) => {
      if (c[v] !== undefined) c[v]++;
    });
    return {
      watching: c.watching,
      planned: c.planned,
      completed: c.completed,
      total: Object.values(lists).length,
    };
  }, [malData, lists]);

  // Recently watched — most recently updated anime from the MAL list, or fall back to mock
  const recentlyWatched = useMemo(() => {
    if (malList) {
      return [...malList]
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        .slice(0, 12)
        .map((item) => item.anime);
    }
    return RECENTLY_WATCHED_IDS.map((id) => ANIME_BY_ID[id]).filter(Boolean).slice(0, 12);
  }, [malList]);

  // My list filtered and sorted
  const filteredMyList = useMemo(() => {
    let items: { anime: Anime; updatedAt?: string }[] = [];

    if (malList) {
      items = malList
        .filter((item) => item.listKey === activeFilter)
        .map((item) => ({ anime: item.anime, updatedAt: item.updatedAt }));
    } else {
      items = ANIME
        .filter((a) => lists[a.id] === activeFilter)
        .map((a) => ({ anime: a }));
    }

    return items
      .sort((a, b) => {
        let result = 0;
        if (sortBy === 'name') {
          result = a.anime.title.localeCompare(b.anime.title);
        } else if (sortBy === 'release_date') {
          const dateA = a.anime.startDate || `${a.anime.year}-01-01`;
          const dateB = b.anime.startDate || `${b.anime.year}-01-01`;
          result = dateA.localeCompare(dateB);
        } else if (sortBy === 'date_added') {
          const timeA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
          const timeB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
          result = timeA - timeB;
        }

        return sortOrder === 'asc' ? result : -result;
      })
      .map((item) => item.anime);
  }, [malList, lists, activeFilter, sortBy, sortOrder]);

  // Watched episodes per anime id
  const watchedEpsMap = useMemo(() => {
    if (malList) {
      return Object.fromEntries(malList.map((item) => [item.anime.id, item.watchedEps]));
    }
    return watchedEps;
  }, [malList, watchedEps]);

  // Current list key per anime id
  const listsMap = useMemo(() => {
    if (malList) {
      return Object.fromEntries(malList.map((item) => [item.anime.id, item.listKey]));
    }
    return lists;
  }, [malList, lists]);

  return (
    <main className="page">
      <DashboardHero malData={malData} stats={stats} />

      <RecentlyWatchedSection
        recentlyWatched={recentlyWatched}
        listsMap={listsMap}
        watchedEpsMap={watchedEpsMap}
        handleSetList={handleSetList}
        handleRemove={handleRemove}
      />

      <MyListSection
        filteredMyList={filteredMyList}
        malList={malList}
        lists={lists}
        listsMap={listsMap}
        watchedEpsMap={watchedEpsMap}
        activeFilter={activeFilter}
        setActiveFilter={setActiveFilter}
        sortBy={sortBy}
        setSortBy={setSortBy}
        sortOrder={sortOrder}
        setSortOrder={setSortOrder}
        handleSetList={handleSetList}
        handleRemove={handleRemove}
      />

      <div style={{ textAlign: 'center', marginTop: 8 }}>
        <Link href="/trending" className="action-link" style={{ display: 'inline-flex' }}>
          Browse top anime <span>→</span>
        </Link>
      </div>
    </main>
  );
}
