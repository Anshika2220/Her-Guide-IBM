import { BookmarkPlus, Copy, Lightbulb, MessageSquare, Sparkles, Trash2 } from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import OpportunityCard from '../components/OpportunityCard';
import { BulletList, ConfirmDialog, Disclaimer, EmptyState, ErrorState, Field, PageHeader, ProgressBar, Section, Skeleton, Spinner, TagInput, cx } from '../components/ui';
import { useAssistant } from '../context/AssistantContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useApi } from '../hooks/useApi';
import { api, errMsg } from '../services/api';
import type { CareerResult, Opportunity, Plan, PlanSummary } from '../types';
import { fmtDate } from '../utils/format';

const PRI: Record<string, string> = { high: 'border-rose-400/30 bg-rose-400/10 text-rose-200', medium: 'border-amber-400/30 bg-amber-400/10 text-amber-200', low: 'border-white/10 bg-white/5 text-zinc-300' };
const REASONS = ['', 'Caregiving', 'Health', 'Relocation', 'Further study', 'Other'];

function PlanView({ plan, opportunities, onChecked }: { plan: Plan<CareerResult>; opportunities: Opportunity[] | null; onChecked: (c: string[]) => void }) {
  const r = plan.result;
  const toggle = (k: string) => onChecked(plan.checked.includes(k) ? plan.checked.filter((x) => x !== k) : [...plan.checked, k]);
  return (
    <div className="space-y-5">
      <div className="card">
        <div className="mb-2 flex items-center justify-between"><h2 className="h-card">Skill readiness for this role</h2><span className="text-lg font-semibold text-white">{plan.readiness != null ? `${plan.readiness}%` : '—'}</span></div>
        <ProgressBar value={plan.readiness ?? 0} label="Skill readiness" />
        <p className="meta mt-2">Calculated from the skills you listed vs. skills suggested for the role. It is a guide, not an assessment.</p>
        {r.summary && <p className="mt-3 text-sm text-zinc-300">{r.summary}</p>}
      </div>
      <div className="grid gap-5 md:grid-cols-2">
        <div className="card"><Section title="Skills you already have">{r.existingSkills.length ? <div className="flex flex-wrap gap-2">{r.existingSkills.map((s) => <span key={s} className="badge border-emerald-400/20 bg-emerald-400/10 text-emerald-200">{s}</span>)}</div> : <p className="text-sm text-zinc-400">None of your listed skills were matched to this role yet.</p>}</Section>
          {r.skillsToRefresh.length > 0 && <Section title="Worth refreshing" className="mt-4"><BulletList items={r.skillsToRefresh} /></Section>}</div>
        <div className="card"><Section title="Skills to build (by priority)"><ul className="space-y-2.5">{[...r.missingSkills].sort((a, b) => 'hml'.indexOf(a.priority[0]) - 'hml'.indexOf(b.priority[0])).map((m) => (
          <li key={m.skill}><span className={cx('badge mr-2 capitalize', PRI[m.priority])}>{m.priority}</span><span className="text-sm font-medium text-white">{m.skill}</span><p className="mt-0.5 pl-0.5 text-sm text-zinc-400">{m.why}</p></li>))}</ul></Section></div>
      </div>
      <div className="card"><Section title="Learning roadmap"><ol className="space-y-3">{r.roadmap.map((w) => {
        const k = `week-${w.week}`; const on = plan.checked.includes(k);
        return (<li key={k} className="flex gap-3"><input type="checkbox" aria-label={`Mark week ${w.week} done`} className="mt-1 h-4 w-4 accent-violet-500" checked={on} onChange={() => toggle(k)} />
          <div className={on ? 'opacity-60' : ''}><p className="text-sm font-medium text-white">Week {w.week} · {w.title}</p><ul className="mt-1 list-disc pl-5 text-sm text-zinc-400">{w.focus.map((x, i) => <li key={i}>{x}</li>)}</ul>{w.outcome && <p className="meta mt-1">Outcome: {w.outcome}</p>}</div></li>);
      })}</ol></Section></div>
      <div className="grid gap-5 md:grid-cols-2">
        {r.portfolioIdeas.length > 0 && <div className="card"><Section title="Portfolio ideas"><BulletList items={r.portfolioIdeas} /></Section></div>}
        {r.interviewPrep.length > 0 && <div className="card"><Section title="Interview preparation"><BulletList items={r.interviewPrep} /></Section></div>}
        {r.opportunityTypes.length > 0 && <div className="card"><Section title="Suitable opportunity types"><BulletList items={r.opportunityTypes} /></Section></div>}
        {r.careerOptions.length > 0 && <div className="card"><Section title="Related roles to consider"><BulletList items={r.careerOptions} /></Section></div>}
      </div>
      <section>
        <h2 className="h-card mb-3">Opportunities from our database</h2>
        {opportunities === null ? <p className="text-sm text-zinc-400">See <Link className="text-violet-300 underline" to="/opportunities">Explore</Link> for current matches.</p>
          : opportunities.length === 0 ? <EmptyState icon={Lightbulb} title="No matching opportunities yet" text="We'll show relevant ones here as more are added." />
          : <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{opportunities.map((o) => <Link key={o.id} to={`/opportunities?open=${o.id}`}><OpportunityCard o={o} onOpen={() => {}} /></Link>)}</div>}
      </section>
    </div>
  );
}

function GapAssistant({ defaults }: { defaults: { previousRole: string; desiredRole: string; breakMonths: string } }) {
  const toast = useToast();
  const [f, setF] = useState({ ...defaults, reason: '', tone: 'confident' });
  const [out, setOut] = useState<{ resumeLine: string; shortAnswer: string; fullAnswer: string; tips: string[] } | null>(null);
  const [busy, setBusy] = useState(false);
  async function go(e: FormEvent) {
    e.preventDefault(); setBusy(true);
    try { const { data } = await api.post('/career/gap-explanation', { ...f, reason: f.reason || undefined }); setOut(data); }
    catch (er) { toast.error(errMsg(er)); } finally { setBusy(false); }
  }
  const copy = (t: string) => navigator.clipboard?.writeText(t).then(() => toast.success('Copied.'), () => toast.error("Couldn't copy."));
  return (
    <div className="card mt-5">
      <h2 className="h-card flex items-center gap-2"><Sparkles className="h-4 w-4 text-violet-300" /> Career gap explanation assistant</h2>
      <p className="mt-1 text-sm text-zinc-400">A career break is a normal part of many careers. Get neutral, professional wording for your resume and interviews.</p>
      <form onSubmit={go} className="mt-4 grid gap-4 sm:grid-cols-3">
        <Field label="Reason (optional)">{(id) => <select id={id} className="input" value={f.reason} onChange={(e) => setF({ ...f, reason: e.target.value })}>{REASONS.map((r) => <option key={r} value={r}>{r || 'Prefer not to say'}</option>)}</select>}</Field>
        <Field label="Tone">{(id) => <select id={id} className="input" value={f.tone} onChange={(e) => setF({ ...f, tone: e.target.value })}><option value="confident">Confident</option><option value="warm">Warm</option><option value="concise">Concise</option></select>}</Field>
        <div className="flex items-end"><button className="btn-primary w-full" disabled={busy}>{busy && <Spinner />} Generate wording</button></div>
      </form>
      {out && <div className="mt-5 space-y-4">{([['Resume line', out.resumeLine], ['Short interview answer', out.shortAnswer], ['Full interview answer', out.fullAnswer]] as const).map(([t, v]) => (
        <div key={t} className="rounded-xl border border-white/10 p-4"><div className="mb-1 flex items-center justify-between"><p className="text-sm font-medium text-white">{t}</p><button className="btn-ghost btn-sm" onClick={() => copy(v)}><Copy className="h-3.5 w-3.5" /> Copy</button></div><p className="text-sm text-zinc-300">{v}</p></div>))}
        {out.tips.length > 0 && <BulletList items={out.tips} />}</div>}
    </div>
  );
}

export default function Work() {
  const { user } = useAuth();
  const toast = useToast();
  const { ask } = useAssistant();
  const [sp, setSp] = useSearchParams();
  const cp = user?.careerProfile ?? {};
  const [mode, setMode] = useState<'skillgap' | 'returntowork'>('skillgap');
  const [f, setF] = useState({ previousRole: cp.previousRole ?? '', desiredRole: cp.desiredCareer ?? '', yearsOfExperience: cp.yearsOfExperience?.toString() ?? '', skills: user?.skills ?? [], breakMonths: cp.careerBreakMonths?.toString() ?? '', breakReason: '', weeks: '6' });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [plan, setPlan] = useState<Plan<CareerResult> | null>(null);
  const [opps, setOpps] = useState<Opportunity[] | null>(null);
  const [del, setDel] = useState<PlanSummary | null>(null);
  const history = useApi<{ items: PlanSummary[] }>('/career/plans', { kind: undefined });
  const planId = sp.get('plan');

  useEffect(() => {
    if (!planId) return;
    api.get(`/career/plans/${planId}`).then(({ data }) => {
      if (data.plan.kind === 'business') return;
      setPlan(data.plan); setOpps(null); setMode(data.plan.kind); setF((s) => ({ ...s, ...Object.fromEntries(Object.entries(data.plan.input).filter(([k]) => k in s).map(([k, v]) => [k, Array.isArray(v) ? v : String(v ?? '')])) }));
    }).catch((e) => toast.error(errMsg(e)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planId]);

  async function analyze(e: FormEvent) {
    e.preventDefault();
    if (f.desiredRole.trim().length < 2) return setErr('Please enter the role you want to move toward.');
    setBusy(true); setErr(''); setPlan(null);
    try {
      const { data } = await api.post('/career/analyze', { ...f, mode, breakMonths: mode === 'returntowork' ? f.breakMonths : undefined, breakReason: f.breakReason || undefined, weeks: Number(f.weeks) });
      setPlan(data.plan); setOpps(data.opportunities); history.reload();
    } catch (e2) { setErr(errMsg(e2, "We couldn't analyze your skills right now. Please try again.")); }
    finally { setBusy(false); }
  }
  async function setChecked(c: string[]) {
    if (!plan) return;
    setPlan({ ...plan, checked: c });
    try { await api.patch(`/career/plans/${plan.id}/checked`, { checked: c }); } catch (e) { toast.error(errMsg(e)); }
  }
  async function savePlan() {
    if (!plan) return;
    try { await api.post('/saved', { itemType: 'careerPlan', itemId: plan.id }); toast.success('Plan saved.'); } catch (e) { toast.error(errMsg(e)); }
  }
  async function removePlan() {
    if (!del) return;
    try { await api.delete(`/career/plans/${del.id}`); if (plan?.id === del.id) setPlan(null); setDel(null); history.reload(); toast.success('Plan deleted.'); } catch (e) { toast.error(errMsg(e)); }
  }
  const f$ = (k: keyof typeof f, v: unknown) => setF((s) => ({ ...s, [k]: v }));

  return (
    <div>
      <PageHeader title="HerWork" subtitle="Find your skill gaps, build a learning roadmap, or plan your return to work." crumbs={['Career', 'HerWork']} />
      <div role="tablist" className="mb-5 inline-flex rounded-xl border border-white/10 p-1">
        {([['skillgap', 'Skill-gap analysis'], ['returntowork', 'Return to work']] as const).map(([v, l]) => (
          <button key={v} role="tab" aria-selected={mode === v} onClick={() => setMode(v)} className={cx('rounded-lg px-4 py-2 text-sm', mode === v ? 'bg-violet-500 text-white' : 'text-zinc-400 hover:text-white')}>{l}</button>))}
      </div>
      <form onSubmit={analyze} className="card space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={mode === 'returntowork' ? 'Previous profession' : 'Current or previous role'}>{(id) => <input id={id} className="input" placeholder="e.g. Software Developer" value={f.previousRole} onChange={(e) => f$('previousRole', e.target.value)} />}</Field>
          <Field label="Desired role">{(id) => <input id={id} className="input" placeholder="e.g. AI/ML Engineer" value={f.desiredRole} onChange={(e) => f$('desiredRole', e.target.value)} />}</Field>
          <Field label="Years of experience">{(id) => <input id={id} type="number" min={0} step="0.5" className="input" value={f.yearsOfExperience} onChange={(e) => f$('yearsOfExperience', e.target.value)} />}</Field>
          <Field label="Roadmap length">{(id) => <select id={id} className="input" value={f.weeks} onChange={(e) => f$('weeks', e.target.value)}>{[4, 6, 8, 12].map((w) => <option key={w} value={w}>{w} weeks</option>)}</select>}</Field>
          {mode === 'returntowork' && <>
            <Field label="Career break (months)">{(id) => <input id={id} type="number" min={0} className="input" value={f.breakMonths} onChange={(e) => f$('breakMonths', e.target.value)} />}</Field>
            <Field label="Reason (optional)">{(id) => <select id={id} className="input" value={f.breakReason} onChange={(e) => f$('breakReason', e.target.value)}>{REASONS.map((r) => <option key={r} value={r}>{r || 'Prefer not to say'}</option>)}</select>}</Field></>}
          <div className="sm:col-span-2"><Field label="Current skills" hint="Press Enter after each skill.">{(id) => <TagInput id={id} value={f.skills} onChange={(v) => f$('skills', v)} placeholder="e.g. Python, SQL, Django" />}</Field></div>
        </div>
        {err && <ErrorState message={err} />}
        <button className="btn-primary" disabled={busy}>{busy ? <Spinner /> : <Sparkles className="h-4 w-4" />} {mode === 'returntowork' ? 'Create return-to-work plan' : 'Analyze my skills'}</button>
      </form>

      {busy && <div className="mt-6 space-y-3"><Skeleton className="h-28" /><Skeleton className="h-48" /></div>}
      {mode === 'returntowork' && !busy && <GapAssistant defaults={{ previousRole: f.previousRole, desiredRole: f.desiredRole, breakMonths: f.breakMonths }} />}

      {plan && !busy && (
        <div className="mt-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-semibold text-white">{plan.title}</h2>
            <div className="flex gap-2"><button className="btn-ghost btn-sm" onClick={savePlan}><BookmarkPlus className="h-4 w-4" /> Save</button><button className="btn-ghost btn-sm" onClick={() => ask({ prompt: 'What should I learn first?', contextId: plan.id })}><MessageSquare className="h-4 w-4" /> What should I learn first?</button></div></div>
          <PlanView plan={plan} opportunities={opps} onChecked={setChecked} />
        </div>
      )}

      <section className="mt-10">
        <h2 className="h-card mb-3">Your previous plans</h2>
        {history.data && history.data.items.length === 0 && <p className="text-sm text-zinc-400">Plans you create will be listed here.</p>}
        <ul className="space-y-2">{history.data?.items.map((p) => (
          <li key={p.id} className="card flex flex-wrap items-center justify-between gap-2 py-3">
            <button className="text-left" onClick={() => { sp.set('plan', p.id); setSp(sp); window.scrollTo({ top: 0, behavior: 'smooth' }); }}><p className="text-sm font-medium text-white">{p.title}</p><p className="meta">{fmtDate(p.createdAt)}{p.readiness != null && ` · ${p.readiness}% readiness`}</p></button>
            <button className="btn-ghost btn-sm" aria-label="Delete plan" onClick={() => setDel(p)}><Trash2 className="h-4 w-4" /></button>
          </li>))}</ul>
      </section>
      <Disclaimer className="mt-8" />
      <ConfirmDialog open={!!del} danger title="Delete this plan?" message="This plan and your progress on it will be permanently deleted." confirmLabel="Delete" onCancel={() => setDel(null)} onConfirm={removePlan} />
    </div>
  );
}
