import { Sparkles } from 'lucide-react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Disclaimer } from '../components/ui';

export default function PublicLayout() {
  const { user } = useAuth();
  const link = 'text-sm text-zinc-400 transition hover:text-white';
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-30 border-b border-white/5 bg-ink-950/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5 sm:px-6">
          <Link to="/" className="flex items-center gap-2.5 text-lg font-semibold text-white">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-violet-500 shadow-glow"><Sparkles className="h-4 w-4" /></span>HerGuide
          </Link>
          <nav aria-label="Primary" className="hidden items-center gap-7 md:flex">
            <NavLink to="/about" className={link}>About</NavLink>
            <NavLink to="/how-it-works" className={link}>How it works</NavLink>
            <NavLink to="/resources" className={link}>Resources</NavLink>
          </nav>
          <div className="flex items-center gap-2">
            {user ? <Link to="/dashboard" className="btn-primary btn-sm">Dashboard</Link> : (
              <><Link to="/login" className="btn-ghost btn-sm">Log in</Link><Link to="/register" className="btn-primary btn-sm">Get started</Link></>
            )}
          </div>
        </div>
      </header>
      <main className="flex-1"><Outlet /></main>
      <footer className="border-t border-white/5 py-10">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <p className="flex items-center gap-2 font-semibold text-white"><Sparkles className="h-4 w-4 text-violet-300" /> HerGuide</p>
            <nav aria-label="Footer" className="flex flex-wrap gap-x-6 gap-y-2">
              {[['About', '/about'], ['Privacy', '/privacy'], ['Terms', '/terms'], ['Contact', '/contact'], ['Disclaimer', '/disclaimer']].map(([t, to]) => <Link key={to} to={to} className={link}>{t}</Link>)}
            </nav>
          </div>
          <Disclaimer className="mt-6" />
          <p className="meta mt-4">Built around UN Sustainable Development Goal 5: Gender Equality.</p>
        </div>
      </footer>
    </div>
  );
}
