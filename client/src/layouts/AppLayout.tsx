import {
  Bookmark, Briefcase, Compass, FileText, KanbanSquare, LayoutDashboard, LifeBuoy, LogOut, Menu, Rocket,
  Settings, ShieldCheck, Sparkles, User as UserIcon, X, MoreHorizontal,
} from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import AssistantPanel from '../components/AssistantPanel';
import { cx } from '../components/ui';
import { AssistantAsk, AssistantCtx } from '../context/AssistantContext';
import { useAuth } from '../context/AuthContext';

const groups = [
  { label: '', items: [{ to: '/dashboard', icon: LayoutDashboard, text: 'Dashboard' }] },
  { label: 'Support', items: [{ to: '/support', icon: LifeBuoy, text: 'HerGuide' }] },
  { label: 'Career', items: [{ to: '/work', icon: Briefcase, text: 'HerWork' }] },
  { label: 'Opportunities', items: [{ to: '/opportunities', icon: Compass, text: 'Explore' }, { to: '/saved', icon: Bookmark, text: 'Saved' }] },
  { label: 'Business', items: [{ to: '/biz', icon: Rocket, text: 'HerBiz' }] },
  { label: 'Tools', items: [{ to: '/documents', icon: FileText, text: 'Document Assistant' }, { to: '/tracker', icon: KanbanSquare, text: 'Application Tracker' }] },
];
const PAGE_KEY: [string, string][] = [['/opportunities', 'opportunities'], ['/work', 'work'], ['/support', 'support'], ['/biz', 'biz'], ['/documents', 'documents'], ['/tracker', 'tracker'], ['/dashboard', 'dashboard']];

const linkCls = ({ isActive }: { isActive: boolean }) =>
  cx('flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition', isActive ? 'bg-violet-400/15 text-white' : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-100');

export default function AppLayout() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const [drawer, setDrawer] = useState(false);
  const [asst, setAsst] = useState(false);
  const [seed, setSeed] = useState<{ prompt?: string; contextId?: string; context?: string; n: number }>({ n: 0 });
  const page = PAGE_KEY.find(([p]) => loc.pathname.startsWith(p))?.[1] ?? 'other';
  const ask = useCallback((a?: AssistantAsk) => { setSeed((s) => ({ ...a, n: s.n + 1 })); setAsst(true); }, []);
  const ctx = useMemo(() => ({ ask }), [ask]);

  const Nav = ({ onNavigate }: { onNavigate?: () => void }) => (
    <nav aria-label="Main" className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
      {groups.map((g) => (
        <div key={g.label || 'top'}>
          {g.label && <p className="meta mb-1.5 px-3 uppercase tracking-wider">{g.label}</p>}
          {g.items.map((i) => <NavLink key={i.to} to={i.to} className={linkCls} onClick={onNavigate}><i.icon className="h-4 w-4" />{i.text}</NavLink>)}
        </div>
      ))}
      {user?.role === 'admin' && <NavLink to="/admin" className={linkCls} onClick={onNavigate}><ShieldCheck className="h-4 w-4" />Admin</NavLink>}
      <div className="space-y-0.5 border-t border-white/10 pt-4">
        <NavLink to="/profile" className={linkCls} onClick={onNavigate}><UserIcon className="h-4 w-4" />Profile</NavLink>
        <NavLink to="/settings" className={linkCls} onClick={onNavigate}><Settings className="h-4 w-4" />Settings</NavLink>
        <button className={cx(linkCls({ isActive: false }), 'w-full')} onClick={async () => { await logout(); nav('/'); }}><LogOut className="h-4 w-4" />Logout</button>
      </div>
    </nav>
  );
  const Logo = () => (
    <Link to="/dashboard" className="flex items-center gap-2.5 px-5 py-5 text-lg font-semibold text-white">
      <span className="grid h-8 w-8 place-items-center rounded-xl bg-violet-500 shadow-glow"><Sparkles className="h-4 w-4" /></span>HerGuide
    </Link>
  );
  const bottom = [{ to: '/dashboard', icon: LayoutDashboard, t: 'Home' }, { to: '/support', icon: LifeBuoy, t: 'Support' }, { to: '/opportunities', icon: Compass, t: 'Explore' }, { to: '/work', icon: Briefcase, t: 'Work' }];

  return (
    <AssistantCtx.Provider value={ctx}>
      <div className="min-h-screen lg:grid lg:grid-cols-[260px_1fr]">
        <aside className="sticky top-0 hidden h-screen flex-col border-r border-white/10 bg-ink-950/80 backdrop-blur lg:flex"><Logo /><Nav /></aside>

        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-white/10 bg-ink-950/90 px-4 py-3 backdrop-blur lg:hidden">
          <Link to="/dashboard" className="flex items-center gap-2 font-semibold text-white"><span className="grid h-7 w-7 place-items-center rounded-lg bg-violet-500"><Sparkles className="h-3.5 w-3.5" /></span>HerGuide</Link>
          <div className="flex items-center gap-1">
            <button aria-label="Open assistant" className="rounded-lg p-2 text-violet-300 hover:bg-white/5" onClick={() => ask()}><Sparkles className="h-5 w-5" /></button>
            <button aria-label="Open menu" className="rounded-lg p-2 text-zinc-300 hover:bg-white/5" onClick={() => setDrawer(true)}><Menu className="h-5 w-5" /></button>
          </div>
        </header>

        {drawer && (
          <div className="fixed inset-0 z-50 lg:hidden" onMouseDown={(e) => e.target === e.currentTarget && setDrawer(false)}>
            <div className="absolute inset-0 bg-black/60" />
            <div className="relative flex h-full w-72 flex-col border-r border-white/10 bg-ink-900">
              <button aria-label="Close menu" className="absolute right-3 top-4 rounded-lg p-1.5 text-zinc-400" onClick={() => setDrawer(false)}><X className="h-5 w-5" /></button>
              <Logo /><Nav onNavigate={() => setDrawer(false)} />
            </div>
          </div>
        )}

        <main className="mx-auto w-full max-w-6xl px-4 pb-28 pt-6 sm:px-6 lg:px-10 lg:pb-12 lg:pt-10"><Outlet /></main>

        <button onClick={() => ask()} className="btn-primary fixed bottom-24 right-4 z-30 hidden rounded-full px-4 shadow-glow sm:inline-flex lg:bottom-6 lg:right-6" aria-label="Open assistant">
          <Sparkles className="h-4 w-4" /> Ask HerGuide
        </button>

        <nav aria-label="Mobile" className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-white/10 bg-ink-950/95 px-2 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
          {bottom.map((b) => (
            <NavLink key={b.to} to={b.to} className={({ isActive }) => cx('flex flex-col items-center gap-0.5 py-2.5 text-[11px]', isActive ? 'text-violet-300' : 'text-zinc-500')}>
              <b.icon className="h-5 w-5" />{b.t}
            </NavLink>
          ))}
          <button onClick={() => setDrawer(true)} className="flex flex-col items-center gap-0.5 py-2.5 text-[11px] text-zinc-500"><MoreHorizontal className="h-5 w-5" />More</button>
        </nav>

        <AssistantPanel open={asst} onClose={() => setAsst(false)} page={page} seed={seed} />
      </div>
    </AssistantCtx.Provider>
  );
}
