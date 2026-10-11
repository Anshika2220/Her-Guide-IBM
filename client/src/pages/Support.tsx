import { AlertTriangle, BookmarkPlus, ClipboardList, Loader2, ShieldAlert } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { BulletList, Disclaimer, ErrorState, Field, PageHeader, Section, Spinner } from '../components/ui';
import { useAssistant } from '../context/AssistantContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { api, errMsg } from '../services/api';
import type { SupportResource } from '../types';
import { SUPPORT_CATEGORIES, URGENCY } from '../utils/constants';
import { ResourceCard } from './PublicPages';

interface Result {
  emergency: boolean; emergencyMessage?: string; guidanceUnavailable: boolean;
  guidance: { possibleCategory: string; whatYouDescribed: string; nextSteps: string[]; evidenceChecklist: string[]; thingsToConsider: string[] } | null;
  resources: SupportResource[];
}

export default function Support() {
  const { user } = useAuth();
  const toast = useToast();
  const { ask } = useAssistant();
  const [f, setF] = useState({ description: '', category: 'general', location: '', urgency: '' });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [res, setRes] = useState<Result | null>(null);
  const [saved, setSaved] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (f.description.trim().length < 10) return setErr('Please describe your situation in a little more detail.');
    setBusy(true); setErr(''); setRes(null); setSaved(false);
    try {
      const { data } = await api.post<Result>('/support/analyze', { ...f, location: f.location || undefined, urgency: f.urgency || undefined });
      setRes(data);
    } catch (e2) { setErr(errMsg(e2, "We couldn't analyze that right now. Please try again.")); }
    finally { setBusy(false); }
  }
  async function save() {
    if (!res?.guidance) return;
    try {
      await api.post('/saved', { itemType: 'guidance', title: `Guidance: ${SUPPORT_CATEGORIES[res.guidance.possibleCategory] ?? 'Support'}`, snapshot: { guidance: res.guidance, resources: res.resources.map((r) => ({ name: r.name, phone: r.phone, website: r.website })) } });
      setSaved(true); toast.success('Guidance saved.');
    } catch (e) { toast.error(errMsg(e)); }
  }
  const g = res?.guidance;
  const context = g ? `Possible category: ${g.possibleCategory}. Next steps shown: ${g.nextSteps.join(' | ')}`.slice(0, 2500) : undefined;

  return (
    <div>
      <PageHeader title="HerGuide Support" subtitle="Describe what's happening in your own words. You'll get informational guidance and verified support resources." crumbs={['Support']} />
      <div className="mb-5 rounded-xl border border-rose-400/20 bg-rose-500/[0.06] p-4 text-sm text-rose-100">
        <p className="flex gap-2 font-medium"><ShieldAlert className="h-4 w-4 shrink-0" /> In immediate danger?</p>
        <p className="mt-1 text-rose-100/80">Call local emergency services now (India: <a className="underline" href="tel:112">112</a>) or go somewhere safe. Women Helpline (India): <a className="underline" href="tel:181">181</a>.</p>
      </div>
      <Disclaimer className="mb-5" />

      <form onSubmit={submit} className="card space-y-4">
        <Field label="What's happening?" hint="You don't need to include names. Share only what you're comfortable with.">
          {(id) => <textarea id={id} rows={5} maxLength={3000} className="input" placeholder="e.g. My manager keeps making inappropriate comments at work and I don't know what I should do." value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />}
        </Field>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Category">{(id) => <select id={id} className="input" value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}>{Object.entries(SUPPORT_CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>}</Field>
          <Field label="Location (optional)">{(id) => <input id={id} className="input" placeholder={user?.location || 'City or state'} value={f.location} onChange={(e) => setF({ ...f, location: e.target.value })} />}</Field>
          <Field label="Urgency (optional)">{(id) => <select id={id} className="input" value={f.urgency} onChange={(e) => setF({ ...f, urgency: e.target.value })}>{URGENCY.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}</select>}</Field>
        </div>
        {err && <ErrorState message={err} />}
        <button className="btn-primary" disabled={busy}>{busy ? <Spinner /> : <ClipboardList className="h-4 w-4" />} Get guidance</button>
      </form>

      {busy && <p className="mt-6 flex items-center gap-2 text-sm text-zinc-400"><Loader2 className="h-4 w-4 animate-spin" /> Taking a careful look…</p>}

      {res && (
        <div className="mt-6 space-y-5">
          {res.emergency && (
            <div role="alert" className="rounded-2xl border border-rose-400/40 bg-rose-500/10 p-5 text-rose-50">
              <p className="flex items-center gap-2 text-lg font-semibold"><AlertTriangle className="h-5 w-5" /> Your safety comes first</p>
              <p className="mt-2 text-sm">{res.emergencyMessage}</p>
            </div>
          )}
          {res.guidanceUnavailable && <ErrorState message="We couldn't generate guidance right now, but the resources below may help." />}
          {g && (
            <div className="card space-y-5">
              <Section title="What you described"><p className="text-sm text-zinc-300">{g.whatYouDescribed}</p><p className="meta mt-1">Possible category: {SUPPORT_CATEGORIES[g.possibleCategory] ?? g.possibleCategory} (not a legal determination)</p></Section>
              <Section title="Possible next steps"><ol className="space-y-2 text-sm text-zinc-300">{g.nextSteps.map((s, i) => <li key={i} className="flex gap-3"><span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-violet-400/15 text-xs text-violet-200">{i + 1}</span>{s}</li>)}</ol></Section>
              <Section title="Evidence checklist"><BulletList items={g.evidenceChecklist} /></Section>
              {g.thingsToConsider.length > 0 && <Section title="Things to consider"><BulletList items={g.thingsToConsider} /></Section>}
              <div className="flex flex-wrap gap-2 border-t border-white/10 pt-4">
                <button className="btn-ghost btn-sm" onClick={save} disabled={saved}><BookmarkPlus className="h-4 w-4" />{saved ? 'Saved' : 'Save this guidance'}</button>
                <button className="btn-ghost btn-sm" onClick={() => ask({ prompt: 'What information should I document?', context })}>Ask a follow-up</button>
              </div>
            </div>
          )}
          <section>
            <h2 className="h-card mb-3">Support resources</h2>
            {res.resources.length === 0 ? <p className="text-sm text-zinc-400">No matching resources are in our database yet. Please check official government and local sources.</p> : (
              <div className="grid gap-4 md:grid-cols-2">{res.resources.map((r) => <ResourceCard key={r.id} r={r} />)}</div>
            )}
            <p className="meta mt-3">Resources come from the HerGuide database, not from AI. Please confirm details on the official source before relying on them.</p>
          </section>
          <Disclaimer />
        </div>
      )}
    </div>
  );
}
