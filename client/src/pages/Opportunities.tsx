import { AlertTriangle, Bookmark, BookmarkCheck, Check, Compass, HelpCircle, MessageSquare, Plus, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import OpportunityCard, { DeadlineText } from '../components/OpportunityCard';
import { BulletList, EmptyState, ErrorState, ExtLink, MatchBadge, Modal, PageHeader, Section, Skeleton, Spinner } from '../components/ui';
import { useAssistant } from '../context/AssistantContext';
import { useToast } from '../context/ToastContext';
import { useApi, useDebounced } from '../hooks/useApi';
import { api, errMsg } from '../services/api';
import type { MatchDetail, Opportunity } from '../types';
import { EDUCATION, MODES, OPP_CATEGORIES } from '../utils/constants';

interface ListRes { items: Opportunity[]; total: number; page: number; pages: number }
interface Detail { opportunity: Opportunity; match: MatchDetail; saved: boolean; application: { id: string; status: string } | null }

const init = { q: '', category: '', mode: '', education: '', location: '', experience: '', deadline: 'open', sort: 'match', saved: false };

function DetailModal({ id, onClose, onChanged }: { id: string; onClose: () => void; onChanged: () => void }) {
  const toast = useToast();
  const { ask } = useAssistant();
  const { data, loading, error, reload } = useApi<Detail>(`/opportunities/${id}`);
  const [busy, setBusy] = useState(false);
  const o = data?.opportunity;
  const m = data?.match;

  async function toggleSave() {
    if (!data) return;
    setBusy(true);
    try {
      if (data.saved) await api.delete(`/opportunities/${id}/save`); else await api.post(`/opportunities/${id}/save`);
      await reload(); onChanged(); toast.success(data.saved ? 'Removed from saved.' : 'Saved.');
    } catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  }
  async function track() {
    setBusy(true);
    try { await api.post('/applications', { opportunityId: id }); await reload(); onChanged(); toast.success('Added to your tracker.'); }
    catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  }
  const el = o?.eligibility;

  return (
    <Modal open onClose={onClose} title={o?.title ?? 'Opportunity'} wide>
      {loading && !data && <div className="space-y-3"><Skeleton className="h-8" /><Skeleton className="h-40" /></div>}
      {error && <ErrorState message={error} onRetry={reload} />}
      {o && m && (
        <div className="space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div><p className="text-sm text-zinc-300">{o.organization}</p><div className="mt-2 flex flex-wrap gap-2"><span className="badge">{OPP_CATEGORIES[o.category]}</span><span className="badge">{o.mode === 'remote' ? 'Remote' : o.location}</span>{!o.verified && <span className="badge border-amber-400/20 text-amber-200" title="Not yet verified by HerGuide">Verify details</span>}</div></div>
            <MatchBadge match={m} />
          </div>
          <p className="whitespace-pre-line text-sm text-zinc-300">{o.description}</p>

          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <h3 className="mb-1 text-sm font-semibold text-white">Why this may match you</h3>
            <p className="meta mb-3">Potentially relevant based on the information provided. This is not a confirmation of eligibility.</p>
            {m.matches.length > 0 && <ul className="space-y-1.5 text-sm text-emerald-200">{m.matches.map((t) => <li key={t} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0" />{t}</li>)}</ul>}
            {m.mismatches.length > 0 && <><p className="mb-1 mt-3 text-xs font-medium uppercase tracking-wide text-amber-300">Possible mismatch</p><ul className="space-y-1.5 text-sm text-amber-200">{m.mismatches.map((t) => <li key={t} className="flex gap-2"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />{t}</li>)}</ul></>}
            {m.unknowns.length > 0 && <><p className="mb-1 mt-3 text-xs font-medium uppercase tracking-wide text-zinc-400">Couldn't check</p><ul className="space-y-1.5 text-sm text-zinc-400">{m.unknowns.map((t) => <li key={t} className="flex gap-2"><HelpCircle className="mt-0.5 h-4 w-4 shrink-0" />{t}</li>)}</ul></>}
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <Section title="Eligibility">
              <p className="text-sm text-zinc-300">{el?.summary || 'Not specified. Check the official source.'}</p>
              <ul className="mt-2 space-y-1 text-sm text-zinc-400">
                {el?.educationLevels?.length ? <li>Education: {el.educationLevels.join(', ')}</li> : null}
                {el?.minExperienceYears != null ? <li>Minimum experience: {el.minExperienceYears} years</li> : null}
                {el?.skills?.length ? <li>Skills: {el.skills.join(', ')}</li> : null}
              </ul>
            </Section>
            <Section title="Required documents">{o.requiredDocuments.length ? <BulletList items={o.requiredDocuments} /> : <p className="text-sm text-zinc-400">Not specified. Check the official source.</p>}</Section>
          </div>
          <div className="flex flex-wrap items-center gap-4"><DeadlineText deadline={o.deadline} />{o.tags.map((t) => <span key={t} className="badge">{t}</span>)}</div>
          <p className="meta">Updated {new Date(o.updatedAt).toLocaleDateString('en-IN')}</p>

          <div className="flex flex-wrap gap-2 border-t border-white/10 pt-4">
            <ExtLink href={o.applicationUrl} className="btn-primary">Official page</ExtLink>
            <button className="btn-ghost" onClick={toggleSave} disabled={busy}>{data.saved ? <BookmarkCheck className="h-4 w-4 text-violet-300" /> : <Bookmark className="h-4 w-4" />}{data.saved ? 'Saved' : 'Save'}</button>
            {data.application ? <Link to="/tracker" className="btn-ghost">In tracker ({data.application.status.replace('_', ' ')})</Link> : <button className="btn-ghost" onClick={track} disabled={busy}><Plus className="h-4 w-4" /> Add to tracker</button>}
            <button className="btn-ghost" onClick={() => { onClose(); ask({ prompt: 'Help me understand why this opportunity matches my profile.', contextId: id }); }}><MessageSquare className="h-4 w-4" /> Ask HerGuide</button>
          </div>
        </div>
      )}
    </Modal>
  );
}

export default function Opportunities() {
  const toast = useToast();
  const [sp, setSp] = useSearchParams();
  const [f, setF] = useState(init);
  const [page, setPage] = useState(1);
  const q = useDebounced(f.q, 350);
  const loc = useDebounced(f.location, 350);
  const params = { ...f, q, location: loc, saved: f.saved ? 'true' : undefined, page, limit: 12 };
  const { data, loading, error, reload, setData } = useApi<ListRes>('/opportunities', params);
  const open = sp.get('open');

  useEffect(() => { setPage(1); }, [q, loc, f.category, f.mode, f.education, f.experience, f.deadline, f.sort, f.saved]);
  const set = (k: keyof typeof init, v: string | boolean) => setF((s) => ({ ...s, [k]: v }));

  async function save(o: Opportunity) {
    try {
      if (o.saved) await api.delete(`/opportunities/${o.id}/save`); else await api.post(`/opportunities/${o.id}/save`);
      setData((d) => d && { ...d, items: d.items.map((x) => (x.id === o.id ? { ...x, saved: !o.saved } : x)) });
      toast.success(o.saved ? 'Removed from saved.' : 'Saved.');
    } catch (e) { toast.error(errMsg(e)); }
  }
  async function track(o: Opportunity) {
    try { await api.post('/applications', { opportunityId: o.id }); setData((d) => d && { ...d, items: d.items.map((x) => (x.id === o.id ? { ...x, tracked: true } : x)) }); toast.success('Added to your tracker.'); }
    catch (e) { toast.error(errMsg(e)); }
  }
  const closeDetail = () => { sp.delete('open'); setSp(sp, { replace: true }); };

  return (
    <div>
      <PageHeader title="Explore opportunities" subtitle="Scholarships, internships, jobs, programmes and more, ranked by how well they fit your profile." crumbs={['Opportunities', 'Explore']} />
      <div className="card mb-6 space-y-3">
        <div className="relative"><Search className="pointer-events-none absolute left-3.5 top-3 h-4 w-4 text-zinc-500" /><input aria-label="Search opportunities" className="input pl-10" placeholder="Search by title, organisation or topic…" value={f.q} onChange={(e) => set('q', e.target.value)} /></div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <select aria-label="Category" className="input" value={f.category} onChange={(e) => set('category', e.target.value)}><option value="">All categories</option>{Object.entries(OPP_CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
          <select aria-label="Education" className="input" value={f.education} onChange={(e) => set('education', e.target.value)}><option value="">Any education</option>{EDUCATION.map((x) => <option key={x}>{x}</option>)}</select>
          <select aria-label="Mode" className="input" value={f.mode} onChange={(e) => set('mode', e.target.value)}><option value="">Remote / on-site</option>{MODES.map((m) => <option key={m} value={m} className="capitalize">{m}</option>)}</select>
          <input aria-label="Location" className="input" placeholder="Location" value={f.location} onChange={(e) => set('location', e.target.value)} />
          <input aria-label="Years of experience" type="number" min={0} className="input" placeholder="Your years of experience" value={f.experience} onChange={(e) => set('experience', e.target.value)} />
          <select aria-label="Deadline" className="input" value={f.deadline} onChange={(e) => set('deadline', e.target.value)}><option value="open">Open now</option><option value="week">Closing within 7 days</option><option value="month">Closing within 30 days</option><option value="all">Include closed</option></select>
          <select aria-label="Sort" className="input" value={f.sort} onChange={(e) => set('sort', e.target.value)}><option value="match">Best match</option><option value="deadline">Soonest deadline</option><option value="new">Newest</option></select>
          <label className="input flex cursor-pointer items-center gap-2"><input type="checkbox" className="accent-violet-500" checked={f.saved} onChange={(e) => set('saved', e.target.checked)} /> Saved only</label>
        </div>
      </div>

      {error && <ErrorState message={error} onRetry={reload} />}
      {loading && !data && <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-64" />)}</div>}
      {data && data.items.length === 0 && <EmptyState icon={Compass} title="No opportunities found" text="Try removing a filter or searching for something broader." action={<button className="btn-ghost btn-sm" onClick={() => setF(init)}>Clear filters</button>} />}
      {data && data.items.length > 0 && (<>
        <p className="meta mb-3 flex items-center gap-2">{data.total} result{data.total === 1 ? '' : 's'} {loading && <Spinner className="h-3 w-3" />}</p>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {data.items.map((o) => <OpportunityCard key={o.id} o={o} onOpen={() => { sp.set('open', o.id); setSp(sp); }} onSave={() => save(o)} onTrack={() => track(o)} />)}
        </div>
        {data.pages > 1 && (
          <div className="mt-6 flex items-center justify-center gap-3">
            <button className="btn-ghost btn-sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
            <span className="meta">Page {data.page} of {data.pages}</span>
            <button className="btn-ghost btn-sm" disabled={page >= data.pages} onClick={() => setPage(page + 1)}>Next</button>
          </div>
        )}
      </>)}
      <p className="meta mt-8">Match scores are estimates from your profile, not a guarantee of eligibility. Always confirm details on the official source.</p>
      {open && <DetailModal id={open} onClose={closeDetail} onChanged={reload} />}
    </div>
  );
}
