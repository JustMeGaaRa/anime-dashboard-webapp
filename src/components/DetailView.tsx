'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ANIME_BY_ID } from '@/lib/data';
import { useStore } from '@/lib/store';
import AnimeCard from './anime/AnimeCard';
import HorizontalScroller from './HorizontalScroller';
import type { Anime, ListKey } from '@/lib/types';
import { updateAnimeStatus, deleteAnimeFromList, updateAnimeEpisodes } from '@/app/actions';
import { unmapListStatus } from '@/lib/mapper';
import { DetailHero } from './anime/DetailHero';
import { SeasonsList } from './anime/SeasonsList';

export default function DetailView({ initialAnime }: { initialAnime: Anime | null }) {
  const router = useRouter();
  const { lists, watchedEps, setListFor, removeFrom, updateWatchedEps, showToast } = useStore();
  const anime = initialAnime;

  const [isSynced, setIsSynced] = useState(false);
  const syncAttemptedRef = useRef(false);

  useEffect(() => {
    if (anime && !syncAttemptedRef.current) {
      // We wait a tiny bit to ensure StoreProvider's localStorage hydration 
      // (which uses setTimeout 0) has completed before we overwrite it with fresh MAL data.
      const timer = setTimeout(() => {
        if (anime.listKey) {
          setListFor(anime.id, anime.listKey, anime.title, true);
        }
        if (anime.watchedEps !== undefined) {
          updateWatchedEps(anime.id, anime.watchedEps);
        }
        syncAttemptedRef.current = true;
        setIsSynced(true);
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [anime, setListFor, updateWatchedEps]);

  if (!anime) {
    return (
      <main className="page page--detail">
        <button onClick={() => router.back()} className="ghost-btn dt-back">
          ← Back
        </button>
        <div className="empty">
          <div className="empty-mark">...</div>
          <div className="empty-title">Loading anime data...</div>
        </div>
      </main>
    );
  }

  const handleSetList = async (key: string) => {
    setListFor(anime.id, key, anime.title);
    try {
      await updateAnimeStatus(Number(anime.id), unmapListStatus(key as ListKey));
    } catch (err) {
      console.error('[DetailView] Failed to update MAL status:', err);
    }
  };

  const handleRemove = async () => {
    const previousKey = lists[anime.id] ?? anime.listKey;
    removeFrom(anime.id, anime.title);
    try {
      await deleteAnimeFromList(Number(anime.id));
    } catch (err) {
      console.error('[DetailView] Failed to remove from MAL:', err);
      if (previousKey) setListFor(anime.id, previousKey, anime.title, true);
      showToast(`Couldn't remove "${anime.title}". Please try again.`);
    }
  };

  const handleEpisodeChange = async (ep: number) => {
    updateWatchedEps(anime.id, ep);
    try {
      await updateAnimeEpisodes(Number(anime.id), ep);
    } catch (err) {
      console.error('[DetailView] Failed to update MAL episodes:', err);
    }
  };

  const currentList = !isSynced ? (anime.listKey ?? null) : (lists[anime.id] ?? anime.listKey ?? null);
  const currentWatchedEps = !isSynced ? (anime.watchedEps ?? 0) : ((watchedEps[anime.id] !== undefined) ? watchedEps[anime.id] : (anime.watchedEps ?? 0));
  const related = anime.relatedIds
    .map((id) => ANIME_BY_ID[id])
    .filter((a): a is Anime => !!a);

  return (
    <main className="page page--detail">
      <button onClick={() => router.back()} className="ghost-btn dt-back" style={{ display: 'inline-flex' }}>
        <span>←</span> Back
      </button>
      <DetailHero
        anime={anime}
        currentList={currentList}
        watchedEps={currentWatchedEps}
        onSetList={handleSetList}
        onRemove={handleRemove}
      />

      <SeasonsList
        anime={anime}
        currentWatchedEps={currentWatchedEps || 0}
        onEpisodeChange={handleEpisodeChange}
      />
      {related.length > 0 && (
        <section className="section">
          <header className="section-head">
            <div>
              <h2 className="section-title">More like this</h2>
              <p className="section-sub">Based on genre and studio</p>
            </div>
          </header>
          <HorizontalScroller>
            {related.map((a) => (
              <div className="row-card" key={a.id}>
                <AnimeCard
                  anime={a}
                  currentList={lists[a.id] ?? null}
                  watchedEps={watchedEps[a.id] ?? a.watchedEps ?? 0}
                  onSetList={async (k) => {
                    setListFor(a.id, k, a.title);
                    try {
                      await updateAnimeStatus(Number(a.id), unmapListStatus(k as ListKey));
                    } catch (err) {
                      console.error('[DetailView] Failed to update related anime status:', err);
                    }
                  }}
                  onRemove={async () => {
                    const previousKey = lists[a.id];
                    removeFrom(a.id, a.title);
                    try {
                      await deleteAnimeFromList(Number(a.id));
                    } catch (err) {
                      console.error('[DetailView] Failed to remove related anime:', err);
                      if (previousKey) setListFor(a.id, previousKey, a.title, true);
                      showToast(`Couldn't remove "${a.title}". Please try again.`);
                    }
                  }}
                />
              </div>
            ))}
          </HorizontalScroller>
        </section>
      )}
    </main>
  );
}
