import { BookmarkPlus, MessageSquare, Rocket } from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import OpportunityCard from '../components/OpportunityCard';
import { BulletList, Disclaimer, EmptyState, ErrorState, Field, PageHeader, Section, Skeleton, Spinner, TagInput } from '../components/ui';
import { useAssistant } from '../context/AssistantContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { api, errMsg } from '../services/api';
import type { BizResult, Opportunity, Plan } from '../types';

const STAGES = [['idea', 'Just an idea'], ['validation', 'Validating'], ['launched', 'Launched'], ['growing', 'Growing']];

export default function Biz() {
  const { user } = useAuth();
  const toast = useToast();
  const { ask } = useAssistant();
  const [sp] = useSearchParams();
  const [f, setF] = useState({ idea: '', location: user?.location ?? '', fundingNeed: '', stage: 'idea', skills: user?.skills ?? [] });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [plan, setPlan] = useState<Plan<BizResult> | null>(null);
  const [res, setRes] = useState<Opportunity[] | null>(null);
  const planId = sp.get('plan');

  useEffect(() => {
    if (!planId) return;
    api.get(`/career/plans/${planId}`).then(({ data }) => { if (data.plan.kind === 'business') { setPlan(data.plan); setRes(null); } }).catch((e) => toast.error(errMsg(e)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planId]);

  async function go(e: FormEvent) {
    e.preventDefault();
    if (f.idea.trim().length < 10) return setErr('Please describe your business idea in a sentence or two.');
    setBusy(true); setErr(''); setPlan(null);
    try { const { data } = await api.post('/biz/analyze', { ...f, location: f.location || undefined, fundingNeed: f.fundingNeed || undefined }); setPlan(data.plan); setRes(data.resources); }
    catch (e2) { setErr(errMsg(e2, "We couldn't build your startup plan right now. Please try again.")); } finally { setBusy(false); }
  }
  async function toggle(key: string) {
    if (!plan) return;
    const checked = plan.checked.includes(key) ? plan.checked.filter((x) => x !== key) : [...plan.checked, key];
    setPlan({ ...plan, checked });
    try { await api.patch(`/career/plans/${plan.id}/checked`, { checked }); } catch (e) { toast.error(errMsg(e)); }
  }
  async function save() {
    if (!plan) return;
    try { await api.post('/saved', { itemType: 'careerPlan', itemId: plan.id }); toast.success('Plan saved.'); } catch (e) { toast.error(errMsg(e)); }
  }
  const total = plan?.result.checklist.reduce((n, c) => n + c.items.length, 0) ?? 0;

  return (
    <div>
      <PageHeader title="HerBiz" subtitle="Turn an idea into a checklist and find potentially relevant funding, training and mentorship." crumbs={['Business', 'HerBiz']} />
      <form onSubmit={go} className="card space-y-4">
        <Field label="Your business idea">{(id) => <textarea id={id} rows={3} maxLength={1500} className="input" placeholder="e.g. A home-based bakery selling healthy snacks to offices" value={f.idea} onChange={(e) => setF({ ...f, idea: e.target.value })} />}</Field>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Location">{(id) => <input id={id} className="input" value={f.location} onChange={(e) => setF({ ...f, location: e.target.value })} />}</Field>
          <Field label="Approx. funding need" hint="e.g. ₹2 lakh">{(id) => <input id={id} className="input" value={f.fundingNeed} onChange={(e) => setF({ ...f, fundingNeed: e.target.value })} />}</Field>
          <Field label="Stage">{(id) => <select id={id} className="input" value={f.stage} onChange={(e) => setF({ ...f, stage: e.target.value })}>{STAGES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>}</Field>
        </div>
        <Field label="Your skills">{(id) => <TagInput id={id} value={f.skills} onChange={(v) => setF({ ...f, skills: v })} placeholder="e.g. Cooking, Marketing" />}</Field>
        {err && <ErrorState message={err} />}
        <button className="btn-primary" disabled={busy}>{busy ? <Spinner /> : <Rocket className="h-4 w-4" />} Build my startup plan</button>
      </form>

      {busy && <div className="mt-6 space-y-3"><Skeleton className="h-24" /><Skeleton className="h-48" /></div>}
      {plan && !busy && (
        <div className="mt-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-xl font-semibold text-white">Startup checklist</h2>
            <div className="flex gap-2"><button className="btn-ghost btn-sm" onClick={save}><BookmarkPlus className="h-4 w-4" /> Save</button><button className="btn-ghost btn-sm" onClick={() => ask({ prompt: 'What should I research before registering a business?', contextId: plan.id })}><MessageSquare className="h-4 w-4" /> Ask HerGuide</button></div></div>
          <div className="card"><p className="text-sm text-zinc-300">{plan.result.summary}</p><p className="meta mt-2">{plan.checked.length} of {total} items done</p></div>
          <div className="grid gap-4 md:grid-cols-2">{plan.result.checklist.map((c) => (
            <div key={c.title} className="card"><h3 className="h-card mb-3">{c.title}</h3>
              {c.items.length === 0 ? <p className="text-sm text-zinc-500">No items suggested.</p> : <ul className="space-y-2">{c.items.map((it, i) => { const k = `${c.title}:${i}`; const on = plan.checked.includes(k); return (
                <li key={k}><label className="flex cursor-pointer gap-2.5 text-sm"><input type="checkbox" className="mt-0.5 h-4 w-4 shrink-0 accent-violet-500" checked={on} onChange={() => toggle(k)} /><span className={on ? 'text-zinc-500 line-through' : 'text-zinc-300'}>{it}</span></label></li>); })}</ul>}</div>))}</div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="card"><Section title="Questions to research or verify"><BulletList items={plan.result.questionsToResearch} /></Section></div>
            {plan.result.risksToConsider.length > 0 && <div className="card"><Section title="Assumptions to test"><BulletList items={plan.result.risksToConsider} /></Section></div>}
          </div>
          <section>
            <h2 className="h-card mb-1">Potentially relevant resources</h2>
            <p className="meta mb-3">From our database. HerGuide has not verified your eligibility for any scheme; check each official source.</p>
            {res === null ? <p className="text-sm text-zinc-400">Browse <Link to="/opportunities?category=entrepreneurship" className="text-violet-300 underline">entrepreneurship opportunities</Link>.</p>
              : res.length === 0 ? <EmptyState icon={Rocket} title="No resources in the database yet" text="Funding and training resources will appear here once added." />
              : <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{res.map((o) => <Link key={o.id} to={`/opportunities?open=${o.id}`}><OpportunityCard o={o} onOpen={() => {}} /></Link>)}</div>}
          </section>
        </div>
      )}
      <Disclaimer className="mt-8" />
    </div>
  );
}
