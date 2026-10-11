import { AlertTriangle, ExternalLink, Info, Loader2, LucideIcon, X } from 'lucide-react';
import { AnchorHTMLAttributes, KeyboardEvent, ReactNode, useEffect, useId, useRef, useState } from 'react';
import { DISCLAIMER } from '../utils/constants';
import { isHttp } from '../utils/format';
import type { MatchSummary } from '../types';

export const cx = (...a: (string | false | null | undefined)[]) => a.filter(Boolean).join(' ');

export const Spinner = ({ className = 'h-4 w-4' }: { className?: string }) => <Loader2 className={cx('animate-spin', className)} aria-label="Loading" />;
export const Skeleton = ({ className = 'h-24' }: { className?: string }) => <div className={cx('skeleton', className)} aria-hidden />;

export function EmptyState({ icon: Icon = Info, title, text, action }: { icon?: LucideIcon; title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-white/10 px-6 py-12 text-center">
      <div className="mb-3 rounded-xl bg-violet-400/10 p-3 text-violet-300"><Icon className="h-5 w-5" /></div>
      <p className="font-medium text-white">{title}</p>
      {text && <p className="mt-1 max-w-sm text-sm text-zinc-400">{text}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex items-center gap-3 rounded-xl border border-rose-400/20 bg-rose-500/5 p-4 text-sm text-rose-200">
      <AlertTriangle className="h-4 w-4 shrink-0" />
      <span className="flex-1">{message}</span>
      {onRetry && <button className="btn-ghost btn-sm" onClick={onRetry}>Try again</button>}
    </div>
  );
}

export function PageHeader({ title, subtitle, actions, crumbs }: { title: string; subtitle?: string; actions?: ReactNode; crumbs?: string[] }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        {crumbs && <p className="meta mb-1">{crumbs.join(' / ')}</p>}
        <h1 className="h-page">{title}</h1>
        {subtitle && <p className="mt-1 max-w-2xl text-sm text-zinc-400">{subtitle}</p>}
      </div>
      {actions}
    </div>
  );
}

export function Field({ label, hint, error, children }: { label: string; hint?: string; error?: string; children: (id: string) => ReactNode }) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="label">{label}</label>
      {children(id)}
      {hint && !error && <p className="meta mt-1">{hint}</p>}
      {error && <p role="alert" className="mt-1 text-xs text-rose-300">{error}</p>}
    </div>
  );
}

export function TagInput({ id, value, onChange, placeholder, suggestions = [] }: { id?: string; value: string[]; onChange: (v: string[]) => void; placeholder?: string; suggestions?: string[] }) {
  const [text, setText] = useState('');
  const add = (t: string) => {
    const v = t.trim();
    if (v && !value.some((x) => x.toLowerCase() === v.toLowerCase()) && value.length < 50) onChange([...value, v.slice(0, 60)]);
    setText('');
  };
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add(text); }
    else if (e.key === 'Backspace' && !text && value.length) onChange(value.slice(0, -1));
  };
  const open = suggestions.filter((s) => !value.includes(s)).slice(0, 6);
  return (
    <div>
      <div className="flex flex-wrap gap-1.5 rounded-xl border border-white/10 bg-ink-900 p-2 focus-within:border-violet-400/60">
        {value.map((t) => (
          <span key={t} className="badge border-violet-400/20 bg-violet-400/10 text-violet-200">
            {t}
            <button type="button" aria-label={`Remove ${t}`} onClick={() => onChange(value.filter((x) => x !== t))}><X className="h-3 w-3" /></button>
          </span>
        ))}
        <input id={id} className="min-w-[8rem] flex-1 bg-transparent px-1.5 py-1 text-sm text-zinc-100 outline-none placeholder:text-zinc-500"
          value={text} onChange={(e) => setText(e.target.value)} onKeyDown={onKey} onBlur={() => add(text)} placeholder={value.length ? '' : placeholder} />
      </div>
      {open.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {open.map((s) => <button type="button" key={s} onClick={() => add(s)} className="badge hover:bg-white/10">+ {s}</button>)}
        </div>
      )}
    </div>
  );
}

export function ChipSelect({ options, value, onChange, multi = true, label }: { options: string[]; value: string[]; onChange: (v: string[]) => void; multi?: boolean; label: string }) {
  const toggle = (o: string) => onChange(multi ? (value.includes(o) ? value.filter((x) => x !== o) : [...value, o]) : [o]);
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-2">
      {options.map((o) => {
        const on = value.includes(o);
        return (
          <button type="button" key={o} aria-pressed={on} onClick={() => toggle(o)}
            className={cx('rounded-full border px-3.5 py-1.5 text-sm transition', on ? 'border-violet-400/60 bg-violet-400/15 text-violet-100' : 'border-white/10 text-zinc-400 hover:bg-white/5')}>
            {o}
          </button>
        );
      })}
    </div>
  );
}

export const Disclaimer = ({ className }: { className?: string }) => (
  <p className={cx('flex items-start gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-xs text-zinc-400', className)}>
    <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-violet-300" /> {DISCLAIMER}
  </p>
);

export function Modal({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    const onKey = (e: globalThis.KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; prev?.focus(); };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-label={title}
        className={cx('max-h-[92vh] w-full overflow-y-auto rounded-t-3xl border border-white/10 bg-ink-900 p-5 shadow-2xl outline-none sm:rounded-2xl sm:p-6', wide ? 'sm:max-w-3xl' : 'sm:max-w-lg')}>
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 className="text-lg font-semibold text-white">{title}</h2>
          <button aria-label="Close" onClick={onClose} className="rounded-lg p-1 text-zinc-400 hover:bg-white/5 hover:text-white"><X className="h-5 w-5" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function ConfirmDialog({ open, title, message, confirmLabel = 'Confirm', danger, busy, onConfirm, onCancel, children }: {
  open: boolean; title: string; message: string; confirmLabel?: string; danger?: boolean; busy?: boolean;
  onConfirm: () => void; onCancel: () => void; children?: ReactNode;
}) {
  return (
    <Modal open={open} onClose={onCancel} title={title}>
      <p className="text-sm text-zinc-400">{message}</p>
      {children}
      <div className="mt-6 flex justify-end gap-2">
        <button className="btn-ghost" onClick={onCancel}>Cancel</button>
        <button className={danger ? 'btn-danger' : 'btn-primary'} onClick={onConfirm} disabled={busy}>{busy && <Spinner />} {confirmLabel}</button>
      </div>
    </Modal>
  );
}

export function ProgressBar({ value, label }: { value: number; label?: string }) {
  return (
    <div role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100} aria-label={label}
      className="h-2.5 w-full overflow-hidden rounded-full bg-white/10">
      <div className="h-full rounded-full bg-gradient-to-r from-violet-400 to-pink-300 transition-all duration-700" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}

export function MatchBadge({ match }: { match?: MatchSummary }) {
  if (!match) return null;
  const tone = match.score >= 80 ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300'
    : match.score >= 60 ? 'border-violet-400/30 bg-violet-400/10 text-violet-200'
    : match.score >= 40 ? 'border-amber-400/30 bg-amber-400/10 text-amber-200'
    : 'border-white/10 bg-white/5 text-zinc-400';
  return (
    <span className={cx('inline-flex flex-col items-end rounded-xl border px-2.5 py-1 text-right leading-tight', tone)}
      title={`Based on the information in your profile. Confidence: ${match.confidence}.`}>
      <span className="text-sm font-semibold">{match.score}% match</span>
      <span className="text-[10px] opacity-80">{match.confidence === 'high' ? 'Good data' : match.confidence === 'medium' ? 'Some data missing' : 'Limited data'}</span>
    </span>
  );
}

export function ExtLink({ href, children, className, ...rest }: { href?: string | null } & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'>) {
  if (!isHttp(href)) return null;
  return (
    <a href={href!} target="_blank" rel="noopener noreferrer" className={cx('inline-flex items-center gap-1.5', className)} {...rest}>
      {children} <ExternalLink className="h-3.5 w-3.5" />
    </a>
  );
}

export const Section = ({ title, children, className }: { title: string; children: ReactNode; className?: string }) => (
  <section className={className}>
    <h3 className="mb-2 text-sm font-semibold text-white">{title}</h3>
    {children}
  </section>
);

export const BulletList = ({ items }: { items: string[] }) => (
  <ul className="space-y-1.5 text-sm text-zinc-300">
    {items.map((t, i) => <li key={i} className="flex gap-2"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-violet-400" />{t}</li>)}
  </ul>
);
