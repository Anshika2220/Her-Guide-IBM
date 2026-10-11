import { ArrowRight, Bookmark, Briefcase, Compass, FileText, KanbanSquare, LifeBuoy, RefreshCw, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { EmptyState, ErrorState, MatchBadge, ProgressBar, Skeleton, Spinner } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useApi } from '../hooks/useApi';
import { api, errMsg } from '../services/api';
import type { MatchSummary, Opportunity, SavedItem } from '../types';
import { OPP_CATEGORIES, STATUSES } from '../utils/constants';
import { ago, greeting } from '../utils/format';

interface Dash {
  profileCompleteness: number; onboardingComplete: boolean; recommended: Opportunity[];
  careerReadiness: { value: number | null; title: string; id: string } | null;
  stats: { applications: number; saved: number }; statusCounts: Record<string, number>;
  recentSaved: SavedItem[]; recentActivity: { type: string; title: string; at: string; link: string }[];
  aiRecommendations: { items: { title: string; detail: string; path: string }[]; generatedAt: string } | null;
}
const actions = [
  { to: '/support', icon: LifeBuoy, t: 'Get Support', d: 'Describe a situation' },
  { to: '/opportunities', icon: Compass, t: 'Find Opportunities', d: 'Matched to you' },
  { to: '/work', icon: Briefcase, t: 'Career Analysis', d: 'Skills & roadmap' },
  { to: '/documents', icon: FileText, t: 'Analyze Document', d: 'Eligibility & dates' },
];

export default function Dashboard() {
  const { user } = useAuth();
  const toast = useToast();
  const { data, loading, error, reload, setData } = useApi<Dash>('/dashboard');
  const [genBusy, setGenBusy] = useState(false);

  async function generate() {
    setGenBusy(true);
    try { const { data: rec } = await api.post('/ai/recommendations'); setData((d) => (d ? { ...d, aiRecommendations: rec } : d)); }
    catch (e) { toast.error(errMsg(e, "We couldn't generate recommendations right now.")); }
    finally { setGenBusy(false); }
  }

  const first = user?.name.split(' ')[0] ?? '';
  const chart = STATUSES.map((s) => ({ name: s.label, value: data?.statusCounts[s.value] ?? 0 }));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="h-page">{greeting()}, {first}</h1>
        <p className="mt-1 text-zinc-400">What would you like help with today?</p>
      </div>

      {data && !data.onboardingComplete && (
        <div className="card flex flex-wrap items-center justify-between gap-3 border-violet-400/30 bg-violet-400/[0.06]">
          <p className="text-sm text-zinc-200">Finish your profile ({data.profileCompleteness}% complete) to unlock personalised matches.</p>
          <Link to="/onboarding" className="btn-primary btn-sm">Complete profile</Link>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {actions.map((a) => (
          <Link key={a.to} to={a.to} className="card card-hover group">
            <a.icon className="h-5 w-5 text-violet-300" />
            <p className="mt-3 font-medium text-white">{a.t}</p>
            <p className="meta flex items-center gap-1">{a.d}<ArrowRight className="h-3 w-3 opacity-0 transition group-hover:opacity-100" /></p>
          </Link>
        ))}
      </div>

      {error && <ErrorState message={error} onRetry={reload} />}
      {loading && !data && <div className="grid gap-4 md:grid-cols-3"><Skeleton className="h-40" /><Skeleton className="h-40" /><Skeleton className="h-40" /></div>}

      {data && (<>
        <section>
          <div className="mb-3 flex items-center justify-between"><h2 className="h-card">Recommended for you</h2><Link to="/opportunities" className="text-sm text-violet-300 hover:underline">See all</Link></div>
          {data.recommended.length === 0 ? (
            <EmptyState icon={Compass} title="Start exploring opportunities to build your personalized dashboard." text="Add your education, skills and goals to your profile and your best matches will appear here." action={<Link to="/profile" className="btn-primary btn-sm">Update profile</Link>} />
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {data.recommended.map((o) => (
                <Link key={o.id} to={`/opportunities?open=${o.id}`} className="card card-hover">
                  <div className="flex items-start justify-between gap-2"><span className="badge">{OPP_CATEGORIES[o.category]}</span><MatchBadge match={o.match as MatchSummary} /></div>
                  <p className="mt-3 line-clamp-2 font-medium text-white">{o.title}</p>
                  <p className="text-sm text-zinc-400">{o.organization}</p>
                  <p className="meta mt-2">Potentially relevant based on the information provided</p>
                </Link>
              ))}
            </div>
          )}
        </section>

        <div className="grid gap-4 lg:grid-cols-3">
          <section className="card lg:col-span-2">
            <h2 className="h-card mb-4">Your progress</h2>
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <div className="mb-1.5 flex justify-between text-sm"><span>Career readiness</span><span className="text-white">{data.careerReadiness?.value != null ? `${data.careerReadiness.value}%` : '—'}</span></div>
                <ProgressBar value={data.careerReadiness?.value ?? 0} label="Career readiness" />
                {data.careerReadiness?.value == null && <p className="meta mt-2">Run a <Link className="underline" to="/work">career analysis</Link> to see this.</p>}
                {data.careerReadiness?.value != null && <p className="meta mt-2">From your latest skill analysis: {data.careerReadiness.title}</p>}
              </div>
              <div>
                <div className="mb-1.5 flex justify-between text-sm"><span>Profile completeness</span><span className="text-white">{data.profileCompleteness}%</span></div>
                <ProgressBar value={data.profileCompleteness} label="Profile completeness" />
              </div>
              <Link to="/tracker" className="rounded-xl bg-white/[0.04] p-4 transition hover:bg-white/[0.07]"><p className="text-2xl font-semibold text-white">{data.stats.applications}</p><p className="meta">Applications tracked</p></Link>
              <Link to="/saved" className="rounded-xl bg-white/[0.04] p-4 transition hover:bg-white/[0.07]"><p className="text-2xl font-semibold text-white">{data.stats.saved}</p><p className="meta">Saved items</p></Link>
            </div>
          </section>

          <section className="card">
            <h2 className="h-card mb-3">Continue where you left off</h2>
            {data.recentActivity.length === 0 ? <p className="text-sm text-zinc-400">Your recent activity will show up here.</p> : (
              <ul className="space-y-3">{data.recentActivity.map((a) => (
                <li key={a.link + a.at}><Link to={a.link} className="block rounded-lg p-2 hover:bg-white/5"><p className="line-clamp-1 text-sm text-white">{a.title}</p><p className="meta capitalize">{a.type} · {ago(a.at)}</p></Link></li>
              ))}</ul>
            )}
          </section>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <section className="card">
            <div className="mb-3 flex items-center justify-between"><h2 className="h-card">Application tracker</h2><Link to="/tracker" className="text-sm text-violet-300 hover:underline">Open</Link></div>
            {data.stats.applications === 0 ? <EmptyState icon={KanbanSquare} title="Nothing tracked yet" text="Add an opportunity to your tracker to follow its progress." /> : (
              <div className="h-56" role="img" aria-label="Applications by status">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chart} margin={{ left: -20, top: 5 }}>
                    <XAxis dataKey="name" tick={{ fill: '#a1a1aa', fontSize: 11 }} axisLine={false} tickLine={false} interval={0} angle={-25} textAnchor="end" height={55} />
                    <YAxis allowDecimals={false} tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip cursor={{ fill: 'rgba(255,255,255,.04)' }} contentStyle={{ background: '#13131c', border: '1px solid rgba(255,255,255,.1)', borderRadius: 12, fontSize: 12 }} />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]}>{chart.map((_, i) => <Cell key={i} fill={i % 2 ? '#c4b5fd' : '#8b5cf6'} />)}</Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </section>

          <section className="card">
            <div className="mb-3 flex items-center justify-between"><h2 className="h-card">Saved resources</h2><Link to="/saved" className="text-sm text-violet-300 hover:underline">View all</Link></div>
            {data.recentSaved.length === 0 ? <EmptyState icon={Bookmark} title="No saved items yet" text="Save opportunities, resources and plans to find them here." /> : (
              <ul className="divide-y divide-white/5">{data.recentSaved.map((s) => (
                <li key={s.id} className="py-2.5">{s.link ? <Link to={s.link} className="text-sm text-white hover:text-violet-200">{s.title}</Link> : <span className="text-sm text-white">{s.title}</span>}<p className="meta">{s.subtitle}</p></li>
              ))}</ul>
            )}
          </section>
        </div>

        <section className="card">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="h-card flex items-center gap-2"><Sparkles className="h-4 w-4 text-violet-300" /> Personalised recommendations</h2>
            <button className="btn-ghost btn-sm" onClick={generate} disabled={genBusy}>{genBusy ? <Spinner /> : <RefreshCw className="h-3.5 w-3.5" />}{data.aiRecommendations ? 'Refresh' : 'Generate'}</button>
          </div>
          {!data.aiRecommendations ? <p className="text-sm text-zinc-400">Generate AI suggestions based on your profile, matches and progress.</p> : (
            <div className="grid gap-3 md:grid-cols-2">
              {data.aiRecommendations.items.map((r, i) => (
                <Link key={i} to={r.path} className="rounded-xl border border-white/10 p-4 transition hover:border-violet-400/30"><p className="font-medium text-white">{r.title}</p><p className="mt-1 text-sm text-zinc-400">{r.detail}</p></Link>
              ))}
            </div>
          )}
          <p className="meta mt-3">AI-generated suggestions. They are based only on your profile and the platform's data.</p>
        </section>
      </>)}
    </div>
  );
}
