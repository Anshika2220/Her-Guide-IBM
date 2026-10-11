import { Pencil, Plus, Trash2 } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { ChipSelect, ConfirmDialog, EmptyState, ErrorState, Field, Modal, PageHeader, Skeleton, Spinner, TagInput, cx } from '../components/ui';
import { useToast } from '../context/ToastContext';
import { useApi, useDebounced } from '../hooks/useApi';
import { api, errMsg } from '../services/api';
import { EDUCATION, MODES, OPP_CATEGORIES, SUPPORT_CATEGORIES } from '../utils/constants';
import { fmtDate, toInputDate } from '../utils/format';

type Row = Record<string, any> & { id: string };
const RES_TYPES = ['helpline', 'government', 'ngo', 'legal', 'online_portal'];
const RES_CATS = [...Object.keys(SUPPORT_CATEGORIES), 'emergency'];

const blankOpp = { title: '', organization: '', description: '', category: 'scholarship', location: 'India', mode: 'onsite', summary: '', educationLevels: [] as string[], minExperienceYears: '', maxExperienceYears: '', skills: [] as string[], locations: [] as string[], deadline: '', requiredDocuments: [] as string[], applicationUrl: '', sourceUrl: '', tags: [] as string[], verified: false, active: true };
const blankRes = { name: '', categories: ['general'] as string[], description: '', location: 'India', phone: '', website: '', sourceUrl: '', type: 'ngo', availability: '', verified: false };

function oppToForm(o: Row) {
  const e = o.eligibility ?? {};
  return { ...blankOpp, ...o, summary: e.summary ?? '', educationLevels: e.educationLevels ?? [], minExperienceYears: e.minExperienceYears?.toString() ?? '', maxExperienceYears: e.maxExperienceYears?.toString() ?? '', skills: e.skills ?? [], locations: e.locations ?? [], deadline: toInputDate(o.deadline), applicationUrl: o.applicationUrl ?? '', sourceUrl: o.sourceUrl ?? '' };
}
const formToOpp = (f: typeof blankOpp) => ({
  title: f.title, organization: f.organization, description: f.description, category: f.category, location: f.location, mode: f.mode,
  eligibility: { summary: f.summary, educationLevels: f.educationLevels, minExperienceYears: f.minExperienceYears, maxExperienceYears: f.maxExperienceYears, skills: f.skills, locations: f.locations },
  deadline: f.deadline, requiredDocuments: f.requiredDocuments, applicationUrl: f.applicationUrl, sourceUrl: f.sourceUrl, tags: f.tags, verified: f.verified, active: f.active,
});

function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return <label className="flex cursor-pointer items-center gap-2 text-sm"><input type="checkbox" className="accent-violet-500" checked={checked} onChange={(e) => onChange(e.target.checked)} />{label}</label>;
}

function Manager({ kind }: { kind: 'opportunities' | 'resources' }) {
  const toast = useToast();
  const [text, setText] = useState('');
  const q = useDebounced(text, 300);
  const { data, loading, error, reload } = useApi<{ items: Row[] }>(`/admin/${kind}`, { q: q || undefined });
  const isOpp = kind === 'opportunities';
  const [edit, setEdit] = useState<Row | 'new' | null>(null);
  const [o, setO] = useState(blankOpp);
  const [r, setR] = useState(blankRes);
  const [busy, setBusy] = useState(false);
  const [del, setDel] = useState<Row | null>(null);

  const open = (row: Row | 'new') => {
    setEdit(row);
    if (isOpp) setO(row === 'new' ? blankOpp : oppToForm(row));
    else setR(row === 'new' ? blankRes : { ...blankRes, ...row, phone: row.phone ?? '', website: row.website ?? '', sourceUrl: row.sourceUrl ?? '', availability: row.availability ?? '' });
  };
  async function save(e: FormEvent) {
    e.preventDefault(); setBusy(true);
    const body = isOpp ? formToOpp(o) : { ...r, phone: r.phone || undefined, availability: r.availability || undefined };
    try {
      if (edit === 'new') await api.post(`/admin/${kind}`, body); else if (edit) await api.put(`/admin/${kind}/${edit.id}`, body);
      toast.success('Saved.'); setEdit(null); reload();
    } catch (er) { toast.error(errMsg(er)); } finally { setBusy(false); }
  }
  async function remove() {
    if (!del) return;
    try { await api.delete(`/admin/${kind}/${del.id}`); toast.success('Deleted.'); setDel(null); reload(); } catch (er) { toast.error(errMsg(er)); }
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-3">
        <input aria-label="Search" className="input max-w-xs" placeholder="Search…" value={text} onChange={(e) => setText(e.target.value)} />
        <button className="btn-primary ml-auto" onClick={() => open('new')}><Plus className="h-4 w-4" /> Add {isOpp ? 'opportunity' : 'resource'}</button>
      </div>
      {error && <ErrorState message={error} onRetry={reload} />}
      {loading && !data && <Skeleton className="h-40" />}
      {data && data.items.length === 0 && <EmptyState title="Nothing here yet" />}
      <ul className="space-y-2">{data?.items.map((x) => (
        <li key={x.id} className="card flex flex-wrap items-center justify-between gap-3 py-3">
          <div className="min-w-0"><p className="font-medium text-white">{isOpp ? x.title : x.name}</p>
            <p className="meta">{isOpp ? `${x.organization} · ${OPP_CATEGORIES[x.category]}` : (x.categories as string[]).join(', ')} · {x.verified ? 'verified' : 'unverified'}{isOpp && !x.active ? ' · inactive' : ''} · updated {fmtDate(x.updatedAt)}</p></div>
          <div className="flex gap-2"><button className="btn-ghost btn-sm" aria-label="Edit" onClick={() => open(x)}><Pencil className="h-4 w-4" /></button><button className="btn-ghost btn-sm" aria-label="Delete" onClick={() => setDel(x)}><Trash2 className="h-4 w-4" /></button></div>
        </li>))}</ul>

      <Modal wide open={!!edit} onClose={() => setEdit(null)} title={`${edit === 'new' ? 'Add' : 'Edit'} ${isOpp ? 'opportunity' : 'resource'}`}>
        <form onSubmit={save} className="space-y-4">
          {isOpp ? (<>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Title">{(id) => <input id={id} required className="input" value={o.title} onChange={(e) => setO({ ...o, title: e.target.value })} />}</Field>
              <Field label="Organisation">{(id) => <input id={id} required className="input" value={o.organization} onChange={(e) => setO({ ...o, organization: e.target.value })} />}</Field>
              <Field label="Category">{(id) => <select id={id} className="input" value={o.category} onChange={(e) => setO({ ...o, category: e.target.value })}>{Object.entries(OPP_CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>}</Field>
              <Field label="Mode">{(id) => <select id={id} className="input" value={o.mode} onChange={(e) => setO({ ...o, mode: e.target.value })}>{MODES.map((m) => <option key={m}>{m}</option>)}</select>}</Field>
              <Field label="Location">{(id) => <input id={id} className="input" value={o.location} onChange={(e) => setO({ ...o, location: e.target.value })} />}</Field>
              <Field label="Deadline (leave blank if unknown)">{(id) => <input id={id} type="date" className="input" value={o.deadline} onChange={(e) => setO({ ...o, deadline: e.target.value })} />}</Field>
            </div>
            <Field label="Description">{(id) => <textarea id={id} required rows={4} className="input" value={o.description} onChange={(e) => setO({ ...o, description: e.target.value })} />}</Field>
            <Field label="Eligibility summary">{(id) => <textarea id={id} rows={2} className="input" value={o.summary} onChange={(e) => setO({ ...o, summary: e.target.value })} />}</Field>
            <div><p className="label">Education levels (leave empty if not specified)</p><ChipSelect label="Education" options={EDUCATION} value={o.educationLevels} onChange={(v) => setO({ ...o, educationLevels: v })} /></div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Min. experience (years)">{(id) => <input id={id} type="number" min={0} className="input" value={o.minExperienceYears} onChange={(e) => setO({ ...o, minExperienceYears: e.target.value })} />}</Field>
              <Field label="Max. experience (years)">{(id) => <input id={id} type="number" min={0} className="input" value={o.maxExperienceYears} onChange={(e) => setO({ ...o, maxExperienceYears: e.target.value })} />}</Field>
            </div>
            <Field label="Required skills">{(id) => <TagInput id={id} value={o.skills} onChange={(v) => setO({ ...o, skills: v })} />}</Field>
            <Field label="Eligible locations (empty = use location)">{(id) => <TagInput id={id} value={o.locations} onChange={(v) => setO({ ...o, locations: v })} />}</Field>
            <Field label="Required documents">{(id) => <TagInput id={id} value={o.requiredDocuments} onChange={(v) => setO({ ...o, requiredDocuments: v })} />}</Field>
            <Field label="Tags">{(id) => <TagInput id={id} value={o.tags} onChange={(v) => setO({ ...o, tags: v })} />}</Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Application URL">{(id) => <input id={id} type="url" className="input" value={o.applicationUrl} onChange={(e) => setO({ ...o, applicationUrl: e.target.value })} />}</Field>
              <Field label="Source URL (where you verified it)">{(id) => <input id={id} type="url" className="input" value={o.sourceUrl} onChange={(e) => setO({ ...o, sourceUrl: e.target.value })} />}</Field>
            </div>
            <div className="flex gap-6"><Check label="Verified" checked={o.verified} onChange={(v) => setO({ ...o, verified: v })} /><Check label="Active (visible)" checked={o.active} onChange={(v) => setO({ ...o, active: v })} /></div>
          </>) : (<>
            <Field label="Name">{(id) => <input id={id} required className="input" value={r.name} onChange={(e) => setR({ ...r, name: e.target.value })} />}</Field>
            <Field label="Description">{(id) => <textarea id={id} required rows={3} className="input" value={r.description} onChange={(e) => setR({ ...r, description: e.target.value })} />}</Field>
            <div><p className="label">Categories (choose at least one)</p><ChipSelect label="Categories" options={RES_CATS} value={r.categories} onChange={(v) => setR({ ...r, categories: v })} /></div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Type">{(id) => <select id={id} className="input" value={r.type} onChange={(e) => setR({ ...r, type: e.target.value })}>{RES_TYPES.map((t) => <option key={t}>{t}</option>)}</select>}</Field>
              <Field label="Location">{(id) => <input id={id} className="input" value={r.location} onChange={(e) => setR({ ...r, location: e.target.value })} />}</Field>
              <Field label="Phone">{(id) => <input id={id} className="input" value={r.phone} onChange={(e) => setR({ ...r, phone: e.target.value })} />}</Field>
              <Field label="Availability">{(id) => <input id={id} className="input" value={r.availability} onChange={(e) => setR({ ...r, availability: e.target.value })} />}</Field>
              <Field label="Website">{(id) => <input id={id} type="url" className="input" value={r.website} onChange={(e) => setR({ ...r, website: e.target.value })} />}</Field>
              <Field label="Source URL (where you verified it)">{(id) => <input id={id} type="url" className="input" value={r.sourceUrl} onChange={(e) => setR({ ...r, sourceUrl: e.target.value })} />}</Field>
            </div>
            <Check label="Verified against the source" checked={r.verified} onChange={(v) => setR({ ...r, verified: v })} />
          </>)}
          <div className="flex justify-end gap-2"><button type="button" className="btn-ghost" onClick={() => setEdit(null)}>Cancel</button><button className="btn-primary" disabled={busy || (!isOpp && r.categories.length === 0)}>{busy && <Spinner />} Save</button></div>
        </form>
      </Modal>
      <ConfirmDialog open={!!del} danger title="Delete permanently?" message={`"${del ? (del.title ?? del.name) : ''}" will be removed for all users.`} confirmLabel="Delete" onCancel={() => setDel(null)} onConfirm={remove} />
    </div>
  );
}

function Overview() {
  const { data, error, reload } = useApi<Record<string, number>>('/admin/stats');
  const cats = useApi<{ opportunityCategories: string[]; supportCategories: string[]; resourceTypes: string[] }>('/admin/categories');
  if (error) return <ErrorState message={error} onRetry={reload} />;
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{data ? Object.entries(data).map(([k, v]) => <div key={k} className="card"><p className="text-2xl font-semibold text-white">{v}</p><p className="meta capitalize">{k}</p></div>) : [0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-20" />)}</div>
      <div className="card"><h3 className="h-card">Categories</h3><p className="meta mb-3">Categories are defined in code because they drive matching and AI prompts, so they're read-only here.</p>
        {cats.data && <div className="space-y-3 text-sm"><p><span className="text-zinc-500">Opportunities:</span> {cats.data.opportunityCategories.join(', ')}</p><p><span className="text-zinc-500">Support:</span> {cats.data.supportCategories.join(', ')}</p><p><span className="text-zinc-500">Resource types:</span> {cats.data.resourceTypes.join(', ')}</p></div>}</div>
    </div>
  );
}

function Users() {
  const [text, setText] = useState('');
  const q = useDebounced(text, 300);
  const { data, error, reload } = useApi<{ items: Row[] }>('/admin/users', { q: q || undefined });
  return (
    <div>
      <p className="meta mb-3">High-level only. Profiles, documents, applications and saved items are not visible to admins.</p>
      <input aria-label="Search users" className="input mb-4 max-w-xs" placeholder="Search name or email…" value={text} onChange={(e) => setText(e.target.value)} />
      {error && <ErrorState message={error} onRetry={reload} />}
      <div className="card overflow-x-auto p-0"><table className="w-full text-left text-sm"><thead className="text-xs text-zinc-500"><tr><th className="p-3">Name</th><th className="p-3">Email</th><th className="p-3">Role</th><th className="p-3">Onboarded</th><th className="p-3">Joined</th></tr></thead>
        <tbody className="divide-y divide-white/5">{data?.items.map((u) => <tr key={u.id}><td className="p-3 text-white">{u.name}</td><td className="p-3">{u.email}</td><td className="p-3">{u.role}</td><td className="p-3">{u.onboardingComplete ? 'Yes' : 'No'}</td><td className="p-3">{fmtDate(u.createdAt)}</td></tr>)}</tbody></table></div>
    </div>
  );
}

export default function Admin() {
  const [tab, setTab] = useState('overview');
  const tabs = [['overview', 'Overview'], ['opportunities', 'Opportunities'], ['resources', 'Support resources'], ['users', 'Users']];
  return (
    <div>
      <PageHeader title="Admin" subtitle="Manage the data that powers matching and support guidance. Mark records verified only after checking the source." />
      <div role="tablist" className="mb-6 flex flex-wrap gap-2">{tabs.map(([v, l]) => <button key={v} role="tab" aria-selected={tab === v} onClick={() => setTab(v)} className={cx('rounded-full border px-4 py-1.5 text-sm', tab === v ? 'border-violet-400/60 bg-violet-400/15 text-white' : 'border-white/10 text-zinc-400 hover:bg-white/5')}>{l}</button>)}</div>
      {tab === 'overview' && <Overview />}
      {tab === 'opportunities' && <Manager kind="opportunities" />}
      {tab === 'resources' && <Manager kind="resources" />}
      {tab === 'users' && <Users />}
    </div>
  );
}
