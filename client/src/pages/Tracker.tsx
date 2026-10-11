import { CalendarClock, ExternalLink, KanbanSquare, Pencil, Plus, Trash2 } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { ConfirmDialog, EmptyState, ErrorState, Field, Modal, PageHeader, Skeleton, Spinner, cx } from '../components/ui';
import { useToast } from '../context/ToastContext';
import { useApi } from '../hooks/useApi';
import { api, errMsg } from '../services/api';
import type { Application } from '../types';
import { STATUSES, statusLabel } from '../utils/constants';
import { daysUntil, fmtDate, isHttp, toInputDate } from '../utils/format';

const blank = { title: '', organization: '', status: 'interested', notes: '', appliedDate: '', deadline: '', applicationUrl: '' };

export default function Tracker() {
  const toast = useToast();
  const { data, loading, error, reload } = useApi<{ items: Application[] }>('/applications');
  const [filter, setFilter] = useState('');
  const [edit, setEdit] = useState<Application | 'new' | null>(null);
  const [f, setF] = useState(blank);
  const [busy, setBusy] = useState(false);
  const [del, setDel] = useState<Application | null>(null);

  const openEdit = (a: Application | 'new') => {
    setEdit(a);
    setF(a === 'new' ? blank : { title: a.title, organization: a.organization ?? '', status: a.status, notes: a.notes ?? '', appliedDate: toInputDate(a.appliedDate), deadline: toInputDate(a.deadline), applicationUrl: a.applicationUrl ?? '' });
  };
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!f.title.trim()) return toast.error('Please give this entry a title.');
    if (f.applicationUrl && !isHttp(f.applicationUrl)) return toast.error('The link must start with http:// or https://');
    setBusy(true);
    try {
      if (edit === 'new') await api.post('/applications', f); else if (edit) await api.put(`/applications/${edit.id}`, f);
      toast.success('Saved.'); setEdit(null); reload();
    } catch (er) { toast.error(errMsg(er)); } finally { setBusy(false); }
  }
  async function quickStatus(a: Application, status: string) {
    try { await api.put(`/applications/${a.id}`, { status }); reload(); } catch (er) { toast.error(errMsg(er)); }
  }
  async function remove() {
    if (!del) return;
    try { await api.delete(`/applications/${del.id}`); toast.success('Removed.'); setDel(null); reload(); } catch (er) { toast.error(errMsg(er)); }
  }
  const items = (data?.items ?? []).filter((a) => !filter || a.status === filter);
  const count = (s: string) => data?.items.filter((a) => a.status === s).length ?? 0;

  return (
    <div>
      <PageHeader title="Application tracker" subtitle="Keep every opportunity and its progress in one timeline." crumbs={['Tools', 'Application tracker']} actions={<button className="btn-primary" onClick={() => openEdit('new')}><Plus className="h-4 w-4" /> Add entry</button>} />
      <div className="mb-5 flex flex-wrap gap-2">
        <button onClick={() => setFilter('')} className={cx('rounded-full border px-3.5 py-1.5 text-sm', !filter ? 'border-violet-400/60 bg-violet-400/15 text-white' : 'border-white/10 text-zinc-400')}>All ({data?.items.length ?? 0})</button>
        {STATUSES.map((s) => <button key={s.value} onClick={() => setFilter(s.value)} className={cx('rounded-full border px-3.5 py-1.5 text-sm', filter === s.value ? 'border-violet-400/60 bg-violet-400/15 text-white' : 'border-white/10 text-zinc-400')}>{s.label} ({count(s.value)})</button>)}
      </div>
      {error && <ErrorState message={error} onRetry={reload} />}
      {loading && !data && <div className="space-y-3"><Skeleton className="h-28" /><Skeleton className="h-28" /></div>}
      {data && items.length === 0 && <EmptyState icon={KanbanSquare} title={filter ? 'Nothing with this status' : 'Your tracker is empty'} text="Add an opportunity from Explore, or create your own entry." action={<button className="btn-primary btn-sm" onClick={() => openEdit('new')}>Add entry</button>} />}
      <ul className="space-y-3">
        {items.map((a) => {
          const tone = STATUSES.find((s) => s.value === a.status)?.tone ?? '';
          const d = daysUntil(a.deadline);
          return (
            <li key={a.id} className="card">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="h-card">{a.title}</h3>
                  {a.organization && <p className="text-sm text-zinc-400">{a.organization}</p>}
                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-400">
                    {a.deadline && <span className={cx('inline-flex items-center gap-1', d !== null && d >= 0 && d <= 7 && 'text-amber-300')}><CalendarClock className="h-3.5 w-3.5" />Deadline {fmtDate(a.deadline)}{d !== null && d >= 0 && d <= 7 ? ` (${d}d)` : ''}</span>}
                    {a.appliedDate && <span>Applied {fmtDate(a.appliedDate)}</span>}
                    {isHttp(a.applicationUrl) && <a href={a.applicationUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-violet-300 hover:underline">Application page <ExternalLink className="h-3 w-3" /></a>}
                  </div>
                  {a.notes && <p className="mt-2 line-clamp-2 text-sm text-zinc-400">{a.notes}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <select aria-label={`Status for ${a.title}`} className={cx('rounded-full border bg-transparent px-3 py-1.5 text-xs', tone)} value={a.status} onChange={(e) => quickStatus(a, e.target.value)}>
                    {STATUSES.map((s) => <option key={s.value} value={s.value} className="bg-ink-900 text-zinc-200">{s.label}</option>)}
                  </select>
                  <button className="btn-ghost btn-sm" aria-label="Edit" onClick={() => openEdit(a)}><Pencil className="h-4 w-4" /></button>
                  <button className="btn-ghost btn-sm" aria-label="Delete" onClick={() => setDel(a)}><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
              {a.history.length > 1 && (
                <ol className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-white/10 pt-3 text-xs text-zinc-500" aria-label="Status timeline">
                  {a.history.map((h, i) => <li key={i} className="flex items-center gap-2">{i > 0 && <span>→</span>}<span className="text-zinc-300">{statusLabel(h.status)}</span><span>{fmtDate(h.at)}</span></li>)}
                </ol>
              )}
            </li>
          );
        })}
      </ul>

      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit === 'new' ? 'Add entry' : 'Edit entry'}>
        <form onSubmit={submit} className="space-y-4">
          <Field label="Title">{(id) => <input id={id} className="input" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />}</Field>
          <Field label="Organisation">{(id) => <input id={id} className="input" value={f.organization} onChange={(e) => setF({ ...f, organization: e.target.value })} />}</Field>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Status">{(id) => <select id={id} className="input" value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })}>{STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}</select>}</Field>
            <Field label="Deadline">{(id) => <input id={id} type="date" className="input" value={f.deadline} onChange={(e) => setF({ ...f, deadline: e.target.value })} />}</Field>
            <Field label="Date applied">{(id) => <input id={id} type="date" className="input" value={f.appliedDate} onChange={(e) => setF({ ...f, appliedDate: e.target.value })} />}</Field>
          </div>
          <Field label="Application URL">{(id) => <input id={id} type="url" className="input" placeholder="https://…" value={f.applicationUrl} onChange={(e) => setF({ ...f, applicationUrl: e.target.value })} />}</Field>
          <Field label="Notes">{(id) => <textarea id={id} rows={3} maxLength={3000} className="input" value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} />}</Field>
          <div className="flex justify-end gap-2"><button type="button" className="btn-ghost" onClick={() => setEdit(null)}>Cancel</button><button className="btn-primary" disabled={busy}>{busy && <Spinner />} Save</button></div>
        </form>
      </Modal>
      <ConfirmDialog open={!!del} danger title="Remove from tracker?" message={`"${del?.title ?? ''}" and its notes will be deleted.`} confirmLabel="Delete" onCancel={() => setDel(null)} onConfirm={remove} />
    </div>
  );
}
