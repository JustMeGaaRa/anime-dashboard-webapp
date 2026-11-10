'use client';

import { useRouter } from 'next/navigation';
import { LIST_LABELS } from '@/lib/data';
import type { Anime } from '@/lib/types';
import { Badge } from '../ui/Badge';
import { CardMenu } from './CardMenu';

interface AnimeCardProps {
  anime: Anime;
  currentList: string | null;
  watchedEps: number;
  onSetList: (key: string) => void;
  onRemove: () => void;
  density?: 'compact' | 'regular' | 'comfy';
  clickable?: boolean;
  showListStatus?: boolean;
}

export default function AnimeCard({
  anime,
  currentList,
  watchedEps,
  onSetList,
  onRemove,
  density = 'regular',
  clickable = true,
  showListStatus = false,
}: AnimeCardProps) {
  const router = useRouter();

  const handleClick = () => {
    if (clickable) router.push('/anime/' + anime.id);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Only handle keys pressed on the card itself, so Enter/Space on the menu
    // trigger or its items still reach those controls instead of navigating.
    if (e.target !== e.currentTarget) return;
    if (clickable && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      router.push('/anime/' + anime.id);
    }
  };

  let statusVariant: 'default' | 'airing' | 'upcoming' = 'default';
  if (anime.status === 'Currently Airing') statusVariant = 'airing';
  else if (anime.status === 'Upcoming') statusVariant = 'upcoming';

  return (
    <article
      className={'ac-card ac-card--' + density + (clickable ? ' ac-card--clickable' : '')}
      onClick={handleClick}
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      onKeyDown={handleKeyDown}
    >
      <div className="ac-poster">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={anime.poster} alt="" />
        <span className="ac-rating-pill">{anime.ageRating}</span>
        {currentList === 'watching' && (
          <div className="ac-progress">
            <div
              className="ac-progress-bar"
              style={{ width: `${anime.episodes > 0 ? Math.min(100, (watchedEps / anime.episodes) * 100) : 0}%` }}
            />
          </div>
        )}
      </div>
      <div className="ac-body">
        <div className="ac-body-top">
          <div className="ac-body-badges">
            <Badge variant={statusVariant}>{anime.status}</Badge>
            {showListStatus && currentList && (
              <div className="ac-list-tag">
                <span className={`ac-dot ac-dot--${currentList}`}></span>
                {LIST_LABELS[currentList]}
              </div>
            )}
          </div>
          <CardMenu
            anime={anime}
            currentList={currentList}
            onSetList={onSetList}
            onRemove={onRemove}
          />
        </div>
        <div className="ac-season" title={anime.season}>
          {anime.season}
        </div>
        <h3 className="ac-title" title={anime.title}>
          {anime.title}
        </h3>
        <div className="ac-stats">
          <span className="ac-stat">
            <span className="ac-star">★</span>
            <span className="ac-stat-num">{anime.score.toFixed(2)}</span>
            <span className="ac-stat-sub">{anime.userCount.toLocaleString('en-US')} users</span>
          </span>
          <span className="ac-stat">
            <span className="ac-stat-hash">#</span>
            <span className="ac-stat-num">{anime.rank.toLocaleString('en-US')}</span>
            <span className="ac-stat-sub">Ranking</span>
          </span>
        </div>
        {currentList === 'watching' && (
          <div className="ac-eps">
            Ep {watchedEps} / {anime.episodes || '?'}
          </div>
        )}
        <div className="ac-badges">
          {anime.genres.map((g) => (
            <span key={g} className="ac-badge">
              {g}
            </span>
          ))}
        </div>
      </div>
    </article>
  );
}
