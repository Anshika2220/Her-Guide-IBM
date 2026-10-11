import { Bookmark, Phone, Search } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ConfirmDialog, EmptyState, ErrorState, ExtLink, PageHeader, Skeleton, cx } from '../components/ui';
import { useToast } from '../context/ToastContext';
import { useApi, useDebounced } from '../hooks/useApi';
import { api, errMsg } from '../services/api';
import type { SavedItem } from '../types';
import { fmtDate, telHref } from '../utils/format';

const TABS = [['', 'All'], ['opportunity', 'Opportunities'], ['resource', 'Resources'], ['careerPlan', 'Plans'], ['document', 'Documents'], ['guidance', 'Guidance']];

export default function Saved() {
  const toast = useToast();
  const [type, setType] = useState('');
  const [text, setText] = useState('');
  const q = useDebounced(text, 300);
  const { data, loading, error, reload } = useApi<{ items: SavedItem[] }>('/saved', { type: type || undefined, q: q || undefined });
  const [rm, setRm] = useState<SavedItem | null>(null);
  const [open, setOpen] = useState<string | null>(null);

  async function remove() {
    if (!rm) return;
    try { await api.delete(`/saved/${rm.id}`); toast.success('Removed from saved.'); setRm(null); reload(); }
    catch (e) { toast.error(errMsg(e)); }
  }
  return (
    <div>
      <PageHeader title="Saved" subtitle="Everything you've kept, in one place." crumbs={['Opportunities', 'Saved']} />
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div role="tablist" className="flex flex-wrap gap-2">
          {TABS.map(([v, l]) => <button key={v} role="tab" aria-selected={type === v} onClick={() => setType(v)} className={cx('rounded-full border px-3.5 py-1.5 text-sm', type === v ? 'border-violet-400/60 bg-violet-400/15 text-white' : 'border-white/10 text-zinc-400 hover:bg-white/5')}>{l}</button>)}
        </div>
        <div className="relative ml-auto w-full sm:w-64"><Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-zinc-500" /><input aria-label="Search saved" className="input pl-9" placeholder="Search saved…" value={text} onChange={(e) => setText(e.target.value)} /></div>
      </div>
      {error && <ErrorState message={error} onRetry={reload} />}
      {loading && !data && <div className="space-y-3"><Skeleton className="h-20" /><Skeleton className="h-20" /></div>}
      {data && data.items.length === 0 && <EmptyState icon={Bookmark} title="Nothing saved yet" text="Save opportunities, resources, plans and results as you explore." action={<Link to="/opportunities" className="btn-primary btn-sm">Explore opportunities</Link>} />}
      <ul className="space-y-3">
        {data?.items.map((s) => (
          <li key={s.id} className="card">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="meta capitalize">{s.subtitle}</p>
                {s.link ? <Link to={s.link} className="font-medium text-white hover:text-violet-200">{s.title}</Link> : <p className="font-medium text-white">{s.title}</p>}
                <p className="meta mt-0.5">Saved {fmtDate(s.savedAt)}</p>
              </div>
              <div className="flex gap-2">
                {(s.itemType === 'resource' || s.itemType === 'guidance') && <button className="btn-ghost btn-sm" onClick={() => setOpen(open === s.id ? null : s.id)}>{open === s.id ? 'Hide' : 'Details'}</button>}
                {s.link && <Link to={s.link} className="btn-ghost btn-sm">Open</Link>}
                <button className="btn-ghost btn-sm" onClick={() => setRm(s)}>Unsave</button>
              </div>
            </div>
            {open === s.id && s.itemType === 'resource' && (
              <div className="mt-3 space-y-2 border-t border-white/10 pt-3 text-sm text-zinc-300"><p>{s.data?.description}</p>
                <div className="flex gap-3">{s.data?.phone && <a className="btn-primary btn-sm" href={telHref(s.data.phone)}><Phone className="h-3.5 w-3.5" />{s.data.phone}</a>}<ExtLink href={s.data?.website} className="btn-ghost btn-sm">Website</ExtLink></div></div>
            )}
            {open === s.id && s.itemType === 'guidance' && s.data?.guidance && (
              <div className="mt-3 space-y-3 border-t border-white/10 pt-3 text-sm text-zinc-300">
                <p>{s.data.guidance.whatYouDescribed}</p>
                <ol className="list-decimal space-y-1 pl-5">{s.data.guidance.nextSteps.map((n: string, i: number) => <li key={i}>{n}</li>)}</ol>
              </div>
            )}
          </li>
        ))}
      </ul>
      <ConfirmDialog open={!!rm} title="Remove from saved?" message={`"${rm?.title ?? ''}" will be removed from your saved items.`} confirmLabel="Remove" onCancel={() => setRm(null)} onConfirm={remove} />
    </div>
  );
}
