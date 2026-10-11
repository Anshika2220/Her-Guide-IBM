import { Bookmark, BookmarkCheck, CalendarClock, MapPin, Plus } from 'lucide-react';
import { OPP_CATEGORIES } from '../utils/constants';
import { daysUntil, fmtDate } from '../utils/format';
import type { Opportunity } from '../types';
import { MatchBadge } from './ui';

export function DeadlineText({ deadline }: { deadline?: string | null }) {
  const d = daysUntil(deadline);
  if (d === null) return <span className="meta">No deadline listed</span>;
  const tone = d < 0 ? 'text-zinc-500' : d <= 7 ? 'text-amber-300' : 'text-zinc-400';
  return <span className={`inline-flex items-center gap-1 text-xs ${tone}`}><CalendarClock className="h-3.5 w-3.5" />{d < 0 ? 'Closed ' : d <= 7 ? `${d} day${d === 1 ? '' : 's'} left · ` : ''}{fmtDate(deadline)}</span>;
}

export default function OpportunityCard({ o, onOpen, onSave, onTrack }: {
  o: Opportunity; onOpen: () => void; onSave?: () => void; onTrack?: () => void;
}) {
  return (
    <article className="card card-hover flex flex-col">
      <div className="flex items-start justify-between gap-3">
        <span className="badge">{OPP_CATEGORIES[o.category] ?? o.category}</span>
        <MatchBadge match={o.match} />
      </div>
      <button onClick={onOpen} className="mt-3 text-left">
        <h3 className="h-card line-clamp-2 hover:text-violet-200">{o.title}</h3>
        <p className="mt-0.5 text-sm text-zinc-400">{o.organization}</p>
      </button>
      <p className="mt-3 line-clamp-3 flex-1 text-sm text-zinc-400">{o.description}</p>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1">
        <span className="inline-flex items-center gap-1 text-xs text-zinc-400"><MapPin className="h-3.5 w-3.5" />{o.mode === 'remote' ? 'Remote' : o.location || 'India'}</span>
        <DeadlineText deadline={o.deadline} />
      </div>
      {(onSave || onTrack) && (
        <div className="mt-4 flex gap-2">
          <button className="btn-primary btn-sm flex-1" onClick={onOpen}>View details</button>
          {onSave && <button className="btn-ghost btn-sm" onClick={onSave} aria-pressed={!!o.saved} aria-label={o.saved ? 'Unsave' : 'Save'}>{o.saved ? <BookmarkCheck className="h-4 w-4 text-violet-300" /> : <Bookmark className="h-4 w-4" />}</button>}
          {onTrack && <button className="btn-ghost btn-sm" onClick={onTrack} disabled={o.tracked} aria-label="Add to tracker" title={o.tracked ? 'In your tracker' : 'Add to tracker'}><Plus className="h-4 w-4" /></button>}
        </div>
      )}
    </article>
  );
}
